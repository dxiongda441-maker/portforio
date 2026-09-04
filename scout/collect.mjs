#!/usr/bin/env node
/**
 * Scout — 業界・競合・トレンド情報を集めて「自分の関心プロファイル」で選別する。
 *
 * 使い方:
 *   node scout/collect.mjs
 *
 * ANTHROPIC_API_KEY があればClaudeが採点する。無ければキーワード一致で採点する
 * （精度は落ちるが、キー無しでも必ず動く）。SCOUT_NO_LLM=1 で強制的に後者にできる。
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..");
const SOURCES_PATH = path.join(HERE, "config", "sources.json");
const PROFILE_PATH = path.join(HERE, "config", "profile.md");
const OUTPUT_PATH = path.join(ROOT, "projects", "scout", "data", "digest.json");

const MODEL = "claude-opus-5";
const BATCH_SIZE = 20;
const USER_AGENT = "Scout/0.1 (personal digest bot)";

// ---------------------------------------------------------------- フィード取得

function decodeEntities(text) {
  return text
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(Number(dec)))
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&");
}

/**
 * フィード本文をプレーンテキストにする。順序が重要で、CDATAを外す → タグを消す →
 * 実体参照を戻す、の順にしないと `&lt;完全版&gt;` のような本文中の山かっこが
 * タグと誤認されて丸ごと消える。
 */
const HTML_TAG = /<\/?(?:p|br|hr|div|span|a|b|i|em|strong|small|ul|ol|li|dl|dt|dd|img|h[1-6]|blockquote|figure|figcaption|table|thead|tbody|tr|td|th|pre|code|iframe|script|style)\b[^>]*>/gi;

function toPlainText(raw) {
  const unwrapped = raw.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1");
  const decoded = decodeEntities(unwrapped.replace(/<[^>]+>/g, " "));
  // type="html" のフィードはHTMLを実体参照で包むので、復元後にもう一度だけ落とす。
  // ここは既知のHTMLタグ名だけを対象にして、本文中の <完全版> のような語を守る。
  return decoded.replace(HTML_TAG, " ").replace(/\s+/g, " ").trim();
}

/** ブロックから最初に見つかったタグの中身をプレーンテキストで返す。 */
function tagText(block, names) {
  for (const name of names) {
    const match = block.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, "i"));
    if (!match) continue;
    const text = toPlainText(match[1]);
    if (text) return text;
  }
  return "";
}

/** タグの中身がURLならそれを返す。CDATAで包まれたリンクにも対応する。 */
function tagUrl(block, name) {
  const match = block.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, "i"));
  if (!match) return "";
  const inner = match[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").trim();
  return /^https?:\/\//i.test(inner) ? decodeEntities(inner) : "";
}

/** RSSの <link>URL</link> とAtomの <link href="..."/> の両方に対応する。 */
function extractLink(block) {
  const rss = tagUrl(block, "link");
  if (rss) return rss;

  const alternate =
    block.match(/<link\b[^>]*rel=["']alternate["'][^>]*href=["']([^"']+)["']/i) ||
    block.match(/<link\b[^>]*href=["']([^"']+)["']/i);
  if (alternate) return decodeEntities(alternate[1]).trim();

  return tagUrl(block, "guid");
}

function parseFeed(xml, sourceName) {
  const blocks = [...xml.matchAll(/<(item|entry)\b[\s\S]*?<\/\1>/gi)].map((m) => m[0]);

  return blocks
    .map((block) => {
      const publishedRaw = tagText(block, ["pubDate", "published", "updated", "dc:date", "date"]);
      const published = publishedRaw ? new Date(publishedRaw) : null;
      const summary = tagText(block, ["description", "summary", "content:encoded", "content"]);

      return {
        title: tagText(block, ["title"]),
        url: extractLink(block),
        source: sourceName,
        publishedAt: published && !Number.isNaN(published.getTime()) ? published.toISOString() : null,
        summary: summary.slice(0, 400),
      };
    })
    .filter((item) => item.title && item.url);
}

async function fetchSource(source) {
  try {
    const response = await fetch(source.url, {
      headers: { "user-agent": USER_AGENT, accept: "application/rss+xml, application/atom+xml, application/xml, text/xml, */*" },
      signal: AbortSignal.timeout(20000),
    });
    if (!response.ok) {
      console.warn(`  ! ${source.name}: HTTP ${response.status}`);
      return [];
    }
    const items = parseFeed(await response.text(), source.name);
    console.log(`  - ${source.name}: ${items.length}件`);
    return items;
  } catch (error) {
    console.warn(`  ! ${source.name}: ${error.message}`);
    return [];
  }
}

// ------------------------------------------------------------------ 採点(LLM)

const SYSTEM_PROMPT = `あなたは、ある個人発信者のためのリサーチ・アシスタントです。
渡された記事を「関心プロファイル」との関連度だけで採点します。

採点の原則:
- 一般的なニュース価値ではなく、このプロファイルの人にとっての価値だけで判断する
- プロファイルの「興味がないもの」に当てはまる記事は20点以下にする
- 具体的な手法・数字・事例がある記事を高く、抽象論を低く評価する
- 迷ったら低い点をつける。上位に残る記事は少ないほど良い

各記事について次を返す:
- id: 渡された番号をそのまま返す
- score: 0-100の整数
- why: なぜこの人に関係があるかを日本語1文40字以内。記事の要約ではなく「この人にとっての意味」を書く
- angle: この人が発信するならどの切り口かを日本語1文40字以内。発信に向かない記事は「-」
- tags: 日本語または英語のタグを1〜3個`;

const SCORE_SCHEMA = {
  type: "object",
  properties: {
    results: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "integer" },
          score: { type: "integer" },
          why: { type: "string" },
          angle: { type: "string" },
          tags: { type: "array", items: { type: "string" } },
        },
        required: ["id", "score", "why", "angle", "tags"],
        additionalProperties: false,
      },
    },
  },
  required: ["results"],
  additionalProperties: false,
};

function renderBatch(batch, offset) {
  return batch
    .map((item, index) => {
      const lines = [`[${offset + index}] ${item.title} — ${item.source}`];
      if (item.summary) lines.push(`概要: ${item.summary.slice(0, 220)}`);
      return lines.join("\n");
    })
    .join("\n\n");
}

/**
 * Claudeで採点する。1バッチ落ちても他は諦めないので、返ってくるMapは歯抜けになりうる。
 * 埋まらなかった分は呼び出し側がキーワード採点で補う。
 */
async function scoreWithClaude(items, profile) {
  const scores = new Map();
  let client;

  try {
    const { default: Anthropic } = await import("@anthropic-ai/sdk");
    client = new Anthropic();
  } catch (error) {
    console.warn(`Anthropic SDKを読み込めませんでした（scout/ で npm install してください）: ${error.message}`);
    return scores;
  }

  for (let offset = 0; offset < items.length; offset += BATCH_SIZE) {
    const batch = items.slice(offset, offset + BATCH_SIZE);
    console.log(`  採点中 ${offset + 1}〜${offset + batch.length} / ${items.length}`);

    try {
      const response = await client.beta.messages.create({
        model: MODEL,
        max_tokens: 8000,
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
        system: SYSTEM_PROMPT,
        output_config: {
          effort: "low",
          format: { type: "json_schema", schema: SCORE_SCHEMA },
        },
        messages: [
          {
            role: "user",
            content: `# 関心プロファイル\n\n${profile}\n\n# 採点する記事\n\n${renderBatch(batch, offset)}`,
          },
        ],
      });

      if (response.stop_reason === "refusal") {
        console.warn(`  ! このバッチは採点を拒否されました (${response.stop_details?.category ?? "理由不明"})`);
        continue;
      }

      const text = response.content.find((block) => block.type === "text")?.text ?? "";
      for (const result of JSON.parse(text).results ?? []) {
        scores.set(result.id, result);
      }
    } catch (error) {
      console.warn(`  ! このバッチの採点に失敗しました: ${error.message}`);
    }
  }

  return scores;
}

// -------------------------------------------------------- 採点(キーワード予備)

/** プロファイルの箇条書きから、正のキーワードと負のキーワードを取り出す。 */
function extractKeywords(profile) {
  const positive = [];
  const negative = [];
  let inNegativeSection = false;

  for (const line of profile.split("\n")) {
    const heading = line.match(/^#{1,6}\s*(.+)$/);
    if (heading) {
      inNegativeSection = /興味がない|除外|不要/.test(heading[1]);
      continue;
    }
    const bullet = line.match(/^\s*[-*]\s+(.+)$/);
    if (!bullet) continue;
    const words = bullet[1]
      .split(/[、。,.:：/（）()「」\s]+/)
      .map((word) => word.trim())
      .filter((word) => word.length >= 2);
    (inNegativeSection ? negative : positive).push(...words);
  }

  return { positive: [...new Set(positive)], negative: [...new Set(negative)] };
}

function scoreWithKeywords(items, profile) {
  const { positive, negative } = extractKeywords(profile);
  const scores = new Map();

  items.forEach((item, id) => {
    const haystack = `${item.title} ${item.summary}`.toLowerCase();
    const hits = positive.filter((word) => haystack.includes(word.toLowerCase()));
    const misses = negative.filter((word) => haystack.includes(word.toLowerCase()));
    const score = Math.max(0, Math.min(100, hits.length * 22 - misses.length * 30));

    scores.set(id, {
      id,
      score,
      why: hits.length ? `キーワード一致: ${hits.slice(0, 3).join("、")}` : "プロファイルとの一致なし",
      angle: "-",
      tags: hits.slice(0, 3),
    });
  });

  return scores;
}

// ---------------------------------------------------------------------- 本体

async function main() {
  const config = JSON.parse(fs.readFileSync(SOURCES_PATH, "utf8"));
  const profile = fs.readFileSync(PROFILE_PATH, "utf8");

  console.log(`情報源 ${config.sources.length}件を取得します`);
  const collected = (await Promise.all(config.sources.map(fetchSource))).flat();

  const cutoff = Date.now() - (config.windowHours ?? 48) * 3600 * 1000;
  const seen = new Set();
  const items = collected
    .filter((item) => {
      if (seen.has(item.url)) return false;
      seen.add(item.url);
      // 日付を出さないフィードもあるので、不明なものは残す
      return !item.publishedAt || new Date(item.publishedAt).getTime() >= cutoff;
    })
    .sort((a, b) => new Date(b.publishedAt ?? 0) - new Date(a.publishedAt ?? 0))
    .slice(0, config.maxItems ?? 120);

  console.log(`重複と期間で絞り込み: ${collected.length}件 → ${items.length}件`);

  if (items.length === 0) {
    console.warn("記事が0件でした。sources.json のURLを確認してください。");
  }

  const useLlm = Boolean(process.env.ANTHROPIC_API_KEY) && process.env.SCOUT_NO_LLM !== "1";

  // キーワード採点は常に先に用意しておき、Claudeが埋められなかった分の受け皿にする。
  const scores = scoreWithKeywords(items, profile);
  let scorer = "keyword";

  if (useLlm) {
    const llmScores = await scoreWithClaude(items, profile);
    for (const [id, result] of llmScores) scores.set(id, result);

    if (llmScores.size === 0) {
      console.warn("Claudeでの採点が1件も取れませんでした。キーワード採点の結果を使います。");
    } else {
      scorer = llmScores.size === items.length ? MODEL : `${MODEL}+keyword`;
      if (llmScores.size < items.length) {
        console.warn(`${items.length - llmScores.size}件はキーワード採点で補いました。`);
      }
    }
  } else {
    console.log("ANTHROPIC_API_KEY が無いのでキーワードで採点します");
  }

  const scored = items
    .map((item, id) => {
      const result = scores.get(id) ?? {};
      return {
        ...item,
        score: typeof result.score === "number" ? result.score : 0,
        why: result.why ?? "",
        angle: result.angle && result.angle !== "-" ? result.angle : "",
        tags: Array.isArray(result.tags) ? result.tags.slice(0, 3) : [],
      };
    })
    .sort((a, b) => b.score - a.score);

  const digest = {
    generatedAt: new Date().toISOString(),
    scorer,
    sourceCount: config.sources.length,
    itemCount: scored.length,
    items: scored,
  };

  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, `${JSON.stringify(digest, null, 2)}\n`);

  const recommended = scored.filter((item) => item.score >= 60).length;
  console.log(`\n書き出し: ${path.relative(ROOT, OUTPUT_PATH)}`);
  console.log(`${scored.length}件を採点、うち60点以上は ${recommended}件`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
