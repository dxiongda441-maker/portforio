/**
 * Scout ビューア。digest.json を読み、関連度順に並べて表示する。
 * 保存・非表示は端末ごとの localStorage に置く。GitHub Pages では全作品が
 * 同一オリジンなので、キーは必ず scout: を前置きする。
 */

const STORAGE_SAVED = "scout:saved";
const STORAGE_HIDDEN = "scout:hidden";
const RECOMMENDED_MIN_SCORE = 60;

const elements = {
  state: document.getElementById("state"),
  cards: document.getElementById("cards"),
  tabs: document.getElementById("tabs"),
  stats: document.getElementById("stats"),
  updated: document.getElementById("stat-updated"),
  count: document.getElementById("stat-count"),
  scorer: document.getElementById("stat-scorer"),
  tray: document.getElementById("tray"),
  trayCount: document.getElementById("tray-count"),
  copy: document.getElementById("copy"),
  template: document.getElementById("card-template"),
};

let digest = null;
let view = "recommended";
const saved = loadSet(STORAGE_SAVED);
const hidden = loadSet(STORAGE_HIDDEN);

function loadSet(key) {
  try {
    const raw = JSON.parse(localStorage.getItem(key) ?? "[]");
    return new Set(Array.isArray(raw) ? raw : []);
  } catch {
    return new Set();
  }
}

function persist(key, set) {
  try {
    localStorage.setItem(key, JSON.stringify([...set]));
  } catch {
    // プライベートモードなどで書けなくても、表示は続ける
  }
}

function formatWhen(iso) {
  if (!iso) return "日付不明";
  const elapsed = Date.now() - new Date(iso).getTime();
  const hours = Math.floor(elapsed / 3600000);
  if (hours < 1) return "1時間以内";
  if (hours < 24) return `${hours}時間前`;
  return `${Math.floor(hours / 24)}日前`;
}

function band(score) {
  if (score >= RECOMMENDED_MIN_SCORE) return "high";
  if (score >= 35) return "mid";
  return "low";
}

function visibleItems() {
  const items = digest?.items ?? [];
  if (view === "saved") return items.filter((item) => saved.has(item.url));
  if (view === "hidden") return items.filter((item) => hidden.has(item.url));
  const live = items.filter((item) => !hidden.has(item.url));
  return view === "recommended" ? live.filter((item) => item.score >= RECOMMENDED_MIN_SCORE) : live;
}

function emptyMessage() {
  if (view === "saved") return "保存した記事はまだありません。カードの「保存」にチェックを入れると、ここに溜まります。";
  if (view === "hidden") return "「興味なし」にした記事はまだありません。";
  if (view === "recommended") {
    return `${RECOMMENDED_MIN_SCORE}点以上の記事がありませんでした。\nプロファイル（scout/config/profile.md）と実際の記事が噛み合っていないサインです。「すべて」を見て、何が落ちているか確かめてください。`;
  }
  return "記事がありません。scout/config/sources.json のURLを確認してください。";
}

function buildCard(item) {
  const node = elements.template.content.firstElementChild.cloneNode(true);
  const isHidden = hidden.has(item.url);

  node.dataset.band = band(item.score);
  node.dataset.hidden = String(isHidden);
  node.querySelector(".score-value").textContent = String(item.score);

  const link = node.querySelector(".title a");
  link.textContent = item.title;
  link.href = item.url;

  node.querySelector(".source").textContent = item.source;
  node.querySelector(".when").textContent = formatWhen(item.publishedAt);

  const why = node.querySelector(".why");
  why.textContent = item.why || "（採点コメントなし）";

  const angle = node.querySelector(".angle");
  if (item.angle) {
    angle.textContent = `切り口: ${item.angle}`;
  } else {
    angle.remove();
  }

  const tags = node.querySelector(".tags");
  for (const tag of item.tags ?? []) {
    const li = document.createElement("li");
    li.textContent = tag;
    tags.append(li);
  }

  const checkbox = node.querySelector(".save input");
  checkbox.checked = saved.has(item.url);
  checkbox.addEventListener("change", () => {
    if (checkbox.checked) saved.add(item.url);
    else saved.delete(item.url);
    persist(STORAGE_SAVED, saved);
    renderTray();
    if (view === "saved") render();
  });

  node.querySelector(".hide").addEventListener("click", () => {
    hidden.add(item.url);
    persist(STORAGE_HIDDEN, hidden);
    render();
  });

  node.querySelector(".restore").addEventListener("click", () => {
    hidden.delete(item.url);
    persist(STORAGE_HIDDEN, hidden);
    render();
  });

  return node;
}

function renderTray() {
  const count = digest?.items.filter((item) => saved.has(item.url)).length ?? 0;
  elements.tray.hidden = count === 0;
  elements.trayCount.textContent = `${count}件を保存中`;
}

function render() {
  const items = visibleItems();
  elements.cards.replaceChildren(...items.map(buildCard));

  if (items.length === 0) {
    elements.state.hidden = false;
    elements.state.textContent = emptyMessage();
  } else {
    elements.state.hidden = true;
  }

  for (const tab of elements.tabs.querySelectorAll(".tab")) {
    tab.classList.toggle("is-active", tab.dataset.view === view);
  }

  renderTray();
}

function toMarkdown(items) {
  const date = new Date(digest.generatedAt).toLocaleDateString("ja-JP");
  const lines = [`## ${date} のダイジェスト`, ""];

  for (const item of items) {
    lines.push(`### ${item.title}`);
    lines.push(`- リンク: ${item.url}`);
    lines.push(`- ソース: ${item.source} / 関連度 ${item.score}`);
    if (item.why) lines.push(`- なぜ: ${item.why}`);
    if (item.angle) lines.push(`- 切り口: ${item.angle}`);
    if (item.tags?.length) lines.push(`- タグ: ${item.tags.map((tag) => `#${tag.replace(/\s+/g, "")}`).join(" ")}`);
    lines.push("");
  }

  return lines.join("\n");
}

async function copyMarkdown() {
  const items = digest.items.filter((item) => saved.has(item.url));
  if (items.length === 0) return;

  const markdown = toMarkdown(items);
  const original = elements.copy.textContent;

  try {
    await navigator.clipboard.writeText(markdown);
  } catch {
    // クリップボードAPIが使えない環境向けの手動フォールバック
    const area = document.createElement("textarea");
    area.value = markdown;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.append(area);
    area.select();
    document.execCommand("copy");
    area.remove();
  }

  elements.copy.textContent = `${items.length}件コピーしました`;
  setTimeout(() => {
    elements.copy.textContent = original;
  }, 1800);
}

async function init() {
  let response;
  try {
    response = await fetch("./data/digest.json", { cache: "no-store" });
  } catch {
    elements.state.textContent =
      "digest.json を読み込めませんでした。file:// で開いている場合は、リポジトリ直下で python3 -m http.server 3000 を実行してから http://localhost:3000/projects/scout/ を開いてください。";
    return;
  }

  if (!response.ok) {
    elements.state.textContent =
      "まだダイジェストがありません。リポジトリ直下で node scout/collect.mjs を実行すると、ここに記事が並びます。";
    return;
  }

  digest = await response.json();

  elements.updated.textContent = new Date(digest.generatedAt).toLocaleString("ja-JP", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  elements.count.textContent = `${digest.itemCount}件 / ${digest.sourceCount}ソース`;
  elements.scorer.textContent = !digest.scorer.startsWith("claude")
    ? "キーワード"
    : digest.scorer.includes("+")
      ? "Claude＋キーワード"
      : "Claude";
  elements.stats.hidden = false;
  elements.tabs.hidden = false;

  render();
}

elements.tabs.addEventListener("click", (event) => {
  const tab = event.target.closest(".tab");
  if (!tab) return;
  view = tab.dataset.view;
  render();
});

elements.copy.addEventListener("click", copyMarkdown);

init();
