"use strict";

(() => {
  const STORAGE_KEY = "psychology-quest-v1";
  const PASS_RATE = 0.8;
  const FINAL_PASS_RATE = 0.85;
  const FINAL_SIZE = 40;
  const REVIEW_SIZE = 10;
  const REVIEW_GRADUATE_STREAK = 2;
  const XP_CORRECT = 10;
  const XP_FIRST_CLEAR = 50;
  const XP_PER_NEW_STAR = 20;

  const TYPE_LABELS = {
    choice: "選択",
    multi: "すべて選べ",
    order: "並べ替え",
    input: "入力",
    spot: "見つけ出せ",
    match: "組み合わせ"
  };

  const RANKS = [
    { min: 0, title: "心理学ビギナー" },
    { min: 3, title: "研究室の新人" },
    { min: 6, title: "実験アシスタント" },
    { min: 9, title: "データの読み手" },
    { min: 12, title: "大学院生" },
    { min: 15, title: "若手研究員" },
    { min: 18, title: "心理学者の卵" }
  ];
  const FINAL_RANK = "心の探究者（マスター・オブ・サイコロジー）";

  const SQ = window.SQ || { acts: [], chapters: [] };
  const chapters = SQ.chapters.slice().sort((a, b) => a.no - b.no);
  chapters.forEach((ch) => {
    ch.quiz.forEach((q, i) => {
      q.id = `${ch.id}-${i + 1}`;
      q.chapterId = ch.id;
    });
  });
  const chapterById = new Map(chapters.map((ch) => [ch.id, ch]));
  const questionById = new Map(chapters.flatMap((ch) => ch.quiz.map((q) => [q.id, q])));

  const LEVEL_MAX = 99;
  const LOG_MAX = 400;
  const STORY = SQ.story || { regions: {}, chapters: {}, prologue: [], afterName: [], ending: [], final: { intro: [] } };
  const STAT_NAMES = { 1: "かがくの目", 2: "しくみの知", 3: "ひとの理解", 4: "ささえる力" };

  const app = document.getElementById("app");
  let state = load();
  let battle = null;
  let lastResult = null;

  // ---------- 保存 ----------

  function defaultState() {
    return { version: 1, name: "", xp: 0, chapters: {}, wrong: {}, final: { cleared: false, best: 0, date: "" }, freeMode: false, prologue: false, start: "", log: [], levels: [], qs: {}, grad: 0 };
  }

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? sanitize(JSON.parse(raw)) : defaultState();
    } catch {
      return defaultState();
    }
  }

  // 保存データは書き換え・持ち込みが可能なので、既知のIDと型だけを通して作り直す
  function sanitize(data) {
    const base = defaultState();
    if (!isPlainObject(data)) return base;
    const num = (v, min, max) => (Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : min);
    const int = (v, min, max) => Math.round(num(v, min, max));
    const isDate = (v) => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v);
    const chaptersIn = isPlainObject(data.chapters) ? data.chapters : {};
    for (const ch of chapters) {
      const p = chaptersIn[ch.id];
      if (!isPlainObject(p)) continue;
      const cleared = p.cleared === true;
      base.chapters[ch.id] = { read: p.read === true || cleared, cleared, best: num(p.best, 0, 1), stars: cleared ? int(p.stars, 1, 3) : 0, tries: int(p.tries, 0, 1e5), date: cleared && isDate(p.date) ? p.date : "" };
    }
    const wrongIn = isPlainObject(data.wrong) ? data.wrong : {};
    for (const id of Object.keys(wrongIn)) {
      if (questionById.has(id) && isPlainObject(wrongIn[id])) base.wrong[id] = { streak: int(wrongIn[id].streak, 0, REVIEW_GRADUATE_STREAK - 1) };
    }
    const fin = isPlainObject(data.final) ? data.final : {};
    const allCleared = chapters.every((ch) => base.chapters[ch.id] && base.chapters[ch.id].cleared);
    base.final = { cleared: fin.cleared === true && allCleared, best: num(fin.best, 0, 1), date: isDate(fin.date) ? fin.date : "" };
    base.name = typeof data.name === "string" ? data.name.slice(0, 24) : "";
    base.xp = int(data.xp, 0, 1e7);
    base.freeMode = data.freeMode === true;
    base.prologue = data.prologue === true;
    base.start = isDate(data.start) ? data.start : "";
    const qsIn = isPlainObject(data.qs) ? data.qs : {};
    for (const ch of chapters) {
      if (!isPlainObject(qsIn[ch.id])) continue;
      const a = int(qsIn[ch.id].a, 0, 1e6);
      base.qs[ch.id] = { a, k: int(qsIn[ch.id].k, 0, a) };
    }
    base.grad = int(data.grad, 0, 1e6);
    base.log = (Array.isArray(data.log) ? data.log : [])
      .filter((e) => isPlainObject(e) && isDate(e.d) && ["c", "r", "f"].includes(e.m))
      .slice(-LOG_MAX)
      .map((e) => {
        const n = int(e.n, 1, 1000);
        return { d: e.d, m: e.m, c: chapterById.has(e.c) ? e.c : "", n, k: int(e.k, 0, n), x: int(e.x, 0, 1e5), w: e.w === true };
      });
    base.levels = (Array.isArray(data.levels) ? data.levels : [])
      .filter((e) => isPlainObject(e) && isDate(e.d) && Number.isInteger(e.lv) && e.lv >= 2 && e.lv <= LEVEL_MAX)
      .slice(-LEVEL_MAX)
      .map((e) => ({ lv: e.lv, d: e.d }));
    return base;
  }

  const SAVE_PREFIX = "PQ1.";

  function exportCode() {
    const bytes = new TextEncoder().encode(JSON.stringify(state));
    let bin = "";
    bytes.forEach((b) => {
      bin += String.fromCharCode(b);
    });
    return SAVE_PREFIX + btoa(bin);
  }

  function importCode(code) {
    const text = String(code).replace(/\s+/g, "");
    if (!text.startsWith(SAVE_PREFIX) || text.length > 200000) throw new Error("format");
    const bin = atob(text.slice(SAVE_PREFIX.length));
    const json = new TextDecoder("utf-8", { fatal: true }).decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
    return sanitize(JSON.parse(json));
  }

  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // プライベートモード等で保存できなくても遊べるようにする
    }
  }

  function isPlainObject(value) {
    return value !== null && typeof value === "object" && !Array.isArray(value);
  }

  function progressOf(ch) {
    return state.chapters[ch.id] || { read: false, cleared: false, best: 0, stars: 0, tries: 0, date: "" };
  }

  function updateProgress(ch, patch) {
    state.chapters[ch.id] = { ...progressOf(ch), ...patch };
  }

  // ---------- 進行判定 ----------

  function clearedCount() {
    return chapters.filter((ch) => progressOf(ch).cleared).length;
  }

  function totalStars() {
    return chapters.reduce((sum, ch) => sum + (progressOf(ch).stars || 0), 0);
  }

  function isUnlocked(ch) {
    if (state.freeMode || ch.no === 1) return true;
    const prev = chapters[chapters.indexOf(ch) - 1];
    return !prev || progressOf(prev).cleared;
  }

  function termsUnlocked(ch) {
    const p = progressOf(ch);
    return state.freeMode || p.read || p.cleared;
  }

  function finalUnlocked() {
    return chapters.length > 0 && clearedCount() === chapters.length;
  }

  function rankTitle() {
    if (state.final.cleared) return FINAL_RANK;
    const count = clearedCount();
    return RANKS.filter((r) => count >= r.min).pop().title;
  }

  function nextChapter() {
    return chapters.find((ch) => isUnlocked(ch) && !progressOf(ch).cleared);
  }

  function wrongIds() {
    return Object.keys(state.wrong).filter((id) => questionById.has(id));
  }

  // ---------- レベル・能力値・成長の記録 ----------

  // レベル L に必要な累計 EXP。全章撃破と最終試験合格でおよそ Lv30 になる曲線
  function expForLevel(lv) {
    const n = lv - 1;
    return Math.round(4.5 * n * n + 40 * n);
  }

  function levelOf(xp) {
    let lv = 1;
    while (lv < LEVEL_MAX && xp >= expForLevel(lv + 1)) lv += 1;
    return lv;
  }

  function maxHp(lv) {
    return 18 + lv * 6;
  }

  function maxMp(lv) {
    return 6 + lv * 3;
  }

  function playerName() {
    return state.name || "あなた";
  }

  function fill(text) {
    return text.replace(/\{name\}/g, playerName());
  }

  function storyOf(ch) {
    return (STORY.chapters && STORY.chapters[ch.id]) || { place: ch.title, sprite: ch.icon, intro: [], victory: [], item: null };
  }

  function regionOf(actNo) {
    return (STORY.regions && STORY.regions[actNo]) || null;
  }

  function dateText(d) {
    const [, m, day] = d.split("-");
    return `${Number(m)}/${Number(day)}`;
  }

  function today() {
    const d = new Date();
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }

  function shiftDate(d, days) {
    const [y, m, day] = d.split("-").map(Number);
    const t = new Date(y, m - 1, day + days);
    return `${t.getFullYear()}-${pad(t.getMonth() + 1)}-${pad(t.getDate())}`;
  }

  function daysBetween(a, b) {
    const utc = (d) => {
      const [y, m, day] = d.split("-").map(Number);
      return Date.UTC(y, m - 1, day);
    };
    return Math.round((utc(b) - utc(a)) / 86400000);
  }

  function playDays() {
    return [...new Set(state.log.map((e) => e.d))].sort();
  }

  function currentStreak() {
    const days = new Set(state.log.map((e) => e.d));
    let d = today();
    if (!days.has(d)) d = shiftDate(d, -1);
    let n = 0;
    while (days.has(d)) {
      n += 1;
      d = shiftDate(d, -1);
    }
    return n;
  }

  function recentAccuracy(target) {
    let n = 0;
    let k = 0;
    for (let i = state.log.length - 1; i >= 0 && n < target; i -= 1) {
      n += state.log[i].n;
      k += state.log[i].k;
    }
    return { n, acc: n ? k / n : 0 };
  }

  // つよさ画面の能力値（1〜99）。幕ごとの撃破率と正答率、最近の正答率、復習の卒業数、学習日数から出す
  function abilities() {
    const clamp = (v) => Math.max(1, Math.min(99, Math.round(v)));
    const list = SQ.acts.map((act) => {
      const chs = chapters.filter((ch) => ch.act === act.no);
      const cleared = chs.filter((ch) => progressOf(ch).cleared).length;
      let a = 0;
      let k = 0;
      chs.forEach((ch) => {
        if (state.qs[ch.id]) {
          a += state.qs[ch.id].a;
          k += state.qs[ch.id].k;
        }
      });
      const acc = a ? k / a : 0;
      return {
        label: STAT_NAMES[act.no] || act.title,
        value: clamp(1 + 48 * (cleared / chs.length) + 50 * acc * Math.min(1, a / (8 * chs.length))),
        note: `${act.title}：撃破 ${cleared}/${chs.length}・正答率 ${Math.round(acc * 100)}%`
      };
    });
    const recent = recentAccuracy(50);
    list.push({ label: "はんだん力", value: recent.n ? clamp(recent.acc * 99) : 1, note: `直近${recent.n}問の正答率 ${Math.round(recent.acc * 100)}%` });
    list.push({ label: "きおく力", value: clamp(1 + state.grad * 3), note: `復習ダンジョンを卒業した問題 ${state.grad}問` });
    const days = playDays().length;
    list.push({ label: "ねばり", value: clamp(days * 6), note: `学習した日数 ${days}日` });
    return list;
  }

  // ---------- DOM ヘルパー ----------

  function el(tag, attrs = {}, ...children) {
    const node = document.createElement(tag);
    for (const [key, value] of Object.entries(attrs)) {
      if (value == null || value === false) continue;
      if (key === "class") node.className = value;
      else if (key.startsWith("on")) node.addEventListener(key.slice(2), value);
      else if (value === true) node.setAttribute(key, "");
      else node.setAttribute(key, value);
    }
    for (const child of children.flat(Infinity)) {
      if (child == null || child === false) continue;
      node.append(child instanceof Node ? child : document.createTextNode(String(child)));
    }
    return node;
  }

  // **太字** と `コード` だけを解釈する。innerHTML は使わない。
  function rich(text) {
    const frag = document.createDocumentFragment();
    const pattern = /(\*\*[^*]+\*\*|`[^`]+`)/g;
    let last = 0;
    for (const match of text.matchAll(pattern)) {
      if (match.index > last) frag.append(text.slice(last, match.index));
      const token = match[0];
      frag.append(token.startsWith("**") ? el("strong", {}, token.slice(2, -2)) : el("code", {}, token.slice(1, -1)));
      last = match.index + token.length;
    }
    if (last < text.length) frag.append(text.slice(last));
    return frag;
  }

  // DOM の append() は null を "null" という文字にしてしまうので、空の要素を除いてから画面に足す
  function mount(...nodes) {
    app.append(...nodes.flat(Infinity).filter((n) => n != null && n !== false));
  }

  function button(label, onclick, cls = "btn") {
    return el("button", { type: "button", class: cls, onclick }, label);
  }

  function link(label, href, cls = "btn") {
    return el("a", { class: cls, href }, label);
  }

  function shuffle(list) {
    const copy = list.slice();
    for (let i = copy.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  function range(n) {
    return Array.from({ length: n }, (_, i) => i);
  }

  function pad(n) {
    return String(n).padStart(2, "0");
  }

  function starText(n, max = 3) {
    return "★".repeat(n) + "☆".repeat(max - n);
  }

  function heading(text, sub) {
    return el("div", { class: "screen-head" }, sub ? el("p", { class: "eyebrow" }, sub) : null, el("h1", { tabindex: "-1" }, text));
  }

  // ドラクエ風のメッセージウィンドウ。▼（またはウィンドウのクリック）で1行ずつ進む。instant なら最初から全部見せる
  function dialog(lines, instant = false) {
    if (!lines || !lines.length) return null;
    const items = lines.map(([who, text]) => el("p", { class: `msg-line${who ? "" : " is-narration"}` }, who ? el("span", { class: "speaker" }, who) : null, fill(text)));
    const box = el("div", { class: "msgwin", role: "log", "aria-live": "polite" });
    const controls = el("div", { class: "msg-controls" });
    let shown = 0;
    const step = (n) => {
      shown = Math.min(items.length, n);
      box.replaceChildren(...items.slice(0, shown));
      controls.hidden = shown >= items.length;
      if (!controls.hidden) box.append(el("span", { class: "msg-cursor", "aria-hidden": "true" }, "▼"));
    };
    box.addEventListener("click", () => step(shown + 1));
    controls.append(button("▼ つぎへ", () => step(shown + 1), "btn btn-msg"), button("ぜんぶ読む", () => step(items.length), "btn btn-ghost btn-small"));
    step(instant ? items.length : 1);
    return el("div", { class: "dialog" }, box, controls);
  }

  // ブラウザの confirm()/alert() は埋め込み表示などで出ないことがあるので、画面内のウィンドウで聞く。onYes がなければお知らせだけ
  function ask(message, onYes, yesLabel = "はい") {
    closeAsk();
    const layer = el(
      "div",
      { class: "ask-layer", role: "alertdialog", "aria-modal": "true", "aria-label": message },
      el(
        "div",
        { class: "msgwin ask" },
        el("p", { class: "msg-line" }, message),
        el(
          "div",
          { class: "ask-actions" },
          onYes
            ? button(yesLabel, () => {
                closeAsk();
                onYes();
              }, "btn btn-primary")
            : null,
          button(onYes ? "いいえ" : "とじる", closeAsk, "btn btn-msg")
        )
      )
    );
    document.body.append(layer);
    layer.querySelector("button").focus();
  }

  function closeAsk() {
    document.querySelectorAll(".ask-layer").forEach((node) => node.remove());
  }

  function messageWindow(lines, cls = "") {
    return el("div", { class: `msgwin ${cls}`.trim() }, lines.filter(Boolean).map((line) => el("p", { class: "msg-line" }, line)));
  }

  function miniStatus() {
    const lv = levelOf(state.xp);
    const base = expForLevel(lv);
    const nextAt = expForLevel(lv + 1);
    const pct = lv >= LEVEL_MAX ? 100 : ((state.xp - base) / (nextAt - base)) * 100;
    return el(
      "div",
      { class: "statuswin" },
      el("p", { class: "sw-name" }, playerName()),
      el("dl", { class: "sw-grid" }, swRow("Lv", lv), swRow("HP", maxHp(lv)), swRow("MP", maxMp(lv)), swRow("E", state.xp)),
      expBar(pct),
      el("p", { class: "sw-next" }, lv >= LEVEL_MAX ? "レベルは最大です" : `つぎのレベルまで ${nextAt - state.xp} EXP`),
      el("p", { class: "sw-rank" }, `称号：${rankTitle()}`)
    );
  }

  function expBar(pct) {
    return el("div", { class: "exp-bar", role: "progressbar", "aria-label": "つぎのレベルまでの経験値", "aria-valuemin": "0", "aria-valuemax": "100", "aria-valuenow": String(Math.round(pct)) }, el("span", { style: `width:${pct}%` }));
  }

  function swRow(key, value) {
    return el("div", {}, el("dt", {}, key), el("dd", {}, String(value)));
  }

  // ---------- ルーティング ----------

  function go(hash) {
    if (location.hash === hash) render();
    else location.hash = hash;
  }

  window.addEventListener("hashchange", render);

  function render() {
    const parts = location.hash.replace(/^#\/?/, "").split("/").filter(Boolean);
    const [view, arg, sub] = parts;
    app.replaceChildren();
    closeAsk();

    if (view !== "battle" && battle && !battle.finished) battle = null;

    if (!view) renderHome();
    else if (view === "ch") {
      const ch = chapterById.get(arg);
      if (!ch || !isUnlocked(ch)) return go("#/");
      if (sub) renderLesson(ch, Number(sub));
      else renderChapter(ch);
    } else if (view === "battle") {
      if (!battle) return go("#/");
      renderBattle();
    } else if (view === "result") {
      if (!lastResult) return go("#/");
      renderResult();
    } else if (view === "prologue") renderPrologue();
    else if (view === "status") renderStatus();
    else if (view === "tower") {
      if (!finalUnlocked()) return go("#/");
      renderTower();
    } else if (view === "ending") {
      if (!state.final.cleared) return go("#/");
      renderEnding();
    } else if (view === "glossary") renderGlossary();
    else if (view === "settings") renderSettings();
    else if (view === "help") renderHelp();
    else if (view === "certificate") {
      if (!state.final.cleared) return go("#/");
      renderCertificate();
    } else return go("#/");

    window.scrollTo(0, 0);
    const h1 = app.querySelector("h1");
    if (h1) h1.focus({ preventScroll: true });
  }

  // ---------- ホーム（マップ） ----------

  function renderHome() {
    const cleared = clearedCount();
    const total = chapters.length;
    const next = nextChapter();
    const reviewCount = wrongIds().length;
    const unlockedTerms = chapters.filter(termsUnlocked).reduce((s, ch) => s + ch.terms.length, 0);
    const allTerms = chapters.reduce((s, ch) => s + ch.terms.length, 0);
    const started = state.prologue || cleared > 0;
    let objective;
    if (!started) objective = "古い本『ミナモの書』を開いて、ココロの国へ旅立とう。";
    else if (next) objective = `つぎの もくてきち：第${next.no}章「${storyOf(next).place}」（${(regionOf(next.act) || { name: "" }).name}）`;
    else if (finalUnlocked() && !state.final.cleared) objective = "すべての霧の主を倒した。霧の源、ゆがみの塔へ向かおう！";
    else objective = "ココロの国の霧は晴れた。復習や★集めで、さらに腕を磨こう。";

    const hero = el(
      "section",
      { class: "hero" },
      el("p", { class: "eyebrow" }, "心理学 学習RPG"),
      el("h1", { tabindex: "-1" }, "心理学クエスト"),
      el("p", { class: "hero-lead" }, `架空の「ミナモ大学 心理学研究室」に入ったあなた。思い込み・俗説・バイアスが化けた${chapters.length}体のボスを倒し、最終試験に合格すれば、人の心と行動を科学的に読み解くための地図がすべて手に入る。`),
      el("div", { class: "hero-grid" }, miniStatus(), messageWindow([objective], "msg-objective")),
      el(
        "div",
        { class: "status-card" },
        el("div", { class: "status-grid" }, statBox("撃破", `${cleared}/${total}`), statBox("★", `${totalStars()}/${total * 3}`), statBox("EXP", state.xp), statBox("図鑑", `${unlockedTerms}/${allTerms}`)),
        el("div", { class: "meter", role: "progressbar", "aria-label": "全体の進行度", "aria-valuemin": "0", "aria-valuemax": String(total), "aria-valuenow": String(cleared) }, el("span", { style: `width:${total ? (cleared / total) * 100 : 0}%` }))
      ),
      el(
        "div",
        { class: "hero-actions" },
        !started ? link("冒険を始める", "#/prologue", "btn btn-primary") : next ? link(`続きから：第${next.no}章`, `#/ch/${next.id}`, "btn btn-primary") : null,
        started ? link("つよさを見る", "#/status", "btn") : null,
        button(`復習ダンジョン（${reviewCount}）`, startReview, reviewCount ? "btn" : "btn btn-muted"),
        finalUnlocked() ? link(state.final.cleared ? "最終試験に再挑戦" : "最終試験に挑む", "#/tower", "btn btn-gold") : el("span", { class: "btn btn-muted", "aria-disabled": "true" }, "最終試験（全章撃破で解放）"),
        state.final.cleared ? link("修了証を見る", "#/certificate", "btn btn-gold") : null
      )
    );

    const map = el("section", { class: "map", "aria-label": "章の一覧" });
    for (const act of SQ.acts) {
      const list = chapters.filter((ch) => ch.act === act.no);
      const region = regionOf(act.no);
      map.append(
        el(
          "div",
          { class: "act" },
          el(
            "div",
            { class: "act-head" },
            el("p", { class: "eyebrow" }, `ACT ${act.no} ／ ${act.title}`),
            el("h2", {}, region ? region.name : act.title),
            el("p", {}, region ? region.desc : act.desc)
          ),
          el("ol", { class: "chapter-grid" }, list.map(chapterTile))
        )
      );
    }

    mount(hero, map);
  }

  function statBox(label, value) {
    return el("div", { class: "stat" }, el("span", { class: "label" }, label), el("strong", {}, String(value)));
  }

  function chapterTile(ch) {
    const p = progressOf(ch);
    const unlocked = isUnlocked(ch);
    const inner = [
      el("span", { class: "tile-no" }, `第${ch.no}章`),
      el("span", { class: "tile-icon", "aria-hidden": "true" }, unlocked ? ch.icon : "🔒"),
      el("span", { class: "tile-place" }, unlocked ? `📍 ${storyOf(ch).place}` : "📍 ？？？"),
      el("strong", { class: "tile-title" }, ch.title),
      el("span", { class: "tile-sub" }, unlocked ? ch.subtitle : "前の章のボスを倒すと解放"),
      el("span", { class: "tile-stars", "aria-label": `星${p.stars || 0}個` }, p.cleared ? starText(p.stars) : unlocked ? "未撃破" : "")
    ];
    return el("li", {}, unlocked ? el("a", { class: `tile${p.cleared ? " is-cleared" : ""}`, href: `#/ch/${ch.id}` }, inner) : el("div", { class: "tile is-locked" }, inner));
  }

  // ---------- プロローグ・塔・エンディング ----------

  function renderPrologue() {
    const after = el("div", { class: "prologue-after" });
    const showAfter = () => {
      after.replaceChildren(
        dialog(STORY.afterName),
        el("div", { class: "actions" }, link("冒険に出る（第1章へ）", `#/ch/${chapters[0].id}`, "btn btn-primary"), link("マップを見る", "#/", "btn btn-ghost"))
      );
    };
    const nameInput = el("input", { type: "text", class: "text-input", maxlength: "24", value: state.name, placeholder: "なまえ（あとで冒険の書から変えられる）", "aria-label": "プレイヤー名" });
    const form = el(
      "form",
      {
        class: "panel name-form",
        onsubmit: (e) => {
          e.preventDefault();
          state.name = nameInput.value.trim().slice(0, 24);
          state.prologue = true;
          if (!state.start) state.start = today();
          save();
          form.replaceWith(messageWindow([`${playerName()}は ミナモの書を 手に取った！`]));
          showAfter();
        }
      },
      el("h2", {}, "なまえを いれてください"),
      nameInput,
      el("div", { class: "submit-row" }, el("button", { type: "submit", class: "btn btn-primary" }, "けってい"))
    );
    mount(heading("プロローグ", "PROLOGUE ／ ミナモの書"), dialog(STORY.prologue), form, after);
  }

  function renderTower() {
    const f = STORY.final || { intro: [] };
    const needed = Math.ceil(FINAL_SIZE * FINAL_PASS_RATE);
    mount(
      heading("ゆがみの塔", `FINAL ／ ${f.place || "最終試験"}`),
      dialog(f.intro, state.final.cleared),
      el(
        "div",
        { class: "boss-card" },
        el("div", { class: "boss-sprite", "aria-hidden": "true" }, f.sprite || "🐉"),
        el(
          "div",
          { class: "boss-body" },
          el("p", { class: "eyebrow" }, "霧の源"),
          el("h2", {}, "ディストーション・ドラゴン"),
          el("p", { class: "muted" }, `全${chapters.length}章から${FINAL_SIZE}問 ／ 合格：${needed}問以上 ／ 最高 ${Math.round((state.final.best || 0) * 100)}%`)
        )
      ),
      el("div", { class: "actions" }, button("たたかう（最終試験を始める）", startFinal, "btn btn-gold"), link("マップへ", "#/", "btn btn-ghost"))
    );
  }

  function renderEnding() {
    mount(
      heading("エンディング", "ENDING"),
      dialog(STORY.ending),
      el("div", { class: "actions" }, link("修了証を受け取る", "#/certificate", "btn btn-gold"), link("つよさを見る", "#/status", "btn"), link("マップへ", "#/", "btn btn-ghost"))
    );
  }

  // ---------- 章トップ・講義 ----------

  function renderChapter(ch) {
    const p = progressOf(ch);
    const s = storyOf(ch);
    const region = regionOf(ch.act);
    const index = chapters.indexOf(ch);
    mount(
      heading(`${ch.icon} ${ch.title}`, `CHAPTER ${pad(ch.no)} ／ ${region ? `${region.name}・` : ""}${s.place}`),
      el("div", { class: "real-world" }, el("p", { class: "eyebrow" }, "現実の世界では——"), el("p", { class: "story" }, rich(ch.story))),
      dialog(s.intro, p.cleared),
      el(
        "div",
        { class: "boss-card" },
        el("div", { class: "boss-sprite", "aria-hidden": "true" }, s.sprite),
        el(
          "div",
          { class: "boss-body" },
          el("p", { class: "eyebrow" }, "この地の霧の主"),
          el("h2", {}, ch.boss.name),
          el("p", { class: "boss-line" }, `「${ch.boss.line}」`),
          el("p", { class: "muted" }, `講義 ${ch.lessons.length}枚 ／ 問題 ${ch.quiz.length}問 ／ 撃破条件：${Math.ceil(ch.quiz.length * PASS_RATE)}問以上正解`),
          p.cleared ? el("p", { class: "cleared-note" }, `撃破済み ${starText(p.stars)}（最高 ${Math.round(p.best * 100)}%・挑戦 ${p.tries || 1}回）`) : null,
          p.cleared && s.item ? el("p", { class: "item-note" }, `だいじなもの：${s.item[0]}`) : null
        )
      ),
      el("h2", { class: "section-title" }, "まなびの書（講義の目次）"),
      el(
        "ol",
        { class: "lesson-index" },
        ch.lessons.map((lesson, i) => el("li", {}, el("a", { href: `#/ch/${ch.id}/${i + 1}` }, lesson.title)))
      ),
      el(
        "div",
        { class: "actions" },
        link(p.read ? "講義を読み直す" : "講義を始める", `#/ch/${ch.id}/1`, p.read ? "btn" : "btn btn-primary"),
        p.read || p.cleared || state.freeMode ? button("ボス戦に挑む", () => startChapterBattle(ch), p.read ? "btn btn-primary" : "btn") : null,
        index > 0 ? link("← 前の章", `#/ch/${chapters[index - 1].id}`, "btn btn-ghost") : null,
        link("マップへ", "#/", "btn btn-ghost")
      )
    );
  }

  function renderLesson(ch, n) {
    const total = ch.lessons.length;
    if (!Number.isInteger(n) || n < 1 || n > total) return go(`#/ch/${ch.id}`);
    const lesson = ch.lessons[n - 1];
    const isLast = n === total;
    if (isLast && !progressOf(ch).read) {
      updateProgress(ch, { read: true });
      save();
    }

    const card = el(
      "article",
      { class: "lesson-card" },
      el("p", { class: "eyebrow" }, `第${ch.no}章 ${ch.title} ／ 講義 ${n}/${total}`),
      el("h1", { tabindex: "-1" }, lesson.title),
      lesson.body.map((para) => el("p", {}, rich(para))),
      lesson.example ? el("pre", { class: "code" }, el("code", {}, lesson.example)) : null,
      lesson.points && lesson.points.length
        ? el("div", { class: "points" }, el("h2", {}, "ここを押さえる"), el("ul", {}, lesson.points.map((pt) => el("li", {}, rich(pt)))))
        : null
    );

    const dots = el(
      "ol",
      { class: "dots", "aria-label": "講義の進み具合" },
      range(total).map((i) => el("li", {}, el("a", { href: `#/ch/${ch.id}/${i + 1}`, class: i + 1 === n ? "is-current" : "", "aria-label": `講義${i + 1}`, "aria-current": i + 1 === n ? "step" : null })))
    );

    const nav = el(
      "div",
      { class: "actions lesson-nav" },
      n > 1 ? link("← 前へ", `#/ch/${ch.id}/${n - 1}`, "btn btn-ghost") : link("← 章トップ", `#/ch/${ch.id}`, "btn btn-ghost"),
      isLast ? button(`ボス「${ch.boss.name}」に挑む`, () => startChapterBattle(ch), "btn btn-primary") : link("次へ →", `#/ch/${ch.id}/${n + 1}`, "btn btn-primary")
    );

    mount(dots, card, nav);
  }

  // ---------- バトル ----------

  function startChapterBattle(ch) {
    const total = ch.quiz.length;
    const needed = Math.ceil(total * PASS_RATE);
    beginBattle({ mode: "chapter", chapterId: ch.id, title: `第${ch.no}章 ${ch.title}`, bossName: ch.boss.name, questions: shuffle(ch.quiz), needed, maxWrong: total - needed });
  }

  function startFinal() {
    const pool = shuffle(chapters.flatMap((ch) => ch.quiz));
    const picked = [];
    // 全章から偏りなく拾うため、章ごとに最低2問を先に確保する
    for (const ch of chapters) picked.push(...shuffle(ch.quiz).slice(0, 2));
    for (const q of pool) {
      if (picked.length >= FINAL_SIZE) break;
      if (!picked.includes(q)) picked.push(q);
    }
    const questions = shuffle(picked.slice(0, FINAL_SIZE));
    const needed = Math.ceil(questions.length * FINAL_PASS_RATE);
    beginBattle({ mode: "final", title: "最終試験", bossName: "ディストーション・ドラゴン", questions, needed, maxWrong: questions.length - needed });
  }

  function startReview() {
    const ids = wrongIds();
    if (!ids.length) {
      ask("復習待ちの問題は ありません。ボス戦で間違えた問題が ここに たまっていきます。");
      return;
    }
    const questions = shuffle(ids).slice(0, REVIEW_SIZE).map((id) => questionById.get(id));
    beginBattle({ mode: "review", title: "復習ダンジョン", bossName: "忘却のミミック", questions, needed: questions.length, maxWrong: Infinity });
  }

  function beginBattle(config) {
    battle = { ...config, index: 0, correct: 0, wrong: 0, log: [], view: null, answered: false, finished: false, defeated: false, xpGained: 0 };
    prepareQuestion();
    go("#/battle");
  }

  function prepareQuestion() {
    const q = battle.questions[battle.index];
    const view = { selected: new Set(), choice: null };
    if (q.type === "choice" || q.type === "multi") view.order = shuffle(range(q.choices.length));
    if (q.type === "order") {
      let order = shuffle(range(q.items.length));
      while (q.items.length > 1 && order.every((v, i) => v === i)) order = shuffle(order);
      view.order = order;
    }
    if (q.type === "match") {
      view.right = shuffle(range(q.pairs.length));
      view.picks = q.pairs.map(() => "");
    }
    battle.view = view;
    battle.answered = false;
  }

  function battleSprite() {
    if (battle.mode === "final") return (STORY.final && STORY.final.sprite) || "🐉";
    if (battle.mode === "review") return "📦";
    return storyOf(chapterById.get(battle.chapterId)).sprite;
  }

  function renderBattle() {
    const q = battle.questions[battle.index];
    const total = battle.questions.length;
    const isReview = battle.mode === "review";
    const hp = Math.max(0, battle.needed - battle.correct);
    const lives = battle.maxWrong + 1;
    const left = isReview ? 0 : Math.max(0, lives - battle.wrong);

    const scene = el(
      "section",
      { class: `battle-scene${hp === 0 ? " is-down" : ""}`, "aria-label": "戦況" },
      el(
        "div",
        { class: "enemy" },
        el(
          "div",
          { class: "info-box enemy-info" },
          el("p", { class: "eyebrow" }, battle.title),
          el("strong", { class: "boss-name" }, hp === 0 ? `${battle.bossName}（撃破！）` : battle.bossName),
          el("div", { class: "hp", role: "img", "aria-label": `ボスの残りHP ${hp}/${battle.needed}` }, el("span", { style: `width:${(hp / battle.needed) * 100}%` }))
        ),
        el("div", { class: "enemy-sprite", "aria-hidden": "true" }, battleSprite())
      ),
      el(
        "div",
        { class: "player" },
        el(
          "div",
          { class: "info-box player-info" },
          el("strong", {}, `${playerName()}　Lv${levelOf(state.xp)}`),
          isReview
            ? el("p", { class: "muted small" }, "練習モード（ライフ無制限）")
            : [
                el("div", { class: "hp hp-player", role: "img", "aria-label": `残りライフ ${left}/${lives}` }, el("span", { style: `width:${(left / lives) * 100}%` })),
                el("span", { class: "hearts", "aria-label": `残りライフ ${left}` }, "♥".repeat(left) + "♡".repeat(lives - left))
              ],
          el("span", { class: "qcount" }, `Q ${battle.index + 1}/${total}`)
        )
      )
    );

    const msg = messageWindow([battle.index === 0 ? `${battle.bossName}が あらわれた！` : `${playerName()}は どうする？`], "battle-msg");

    const chapter = chapterById.get(q.chapterId);
    const qCard = el(
      "section",
      { class: "question-card" },
      el("p", { class: "eyebrow" }, `${TYPE_LABELS[q.type]}${battle.mode !== "chapter" ? ` ／ 第${chapter.no}章 ${chapter.title}` : ""}`),
      el("h1", { class: "question", tabindex: "-1" }, rich(q.q)),
      q.code ? el("pre", { class: "code" }, el("code", {}, q.code)) : null,
      el("div", { class: "answer-area" }, renderAnswerUI(q)),
      el("div", { class: "feedback", id: "feedback", "aria-live": "polite" })
    );

    mount(scene, msg, qCard, el("div", { class: "actions" }, button("にげる（撤退する）", retreat, "btn btn-ghost")));
  }

  function retreat() {
    const leave = () => {
      const ch = battle.chapterId ? chapterById.get(battle.chapterId) : null;
      battle = null;
      go(ch ? `#/ch/${ch.id}` : "#/");
    };
    if (battle.log.length) ask("にげると、このバトルの結果は記録されません。にげますか？", leave, "にげる");
    else leave();
  }

  function renderAnswerUI(q) {
    const v = battle.view;
    if (q.type === "choice") {
      return el(
        "div",
        { class: "choices" },
        v.order.map((idx, i) => el("button", { type: "button", class: "choice", "data-idx": String(idx), onclick: () => submit(idx) }, el("span", { class: "key" }, String(i + 1)), el("span", {}, rich(q.choices[idx]))))
      );
    }
    if (q.type === "multi") {
      const wrap = el(
        "div",
        { class: "choices" },
        v.order.map((idx) =>
          el(
            "button",
            {
              type: "button",
              class: "choice is-toggle",
              "data-idx": String(idx),
              "aria-pressed": "false",
              onclick: (e) => {
                if (battle.answered) return;
                const on = !v.selected.has(idx);
                on ? v.selected.add(idx) : v.selected.delete(idx);
                e.currentTarget.setAttribute("aria-pressed", String(on));
              }
            },
            el("span", { class: "check", "aria-hidden": "true" }),
            el("span", {}, rich(q.choices[idx]))
          )
        )
      );
      return [wrap, submitButton(() => submit([...v.selected]))];
    }
    if (q.type === "order") {
      const list = el("ol", { class: "order-list" });
      const draw = () => {
        list.replaceChildren(
          ...v.order.map((idx, pos) =>
            el(
              "li",
              { class: "order-item", "data-idx": String(idx) },
              el("span", { class: "order-text" }, rich(q.items[idx])),
              el(
                "span",
                { class: "order-btns" },
                el("button", { type: "button", class: "mini", "aria-label": "上へ", disabled: pos === 0 || battle.answered, onclick: () => move(pos, -1) }, "↑"),
                el("button", { type: "button", class: "mini", "aria-label": "下へ", disabled: pos === v.order.length - 1 || battle.answered, onclick: () => move(pos, 1) }, "↓")
              )
            )
          )
        );
      };
      const move = (pos, delta) => {
        const target = pos + delta;
        [v.order[pos], v.order[target]] = [v.order[target], v.order[pos]];
        draw();
        const btn = list.children[target] && list.children[target].querySelectorAll("button")[delta < 0 ? 0 : 1];
        if (btn && !btn.disabled) btn.focus();
      };
      v.redraw = draw;
      draw();
      return [list, submitButton(() => submit(v.order.slice()))];
    }
    if (q.type === "input") {
      const input = el("input", { type: "text", class: "text-input", id: "answer-input", autocomplete: "off", spellcheck: "false", placeholder: q.placeholder || "答えを入力", "aria-label": "解答" });
      input.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && !e.isComposing && !battle.answered) {
          e.preventDefault();
          e.stopPropagation();
          submit(input.value);
        }
      });
      setTimeout(() => input.focus(), 0);
      return [input, submitButton(() => submit(input.value))];
    }
    if (q.type === "spot") {
      const list = el(
        "div",
        { class: `spot-list${q.mono === false ? "" : " is-mono"}` },
        q.lines.map((line, idx) =>
          el(
            "button",
            {
              type: "button",
              class: "spot-line",
              "data-idx": String(idx),
              "aria-pressed": "false",
              onclick: (e) => {
                if (battle.answered) return;
                const on = !v.selected.has(idx);
                on ? v.selected.add(idx) : v.selected.delete(idx);
                e.currentTarget.setAttribute("aria-pressed", String(on));
              }
            },
            el("span", { class: "ln", "aria-hidden": "true" }, String(idx + 1)),
            el("span", { class: "spot-text" }, line === "" ? " " : line)
          )
        )
      );
      return [el("p", { class: "hint" }, "該当する行をタップして選び、「決定」を押す。"), list, submitButton(() => submit([...v.selected]))];
    }
    if (q.type === "match") {
      const rows = el(
        "div",
        { class: "match-list" },
        q.pairs.map(([left], i) => {
          const select = el(
            "select",
            {
              class: "match-select",
              "data-row": String(i),
              "aria-label": `${left} に対応するもの`,
              onchange: (e) => {
                v.picks[i] = e.target.value;
              }
            },
            el("option", { value: "" }, "選んでください"),
            v.right.map((r) => el("option", { value: String(r) }, q.pairs[r][1]))
          );
          return el("div", { class: "match-row" }, el("span", { class: "match-left" }, rich(left)), select);
        })
      );
      return [
        rows,
        submitButton(() => {
          if (v.picks.some((p) => p === "")) {
            ask("すべての項目を選んでから決定してください。");
            return;
          }
          submit(v.picks.map(Number));
        })
      ];
    }
    return el("p", {}, "未対応の問題形式です。");
  }

  function submitButton(onclick) {
    return el("div", { class: "submit-row" }, el("button", { type: "button", class: "btn btn-primary submit", onclick }, "決定"));
  }

  function normalize(text) {
    return String(text).normalize("NFKC").toLowerCase().replace(/\s+/g, "");
  }

  function sameSet(a, b) {
    const sa = new Set(a);
    return sa.size === new Set(b).size && [...sa].every((x) => b.includes(x));
  }

  function judge(q, answer) {
    switch (q.type) {
      case "choice":
        return answer === q.answer;
      case "multi":
      case "spot":
        return sameSet(answer, q.answer);
      case "order":
        return answer.every((v, i) => v === i);
      case "input":
        return q.answer.map(normalize).includes(normalize(answer));
      case "match":
        return answer.every((v, i) => v === i);
      default:
        return false;
    }
  }

  function submit(answer) {
    if (battle.answered) return;
    const q = battle.questions[battle.index];
    if (q.type === "input" && normalize(answer) === "") return;
    battle.answered = true;
    const ok = judge(q, answer);
    battle.log.push({ id: q.id, ok });
    if (ok) {
      battle.correct += 1;
      battle.xpGained += XP_CORRECT;
    } else {
      battle.wrong += 1;
    }
    trackReview(q.id, ok);
    const tally = state.qs[q.chapterId] || { a: 0, k: 0 };
    state.qs[q.chapterId] = { a: tally.a + 1, k: tally.k + (ok ? 1 : 0) };
    revealAnswer(q, answer, ok);
  }

  function trackReview(id, ok) {
    if (!ok) {
      state.wrong[id] = { streak: 0 };
      return;
    }
    if (!state.wrong[id]) return;
    const streak = (state.wrong[id].streak || 0) + 1;
    if (streak >= REVIEW_GRADUATE_STREAK) {
      delete state.wrong[id];
      state.grad += 1;
    }
    else state.wrong[id] = { streak };
  }

  function revealAnswer(q, answer, ok) {
    const area = app.querySelector(".answer-area");
    area.classList.add("is-answered");
    area.querySelectorAll("button, select, input").forEach((node) => {
      node.disabled = true;
    });

    if (q.type === "choice" || q.type === "multi") {
      const correct = q.type === "choice" ? [q.answer] : q.answer;
      const chosen = q.type === "choice" ? [answer] : answer;
      area.querySelectorAll(".choice").forEach((node) => {
        const idx = Number(node.dataset.idx);
        if (correct.includes(idx)) node.classList.add("is-correct");
        else if (chosen.includes(idx)) node.classList.add("is-wrong");
      });
    } else if (q.type === "spot") {
      area.querySelectorAll(".spot-line").forEach((node) => {
        const idx = Number(node.dataset.idx);
        if (q.answer.includes(idx)) node.classList.add("is-correct");
        else if (answer.includes(idx)) node.classList.add("is-wrong");
      });
    } else if (q.type === "order") {
      area.querySelectorAll(".order-item").forEach((node, pos) => {
        node.classList.add(Number(node.dataset.idx) === pos ? "is-correct" : "is-wrong");
      });
    } else if (q.type === "match") {
      area.querySelectorAll(".match-select").forEach((node) => {
        const row = Number(node.dataset.row);
        node.closest(".match-row").classList.add(answer[row] === row ? "is-correct" : "is-wrong");
      });
    } else if (q.type === "input") {
      area.querySelector("input").classList.add(ok ? "is-correct" : "is-wrong");
    }

    const fb = app.querySelector("#feedback");
    const total = battle.questions.length;
    const isReview = battle.mode === "review";
    const defeated = !isReview && battle.wrong > battle.maxWrong;
    const bossDown = !isReview && ok && battle.correct === battle.needed;
    const last = battle.index + 1 >= total;

    const name = playerName();
    let action;
    if (isReview) action = ok ? "せいかい！ きおくが よみがえった！" : "ミミックに かみつかれた！ この問題は また出てくる。";
    else if (ok) action = `${name}の こうげき！ ${bossDown ? `${battle.bossName}を たおした！` : `かいしんの いちげき！ ${battle.bossName}に ダメージを あたえた！`}`;
    else action = `${battle.bossName}の こうげき！ ${name}は ダメージを うけた！`;
    const msgLine = app.querySelector(".battle-msg .msg-line");
    if (msgLine) msgLine.textContent = action;

    fb.className = `feedback ${ok ? "is-ok" : "is-ng"}`;
    fb.append(
      ...[
        el("p", { class: "verdict" }, ok ? "⭕ 正解！" : "✖ 不正解…"),
        !ok ? correctAnswerView(q) : null,
        el("div", { class: "explain" }, el("p", { class: "label" }, "解説"), el("p", {}, rich(q.exp))),
        bossDown && !last ? el("p", { class: "bossdown" }, `${battle.bossName}を たおした！ 残りの問題は追撃（★の評価に影響）。`) : null,
        defeated ? el("p", { class: "defeat" }, `${name}は ちからつきた… 講義を見直して再挑戦しよう。`) : null,
        el(
          "div",
          { class: "submit-row" },
          el("button", { type: "button", class: "btn btn-primary next", onclick: () => advance(defeated) }, defeated || last ? "結果を見る" : "次の問題へ →")
        )
      ].filter(Boolean)
    );

    // 上部の HP・ライフ表示も更新する
    const hp = Math.max(0, battle.needed - battle.correct);
    const bar = app.querySelector(".enemy-info .hp > span");
    if (bar) bar.style.width = `${(hp / battle.needed) * 100}%`;
    const hpBox = app.querySelector(".enemy-info .hp");
    if (hpBox) hpBox.setAttribute("aria-label", `ボスの残りHP ${hp}/${battle.needed}`);
    if (hp === 0) app.querySelector(".battle-scene").classList.add("is-down");
    const lives = battle.maxWrong + 1;
    const left = Math.max(0, lives - battle.wrong);
    const hearts = app.querySelector(".hearts");
    if (hearts) {
      hearts.textContent = "♥".repeat(left) + "♡".repeat(lives - left);
      hearts.setAttribute("aria-label", `残りライフ ${left}`);
    }
    const playerBar = app.querySelector(".hp-player > span");
    if (playerBar) {
      playerBar.style.width = `${(left / lives) * 100}%`;
      playerBar.parentElement.setAttribute("aria-label", `残りライフ ${left}/${lives}`);
    }
    if (ok) app.querySelector(".enemy-sprite").classList.add("is-hit");
    else app.querySelector(".question-card").classList.add("shake");

    fb.querySelector(".next").focus({ preventScroll: true });
    fb.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "nearest" });
  }

  function correctAnswerView(q) {
    let content;
    if (q.type === "choice") content = el("p", {}, rich(q.choices[q.answer]));
    else if (q.type === "multi") content = el("ul", {}, q.answer.map((i) => el("li", {}, rich(q.choices[i]))));
    else if (q.type === "order") content = el("ol", {}, q.items.map((item) => el("li", {}, rich(item))));
    else if (q.type === "input") content = el("p", {}, el("code", {}, q.answer[0]));
    else if (q.type === "spot") content = el("p", {}, `${q.answer.map((i) => i + 1).join("・")} 行目`);
    else if (q.type === "match") content = el("ul", {}, q.pairs.map(([l, r]) => el("li", {}, rich(l), " → ", r)));
    return el("div", { class: "correct-answer" }, el("p", { class: "label" }, "正解"), content);
  }

  function advance(defeated) {
    if (defeated) {
      battle.defeated = true;
      return finishBattle();
    }
    battle.index += 1;
    if (battle.index >= battle.questions.length) return finishBattle();
    prepareQuestion();
    render();
  }

  function finishBattle() {
    const b = battle;
    b.finished = true;
    const total = b.questions.length;
    const rate = b.correct / total;
    const prevRank = rankTitle();
    const prevLevel = levelOf(state.xp);
    const day = today();
    let cleared = false;
    let stars = 0;
    let bonus = 0;
    let firstClear = false;
    let item = null;

    if (b.mode === "chapter") {
      const ch = chapterById.get(b.chapterId);
      const p = progressOf(ch);
      cleared = !b.defeated && rate >= PASS_RATE;
      stars = cleared ? (rate === 1 ? 3 : rate >= 0.9 ? 2 : 1) : 0;
      if (cleared && !p.cleared) {
        firstClear = true;
        bonus += XP_FIRST_CLEAR;
        item = storyOf(ch).item;
      }
      if (stars > (p.stars || 0)) bonus += (stars - (p.stars || 0)) * XP_PER_NEW_STAR;
      updateProgress(ch, { read: true, cleared: p.cleared || cleared, best: Math.max(p.best || 0, rate), stars: Math.max(p.stars || 0, stars), tries: (p.tries || 0) + 1, date: p.date || (cleared ? day : "") });
    } else if (b.mode === "final") {
      cleared = !b.defeated && rate >= FINAL_PASS_RATE;
      if (cleared && !state.final.cleared) {
        firstClear = true;
        bonus += 300;
        state.final.date = new Date().toISOString().slice(0, 10);
      }
      state.final = { ...state.final, cleared: state.final.cleared || cleared, best: Math.max(state.final.best || 0, rate) };
    } else {
      cleared = true;
    }

    b.xpGained += bonus;
    state.xp += b.xpGained;
    if (!state.start) state.start = day;
    state.log.push({ d: day, m: b.mode === "chapter" ? "c" : b.mode === "final" ? "f" : "r", c: b.chapterId || "", n: Math.max(1, b.log.length), k: b.correct, x: b.xpGained, w: cleared });
    if (state.log.length > LOG_MAX) state.log = state.log.slice(-LOG_MAX);
    const newLevel = levelOf(state.xp);
    for (let lv = prevLevel + 1; lv <= newLevel; lv += 1) state.levels.push({ lv, d: day });
    save();
    const newRank = rankTitle();
    lastResult = { battle: b, rate, cleared, stars, firstClear, item, prevLevel, newLevel, rankUp: newRank !== prevRank ? newRank : null };
    battle = null;
    go("#/result");
  }

  // ---------- 結果 ----------

  function renderResult() {
    const { battle: b, rate, cleared, stars, firstClear, item, prevLevel, newLevel, rankUp } = lastResult;
    const ch = b.chapterId ? chapterById.get(b.chapterId) : null;
    const nextIdx = ch ? chapters.indexOf(ch) + 1 : -1;
    const next = nextIdx > 0 && nextIdx < chapters.length ? chapters[nextIdx] : null;
    const answered = new Map(b.log.map((entry) => [entry.id, entry.ok]));
    let title;
    if (b.mode === "review") title = "復習完了";
    else if (cleared) title = b.mode === "final" ? "最終試験 合格！" : "ボス撃破！";
    else title = "敗北…";

    const name = playerName();
    const lines = [];
    if (b.mode === "review") lines.push(`${b.bossName}との 練習を おえた。`);
    else lines.push(cleared ? `${b.bossName}を たおした！` : `${name}は ちからつきた……`);
    lines.push(`${b.xpGained}ポイントの けいけんちを かくとく！`);
    if (newLevel > prevLevel) {
      lines.push(`${name}の レベルが ${newLevel}に あがった！`);
      lines.push(`さいだいHPが ${maxHp(newLevel) - maxHp(prevLevel)}、さいだいMPが ${maxMp(newLevel) - maxMp(prevLevel)} あがった！`);
    }
    if (item) lines.push(`${name}は「${item[0]}」を てにいれた！`);
    if (rankUp) lines.push(`称号が「${rankUp}」に かわった！`);
    let talk = null;
    if (ch && cleared) talk = dialog(storyOf(ch).victory, true);
    else if (b.mode !== "review" && !cleared) talk = dialog([["シノ先生", "大丈夫。間違えた問題は復習ダンジョンに送られた。講義を見直して、もう一度挑もう。"]], true);

    mount(
      heading(title, b.title),
      messageWindow(lines, "result-msg"),
      talk,
      el(
        "section",
        { class: `result-card ${cleared ? "is-win" : "is-lose"}` },
        el("p", { class: "score" }, `${b.correct} / ${b.questions.length} 正解（${Math.round(rate * 100)}%）`),
        b.mode === "chapter" && cleared ? el("p", { class: "stars", "aria-label": `星${stars}個` }, starText(stars)) : null,
        el("p", {}, `獲得 XP：+${b.xpGained}${firstClear ? "（初回撃破ボーナス込み）" : ""}`),
        !cleared && b.mode === "chapter" ? el("p", {}, `撃破には ${Math.ceil(b.questions.length * PASS_RATE)}問以上の正解が必要。間違えた問題は復習ダンジョンに送られた。`) : null,
        !cleared && b.mode === "final" ? el("p", {}, `合格ラインは ${Math.ceil(b.questions.length * FINAL_PASS_RATE)}問。苦手な章を復習してから再挑戦しよう。`) : null,
        b.mode === "chapter" && cleared && stars < 3 ? el("p", { class: "muted" }, "全問正解で★3。間違えた問題は復習ダンジョンで2回連続正解すると卒業できる。") : null
      ),
      el(
        "div",
        { class: "actions" },
        b.mode === "final" && cleared ? link(firstClear ? "エンディングを見る" : "修了証を見る", firstClear ? "#/ending" : "#/certificate", "btn btn-gold") : null,
        ch && cleared && next ? link(`次の章へ：${next.title}`, `#/ch/${next.id}`, "btn btn-primary") : null,
        ch && cleared && !next && finalUnlocked() && !state.final.cleared ? link("ゆがみの塔へ（最終試験）", "#/tower", "btn btn-gold") : null,
        ch ? button("もう一度戦う", () => startChapterBattle(ch), cleared ? "btn" : "btn btn-primary") : null,
        ch && !cleared ? link("講義を見直す", `#/ch/${ch.id}/1`, "btn") : null,
        b.mode === "final" && !cleared ? button("もう一度受ける", startFinal, "btn btn-primary") : null,
        b.mode === "review" && wrongIds().length ? button("続けて復習する", startReview, "btn btn-primary") : null,
        link("つよさを見る", "#/status", "btn"),
        link("マップへ", "#/", "btn btn-ghost")
      ),
      el("h2", { class: "section-title" }, "振り返り"),
      el(
        "ol",
        { class: "review-list" },
        b.questions.map((q) => {
          const status = answered.has(q.id) ? (answered.get(q.id) ? "ok" : "ng") : "skip";
          const mark = status === "ok" ? "○" : status === "ng" ? "×" : "－";
          return el(
            "li",
            { class: `review-item is-${status}` },
            el(
              "details",
              { open: status === "ng" },
              el("summary", {}, el("span", { class: "mark", "aria-label": status === "ok" ? "正解" : status === "ng" ? "不正解" : "未回答" }, mark), el("span", {}, rich(q.q))),
              correctAnswerView(q),
              el("p", { class: "explain-text" }, rich(q.exp)),
              b.mode !== "chapter" && status !== "ok" && isUnlocked(chapterById.get(q.chapterId))
                ? el("p", { class: "explain-link" }, el("a", { href: `#/ch/${q.chapterId}` }, `第${chapterById.get(q.chapterId).no}章「${chapterById.get(q.chapterId).title}」の講義を見直す →`))
                : null
            )
          );
        })
      )
    );
  }

  // ---------- つよさ（ステータス）・成長の記録 ----------

  function renderStatus() {
    const lv = levelOf(state.xp);
    const items = chapters.filter((ch) => progressOf(ch).cleared && storyOf(ch).item).map((ch) => storyOf(ch).item);
    const base = expForLevel(lv);
    const nextAt = expForLevel(lv + 1);
    const pct = lv >= LEVEL_MAX ? 100 : ((state.xp - base) / (nextAt - base)) * 100;
    const statusWin = el(
      "section",
      { class: "statuswin status-full", "aria-label": "つよさ" },
      el("p", { class: "sw-name" }, playerName()),
      el("p", { class: "sw-rank" }, `称号：${rankTitle()}`),
      el(
        "dl",
        { class: "sw-grid sw-wide" },
        swRow("レベル", lv),
        swRow("さいだいHP", maxHp(lv)),
        swRow("さいだいMP", maxMp(lv)),
        swRow("けいけんち", state.xp),
        swRow("つぎのLvまで", lv >= LEVEL_MAX ? "—" : nextAt - state.xp)
      ),
      expBar(pct),
      el("h2", {}, "のうりょく"),
      el(
        "dl",
        { class: "abilities" },
        abilities().map((a) =>
          el(
            "div",
            { class: "ability" },
            el("dt", {}, a.label),
            el("dd", {}, el("span", { class: "ability-num" }, String(a.value)), el("span", { class: "ability-bar", "aria-hidden": "true" }, el("span", { style: `width:${a.value}%` })), el("span", { class: "ability-note" }, a.note))
          )
        )
      )
    );
    const itemWin = el(
      "section",
      { class: "statuswin" },
      el("h2", {}, `だいじなもの（${items.length}/${chapters.length}）`),
      items.length
        ? el("ul", { class: "item-list" }, items.map(([n, d]) => el("li", {}, el("strong", {}, n), el("span", {}, d))))
        : el("p", { class: "muted" }, "まだ何も持っていない。霧の主を倒すと手に入る。")
    );
    mount(heading("つよさ", "STATUS ／ ぼうけんのきろく"), statusWin, growthSection(), itemWin, chapterRecords(), el("div", { class: "actions" }, link("マップへ", "#/", "btn btn-ghost")));
  }

  function growthSection() {
    const day = today();
    const days = playDays();
    const start = state.start || days[0] || "";
    const elapsed = start ? daysBetween(start, day) + 1 : 0;
    const last7 = state.log.filter((e) => daysBetween(e.d, day) < 7).reduce((s, e) => s + e.x, 0);
    const perDay = days.length ? Math.round(state.xp / days.length) : 0;
    const answered = Object.values(state.qs).reduce((s, v) => s + v.a, 0);
    const right = Object.values(state.qs).reduce((s, v) => s + v.k, 0);
    const lv = levelOf(state.xp);
    const toNext = lv >= LEVEL_MAX ? 0 : expForLevel(lv + 1) - state.xp;
    const remaining = chapters.length - clearedCount();
    const clearPace = days.length ? clearedCount() / days.length : 0;

    const forecast = [];
    if (!state.log.length) forecast.push("まだ記録がない。ボスと戦うと、ここに成長の記録が残っていく。");
    if (toNext && last7 > 0) forecast.push(`直近7日のペース（1日あたり ${Math.round(last7 / 7)} EXP）なら、つぎのレベルまで あと約${Math.max(1, Math.ceil(toNext / (last7 / 7)))}日。`);
    if (remaining > 0 && clearPace > 0) forecast.push(`これまでの撃破ペース（学習した日1日あたり ${clearPace.toFixed(1)}章）なら、全${chapters.length}章の撃破まで あと約${Math.ceil(remaining / clearPace)}学習日。`);
    if (!remaining && state.log.length) forecast.push(state.final.cleared ? "全章撃破・最終試験合格。あとは★と復習で記憶を固めよう。" : "全章撃破！ ゆがみの塔（最終試験）が待っている。");

    const levelLog = state.levels.slice(-6).reverse();
    return el(
      "section",
      { class: "panel growth" },
      el("h2", {}, "せいちょうのきろく"),
      el(
        "div",
        { class: "status-grid growth-grid" },
        statBox("冒険の日数", elapsed ? `${elapsed}日目` : "—"),
        statBox("学習した日", `${days.length}日`),
        statBox("連続学習", `${currentStreak()}日`),
        statBox("1学習日あたり", `${perDay} EXP`),
        statBox("直近7日", `${last7} EXP`),
        statBox("総解答・正答率", answered ? `${answered}問・${Math.round((right / answered) * 100)}%` : "0問")
      ),
      messageWindow(forecast, "msg-forecast"),
      expChart(day),
      accuracyChart(),
      el("h3", {}, "レベルアップの足あと"),
      levelLog.length
        ? el("ol", { class: "level-log" }, levelLog.map((e) => el("li", {}, el("strong", {}, `Lv${e.lv}`), ` に到達 — ${dateText(e.d)}${start ? `（冒険${daysBetween(start, e.d) + 1}日目）` : ""}`)))
        : el("p", { class: "muted" }, "最初のボスを倒すと、レベルが上がり始める。")
    );
  }

  function expChart(day) {
    const data = range(14).map((i) => {
      const d = shiftDate(day, i - 13);
      const entries = state.log.filter((e) => e.d === d);
      return { label: dateText(d), value: entries.reduce((s, e) => s + e.x, 0), detail: entries.length ? `${entries.length}戦` : "学習なし" };
    });
    const max = Math.max(...data.map((d) => d.value));
    return barChart({ title: "1日ごとの獲得EXP", caption: "直近14日", data, max: max || 1, format: (v) => `${v} EXP` });
  }

  function accuracyChart() {
    const recent = state.log.slice(-20);
    const modeName = { c: "ボス戦", r: "復習", f: "最終試験" };
    const data = recent.map((e) => ({
      label: dateText(e.d),
      value: Math.round((e.k / e.n) * 100),
      detail: `${e.c ? `第${chapterById.get(e.c).no}章 ` : ""}${modeName[e.m]} ${e.k}/${e.n}問${e.m === "c" ? (e.w ? "・撃破" : "・敗北") : ""}`
    }));
    if (!data.length) return null;
    return barChart({ title: "バトルごとの正答率", caption: `直近${data.length}戦`, data, max: 100, format: (v) => `${v}%`, reference: { value: PASS_RATE * 100, label: `撃破ライン ${PASS_RATE * 100}%` } });
  }

  // 1系列の棒グラフ。数値は最大値と最新値だけ棒の上に出し、ほかはホバー／フォーカスと表で読めるようにする
  function barChart({ title, caption, data, max, format, reference }) {
    const readout = el("p", { class: "chart-readout", "aria-live": "polite" }, "棒にカーソルを合わせる（またはタブで選ぶ）と値が出る");
    const peak = data.reduce((m, d, i) => (d.value > data[m].value ? i : m), 0);
    const plot = el("div", { class: "chart-plot" });
    if (reference) plot.append(el("div", { class: "chart-ref", style: `bottom:${(reference.value / max) * 100}%`, "aria-hidden": "true" }));
    data.forEach((d, i) => {
      const show = () => {
        readout.textContent = `${d.label}：${format(d.value)}（${d.detail}）`;
      };
      const labeled = d.value > 0 && (i === peak || i === data.length - 1);
      plot.append(
        el(
          "div",
          { class: "chart-col", tabindex: "0", "aria-label": `${d.label} ${format(d.value)} ${d.detail}`, onmouseenter: show, onfocus: show },
          labeled ? el("span", { class: "chart-label" }, format(d.value)) : null,
          el("span", { class: "chart-bar", style: `height:${(d.value / max) * 100}%` })
        )
      );
    });
    const mid = Math.floor((data.length - 1) / 2);
    const axis = el("div", { class: "chart-axis", "aria-hidden": "true" }, data.map((d, i) => el("span", {}, i === 0 || i === mid || i === data.length - 1 ? d.label : "")));
    const table = el(
      "details",
      { class: "chart-table" },
      el("summary", {}, "表で見る"),
      el("table", {}, el("tbody", {}, data.map((d) => el("tr", {}, el("th", { scope: "row" }, d.label), el("td", {}, format(d.value)), el("td", {}, d.detail)))))
    );
    return el("figure", { class: "chart" }, el("figcaption", {}, el("strong", {}, title), el("span", { class: "muted small" }, ` ${caption}${reference ? `（点線＝${reference.label}）` : ""}`)), plot, axis, readout, table);
  }

  function chapterRecords() {
    return el(
      "section",
      { class: "panel" },
      el("h2", {}, "章ごとのきろく"),
      el(
        "div",
        { class: "table-wrap" },
        el(
          "table",
          { class: "records" },
          el("thead", {}, el("tr", {}, ["章", "最高", "★", "挑戦", "初撃破"].map((h) => el("th", { scope: "col" }, h)))),
          el(
            "tbody",
            {},
            chapters.map((ch) => {
              const p = progressOf(ch);
              return el(
                "tr",
                { class: p.cleared ? "is-cleared" : "" },
                el("th", { scope: "row" }, `${ch.no}. ${ch.title}`),
                el("td", {}, p.tries ? `${Math.round(p.best * 100)}%` : "—"),
                el("td", {}, p.cleared ? starText(p.stars) : "—"),
                el("td", {}, p.tries ? `${p.tries}回` : "—"),
                el("td", {}, p.date ? dateText(p.date) : "—")
              );
            })
          )
        )
      )
    );
  }

  // ---------- 用語図鑑 ----------

  function renderGlossary() {
    const allTerms = chapters.reduce((s, ch) => s + ch.terms.length, 0);
    const unlocked = chapters.filter(termsUnlocked).reduce((s, ch) => s + ch.terms.length, 0);
    const search = el("input", { type: "search", class: "text-input", placeholder: "用語を検索（例：愛着、強化）", "aria-label": "用語を検索" });
    const list = el("div", { class: "glossary" });

    const draw = () => {
      const query = normalize(search.value);
      list.replaceChildren();
      for (const ch of chapters) {
        if (!termsUnlocked(ch)) {
          if (!query) list.append(el("section", { class: "gloss-group is-locked" }, el("h2", {}, `第${ch.no}章 ${ch.title}`), el("p", { class: "muted" }, `🔒 ${ch.terms.length}語 — この章の講義を最後まで読むと解放`)));
          continue;
        }
        const terms = ch.terms.filter(([t, d]) => !query || normalize(t).includes(query) || normalize(d).includes(query));
        if (!terms.length) continue;
        list.append(
          el(
            "section",
            { class: "gloss-group" },
            el("h2", {}, el("a", { href: `#/ch/${ch.id}` }, `第${ch.no}章 ${ch.title}`)),
            el("dl", {}, terms.map(([t, d]) => [el("dt", {}, t), el("dd", {}, rich(d))]))
          )
        );
      }
      if (!list.children.length) list.append(el("p", { class: "muted" }, "該当する用語がありません。"));
    };
    search.addEventListener("input", draw);
    draw();

    mount(heading("用語図鑑", `${unlocked} / ${allTerms} 語を解放`), search, list);
  }

  // ---------- 設定・遊び方 ----------

  function renderSettings() {
    const name = el("input", { type: "text", class: "text-input", maxlength: "24", value: state.name, placeholder: "修了証に載る名前", "aria-label": "プレイヤー名" });
    const free = el("input", { type: "checkbox", id: "free-mode", checked: state.freeMode });
    free.addEventListener("change", () => {
      state.freeMode = free.checked;
      save();
    });
    mount(
      heading("冒険の書", "SETTINGS"),
      el(
        "section",
        { class: "panel" },
        el("h2", {}, "プレイヤー名"),
        el("p", { class: "muted" }, "修了証に表示されます。このブラウザ内にだけ保存されます。"),
        name,
        el("div", { class: "submit-row" }, button("保存", () => {
          state.name = name.value.trim().slice(0, 24);
          save();
          ask(`なまえを「${playerName()}」にしました。`);
        }, "btn btn-primary"))
      ),
      el(
        "section",
        { class: "panel" },
        el("h2", {}, "自由学習モード"),
        el("p", { class: "muted" }, "全章を最初から解放します。経験者が苦手分野だけ攻略したいとき向け。最終試験は全章撃破まで解放されません。"),
        el("label", { class: "toggle", for: "free-mode" }, free, el("span", {}, "全章を解放する"))
      ),
      renderTransfer(),
      el(
        "section",
        { class: "panel danger" },
        el("h2", {}, "データの初期化"),
        el("p", { class: "muted" }, "進捗・XP・復習リスト・修了記録をすべて消します。元に戻せません。"),
        button("すべての進捗を消す", () => {
          ask("ぼうけんのしょが きえてしまいます。本当に すべての進捗を消しますか？（取り消せません）", () => {
            state = defaultState();
            save();
            go("#/");
          }, "消す");
        }, "btn btn-danger")
      )
    );
  }

  function renderTransfer() {
    const out = el("textarea", { class: "text-input code-box", readonly: true, rows: "3", placeholder: "ここに書き出したコードが表示される", "aria-label": "書き出したセーブコード" });
    const input = el("textarea", { class: "text-input code-box", rows: "3", placeholder: "PQ1. で始まるコードを貼り付け", "aria-label": "読み込むセーブコード" });
    const status = el("p", { class: "muted", "aria-live": "polite" });
    return el(
      "section",
      { class: "panel" },
      el("h2", {}, "セーブデータの引っ越し"),
      el("p", { class: "muted" }, "スマホとPCなど別の端末で続きを遊ぶとき用。コードを書き出して、移動先の端末の「読み込む」に貼り付ける。通信はせず、コードの中身は進捗データだけ。"),
      el(
        "div",
        { class: "submit-row transfer-row" },
        button("コードを書き出す", async () => {
          out.value = exportCode();
          out.select();
          try {
            await navigator.clipboard.writeText(out.value);
            status.textContent = "コピーしました。移動先の端末に貼り付けてください。";
          } catch {
            status.textContent = "表示されたコードを選択してコピーしてください。";
          }
        })
      ),
      out,
      input,
      el(
        "div",
        { class: "submit-row" },
        button("読み込む", () => {
          let next;
          try {
            next = importCode(input.value);
          } catch {
            status.textContent = "コードを読み取れませんでした。途中で切れていないか確認してください。";
            return;
          }
          const cleared = chapters.filter((ch) => next.chapters[ch.id] && next.chapters[ch.id].cleared).length;
          ask(`撃破${cleared}章・EXP ${next.xp} のデータで、今の進捗を上書きします。よろしいですか？`, () => {
            state = next;
            save();
            go("#/");
          }, "上書きする");
        }, "btn btn-primary")
      ),
      status
    );
  }

  function renderHelp() {
    mount(
      heading("遊び方", "HOW TO PLAY"),
      el(
        "section",
        { class: "panel prose" },
        el("h2", {}, "ゲームの流れ"),
        el(
          "ol",
          {},
          el("li", {}, "プロローグで名前を決め、ココロの国へ。マップから章（地域）を選び、講義カード「まなびの書」を読む（1章 6枚）。"),
          el("li", {}, `ボス戦に挑む。全問の${PASS_RATE * 100}%以上に正解すると撃破。間違えるとライフが減り、尽きると敗北。`),
          el("li", {}, "撃破すると次の章が解放される。全問正解で★3。"),
          el("li", {}, `全${chapters.length}章を撃破すると最終試験（全範囲から${FINAL_SIZE}問・合格${FINAL_PASS_RATE * 100}%）が解放される。合格で修了証。`)
        ),
        el("h2", {}, "問題の形式"),
        el(
          "ul",
          {},
          el("li", {}, el("strong", {}, "選択："), "1つ選ぶとすぐ判定。キーボードの数字キーでも選べる。"),
          el("li", {}, el("strong", {}, "すべて選べ："), "正しいものを全部選んで「決定」。過不足があると不正解。"),
          el("li", {}, el("strong", {}, "並べ替え："), "↑↓で正しい順序に並べる。"),
          el("li", {}, el("strong", {}, "入力："), "答えを打ち込む。大文字・小文字と空白は区別しない。"),
          el("li", {}, el("strong", {}, "見つけ出せ："), "会話・記事・研究の記述から、問われている行を全部選ぶ。"),
          el("li", {}, el("strong", {}, "組み合わせ："), "左の用語に合う説明を選ぶ。")
        ),
        el("h2", {}, "レベルと「つよさ」"),
        el("p", {}, "正解・初撃破・★でけいけんち（EXP）が入り、レベルが上がる。「つよさ」画面では、レベル・HP・MP、幕ごとの能力値（撃破率と正答率から計算）、手に入れた「だいじなもの」、そして日ごとの獲得EXPやバトルごとの正答率のグラフで、自分の成長の速さを確かめられる。HP・MP は成長の目安で、バトルのライフ（♥）とは別。"),
        el("h2", {}, "復習ダンジョン"),
        el("p", {}, "間違えた問題はすべて復習リストに入る。復習ダンジョンで2回連続正解すると卒業。忘れかけた頃にもう一度解くのが、記憶を定着させるいちばんの近道。"),
        el("h2", {}, "このゲームで届く範囲"),
        el("p", {}, "全章をクリアすると、心理学の主要分野（歴史・研究法・統計・脳と神経・知覚・学習・記憶・思考・感情・発達・人格・社会・健康・精神疾患・心理的支援・応用分野）の「地図」と、研究や事例を前にしたときの判断の軸が手に入る。範囲は心理学検定の10科目と公認心理師試験の出題基準を目安に組んだ。"),
        el("p", {}, "ただし、クイズで届くのは「知識と判断の地図」まで。心理検査の実施や面接・心理療法の技能は、指導者のもとでの実習とスーパービジョンを通してしか身につかない。このゲームを修了しても、他人や自分を診断できるようにはならないし、そうしてはいけない（第15章・第18章）。"),
        el("h2", {}, "つらいときは"),
        el("p", {}, "このゲームは学習用で、診断や治療の代わりにはならない。気分の落ち込みや不安が続いてつらいときは、ひとりで抱えずに医療機関や公的な相談窓口に相談してほしい。"),
        el("ul", {}, resource("まもろうよ こころ（厚生労働省）", "https://www.mhlw.go.jp/mamorouyokokoro/", "電話・SNSの相談窓口の一覧。")),
        el("h2", {}, "このページについて"),
        el("p", {}, "進捗はこのブラウザの localStorage にだけ保存する。Content-Security-Policy で外部スクリプトと外部通信を禁止しており、回答やプレイヤー名がどこかへ送られることはない。登場する大学・人物・相談事例はすべて架空。")
      )
    );
  }

  // ---------- 修了証 ----------

  function renderCertificate() {
    const name = state.name || "名もなき探究者";
    mount(
      el(
        "section",
        { class: "certificate" },
        el("p", { class: "eyebrow" }, "CERTIFICATE OF COMPLETION"),
        el("h1", { tabindex: "-1" }, "修了証"),
        el("p", { class: "cert-name" }, `${name} 殿`),
        el("p", {}, `あなたは心理学クエスト全${chapters.length}章のボスを撃破し、最終試験に合格したことをここに証します。`),
        el("p", { class: "cert-rank" }, `称号：${FINAL_RANK}`),
        el("p", { class: "muted" }, `Lv${levelOf(state.xp)} ／ 最終試験 最高得点 ${Math.round((state.final.best || 0) * 100)}% ／ ★ ${totalStars()}/${chapters.length * 3} ／ ${state.final.date || ""}`),
        el("p", { class: "muted small" }, "※ ゲーム内の記念証です。公的な資格ではなく、心理支援の技能を証明するものでもありません。")
      ),
      el(
        "div",
        { class: "actions no-print" },
        button("印刷する", () => window.print(), "btn"),
        link("マップへ", "#/", "btn btn-ghost")
      ),
      el(
        "section",
        { class: "panel prose no-print" },
        el("h2", {}, "ここから先へ — 地図を手に、実際に歩く"),
        el("p", {}, "地図は手に入った。次は教科書と論文で一次情報に当たる番。研究の結果は更新され続けるので、「有名な実験だから正しい」と思わず、追試やメタ分析まで確かめる習慣をつけてほしい（第2章・第18章）。"),
        el(
          "ul",
          {},
          resource("OpenStax Psychology 2e", "https://openstax.org/details/books/psychology-2e", "無料で読める英語の入門教科書。各章の続きを体系的に。"),
          resource("Noba Project", "https://nobaproject.com/", "研究者が執筆した無料のモジュール教材。分野ごとに深掘りできる。"),
          resource("APA Dictionary of Psychology", "https://dictionary.apa.org/", "アメリカ心理学会の用語辞典。用語図鑑の続きに。"),
          resource("日本心理学会", "https://psych.or.jp/", "国内の学会。倫理規程や一般向けの解説、心理学検定の案内も。"),
          resource("日本心理研修センター", "https://shinri-kenshu.jp/", "公認心理師試験の実施機関。出題基準の確認に（第17章の続き）。")
        )
      )
    );
  }

  function resource(name, url, note) {
    return el("li", {}, el("a", { href: url, target: "_blank", rel: "noreferrer" }, name), ` — ${note}`);
  }

  // ---------- キーボード操作 ----------

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && document.querySelector(".ask-layer")) {
      closeAsk();
      return;
    }
    if (document.querySelector(".ask-layer")) return;
    if (!location.hash.startsWith("#/battle") || !battle) return;
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const q = battle.questions[battle.index];
    if (!battle.answered && q.type === "choice" && /^[1-9]$/.test(e.key)) {
      const idx = battle.view.order[Number(e.key) - 1];
      if (idx !== undefined) submit(idx);
    }
  });

  if (!chapters.length) {
    mount(el("p", {}, "データの読み込みに失敗しました。ページを再読み込みしてください。"));
    return;
  }
  render();
})();
