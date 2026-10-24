#!/usr/bin/env node
// 学習ゲーム（projects/security-quest/ と同じ形式）の問題データを検査する（依存なし）。
// 使い方: node tools/check-learning-game.js [作品のslug]   ※省略時は security-quest
// - 形式の誤り（正解の番号が範囲外、** や ` の閉じ忘れ等）を検出する
// - 「正解が一番長い選択肢」になっている選択問題の割合を出す（当て推量で解けてしまう兆候）
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const slug = process.argv[2] || "security-quest";
const dir = path.join(__dirname, "..", "projects", slug, "data");
if (!fs.existsSync(path.join(dir, "acts.js"))) {
  console.error(`projects/${slug}/data/acts.js が見つからない`);
  process.exit(1);
}
const ctx = { window: {} };
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(dir, "acts.js"), "utf8") + ";SQ=window.SQ;", ctx);
for (const file of fs.readdirSync(dir).filter((f) => /^ch\d+\.js$/.test(f)).sort()) {
  vm.runInContext(fs.readFileSync(path.join(dir, file), "utf8"), ctx);
}

const chapters = ctx.window.SQ.chapters;
const errors = [];
const longest = [];
const lengthRank = [0, 0, 0, 0];
const multiCounts = {};
let choiceCount = 0;
const unbalancedMarks = (text) => (text.match(/\*\*/g) || []).length % 2 || (text.match(/`/g) || []).length % 2;

for (const ch of chapters) {
  for (const lesson of ch.lessons) {
    for (const text of [...lesson.body, ...(lesson.points || [])]) if (unbalancedMarks(text)) errors.push(`${ch.id} 講義「${lesson.title}」: ** か \` が閉じていない`);
  }
  ch.quiz.forEach((q, i) => {
    const id = `${ch.id}-${i + 1}`;
    const options = q.choices || q.lines || q.items || [];
    for (const text of [q.q, q.exp, ...options]) if (unbalancedMarks(text)) errors.push(`${id}: ** か \` が閉じていない`);
    if (q.type === "choice") {
      choiceCount += 1;
      if (!(q.answer >= 0 && q.answer < q.choices.length)) errors.push(`${id}: answer が範囲外`);
      const lengths = q.choices.map((c) => c.length);
      const max = Math.max(...lengths);
      if (lengths[q.answer] === max && lengths.filter((l) => l === max).length === 1) longest.push(id);
      lengthRank[Math.min(3, lengths.filter((l) => l > lengths[q.answer]).length)] += 1;
    } else if (q.type === "multi" || q.type === "spot") {
      if (!q.answer.length || q.answer.some((a) => a < 0 || a >= options.length)) errors.push(`${id}: answer が範囲外`);
      const key = `${q.answer.length}/${options.length}`;
      multiCounts[key] = (multiCounts[key] || 0) + 1;
    } else if (q.type === "match") {
      if (q.pairs.some((p) => /\*\*|`/.test(p[1]))) errors.push(`${id}: 組み合わせの右側は select に入るので装飾を使えない`);
      if (new Set(q.pairs.map((p) => p[1])).size !== q.pairs.length) errors.push(`${id}: 右側に重複がある`);
    } else if (q.type === "input") {
      if (!q.answer.length) errors.push(`${id}: answer が空`);
    } else if (q.type !== "order") {
      errors.push(`${id}: 未知の type ${q.type}`);
    }
  });
}

const total = chapters.reduce((s, ch) => s + ch.quiz.length, 0);
console.log(`章 ${chapters.length} / 講義 ${chapters.reduce((s, ch) => s + ch.lessons.length, 0)} / 問題 ${total} / 用語 ${chapters.reduce((s, ch) => s + ch.terms.length, 0)}`);
console.log(`正解が最長の選択問題: ${longest.length}/${choiceCount}（${Math.round((longest.length / choiceCount) * 100)}%。4択の偶然は25%。30%を超えたら選択肢を見直す）`);
console.log(`正解の長さの順位（同率は上位扱い）: 1番目 ${lengthRank[0]} / 2番目 ${lengthRank[1]} / 3番目 ${lengthRank[2]} / 4番目以下 ${lengthRank[3]}（最長を避けた結果、どこか1つの順位に5割以上が集まったら見直す）`);
console.log(`複数選択・発見問題の正解数の分布: ${Object.entries(multiCounts).map(([k, v]) => `${k}×${v}`).join(" ")}`);
if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}
console.log("形式エラーなし");
