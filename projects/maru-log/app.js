"use strict";

/*
 * Maru Log — 仕事・副業・趣味・学びの ○△× 記録帳
 *
 * データはすべてこの端末の IndexedDB（DB名 "maru-log"）に置く。外部通信はしない。
 *   days : 1日1件（keyPath = date "YYYY-MM-DD"）
 *          { date, marks: { [itemId]: "o" | "t" | "x" }, memo: { work, side, hobby, study, free }, updatedAt }
 *   meta : "items"（記録する項目の一覧）
 *
 * ○＝できた(2点) △＝少しできた(1点) ×＝できなかった(0点)。空欄は「未記入」で、点数の分母に入れない。
 */
(() => {
  const DB_NAME = "maru-log";
  const DB_VERSION = 1;
  const MARKS = ["o", "t", "x"];
  const MARK_CHAR = { o: "○", t: "△", x: "×" };
  const MARK_WORD = { o: "できた", t: "少し", x: "できなかった" };
  const MARK_POINT = { o: 2, t: 1, x: 0 };

  const CATS = [
    { id: "work", label: "仕事" },
    { id: "side", label: "副業" },
    { id: "hobby", label: "趣味" },
    { id: "study", label: "学び" },
    { id: "mind", label: "心と体" },
  ];
  const CAT_LABEL = Object.fromEntries(CATS.map((c) => [c.id, c.label]));
  const MEMOS = [
    { id: "work", label: "仕事", placeholder: "進んだこと・詰まったこと" },
    { id: "side", label: "副業", placeholder: "作ったもの・発信したもの・反応" },
    { id: "hobby", label: "趣味", placeholder: "楽しんだこと" },
    { id: "study", label: "学び", placeholder: "学んだこと・覚えた表現" },
    { id: "free", label: "ひとこと", placeholder: "気分・感謝・明日いちばんにやること" },
  ];
  const MEMO_LABEL = Object.fromEntries(MEMOS.map((m) => [m.id, m.label]));

  // 初期の項目。手書き日記の重要事項（アウトプット・SNS・英語・瞑想）を中心に、各分野に1つずつ。設定で自由に変えられる。
  const DEFAULT_ITEMS = [
    { id: "output", name: "アウトプット", cat: "side", rule: { o: "1つ仕上げて出した", t: "手をつけた", x: "なし" } },
    { id: "sns", name: "SNS 発信", cat: "side", rule: { o: "投稿した", t: "下書き・反応だけ", x: "なし" } },
    { id: "english", name: "英語", cat: "study", rule: { o: "30分以上", t: "10分ほど", x: "なし" } },
    { id: "meditation", name: "瞑想", cat: "mind", rule: { o: "10分以上", t: "数分", x: "なし" } },
    { id: "work-top", name: "仕事の最重要タスク", cat: "work", rule: { o: "終えた", t: "進めた", x: "手つかず" } },
    { id: "hobby-time", name: "趣味の時間", cat: "hobby", rule: { o: "30分以上楽しんだ", t: "少し", x: "なし" } },
  ].map((i) => ({ ...i, active: true }));

  const state = {
    days: new Map(),
    items: DEFAULT_ITEMS.map((i) => ({ ...i, rule: { ...i.rule } })),
    date: todayStr(),
    month: todayStr().slice(0, 7),
    view: "today",
    range: "7",
    memoFilter: "all",
    memoQuery: "",
    memoLimit: 14,
  };
  let db = null;

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

  /* ---------- 日付 ---------- */
  function pad(n) { return String(n).padStart(2, "0"); }
  function toStr(d) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }
  function todayStr() { return toStr(new Date()); }
  function parse(s) { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); }
  function addDays(s, n) { const d = parse(s); d.setDate(d.getDate() + n); return toStr(d); }
  function addMonths(ym, n) { const [y, m] = ym.split("-").map(Number); const d = new Date(y, m - 1 + n, 1); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`; }
  function daysInMonth(ym) { const [y, m] = ym.split("-").map(Number); return new Date(y, m, 0).getDate(); }
  const WEEK = "日月火水木金土";
  function dow(s) { return parse(s).getDay(); }
  function fmtDate(s) { const d = parse(s); return `${d.getMonth() + 1}/${d.getDate()}（${WEEK[d.getDay()]}）`; }
  function fmtLong(s) { const d = parse(s); return `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())}`; }
  const isDate = (s) => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);

  /* ---------- IndexedDB ---------- */
  function openDB() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const d = req.result;
        if (!d.objectStoreNames.contains("days")) d.createObjectStore("days", { keyPath: "date" });
        if (!d.objectStoreNames.contains("meta")) d.createObjectStore("meta");
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  function run(storeName, mode, fn) {
    return new Promise((resolve, reject) => {
      if (!db) { reject(new Error("no db")); return; }
      const t = db.transaction(storeName, mode);
      const store = t.objectStore(storeName);
      let result;
      const req = fn(store);
      if (req) req.onsuccess = () => { result = req.result; };
      t.oncomplete = () => resolve(result);
      t.onerror = () => reject(t.error);
      t.onabort = () => reject(t.error);
    });
  }

  async function loadAll() {
    const [days, items] = await Promise.all([
      run("days", "readonly", (s) => s.getAll()),
      run("meta", "readonly", (s) => s.get("items")),
    ]);
    state.days = new Map(days.map((d) => [d.date, normalizeDay(d)]));
    if (Array.isArray(items) && items.length) state.items = items.map(normalizeItem).filter(Boolean);
  }

  function normalizeDay(d) {
    const marks = {};
    Object.entries((d && d.marks) || {}).forEach(([k, v]) => { if (MARKS.includes(v)) marks[k] = v; });
    const memo = {};
    Object.entries((d && d.memo) || {}).forEach(([k, v]) => { if (typeof v === "string" && v.trim()) memo[k] = v; });
    return { date: d.date, marks, memo, updatedAt: d.updatedAt || null };
  }

  function normalizeItem(i) {
    if (!i || typeof i.id !== "string" || !i.id) return null;
    const rule = i.rule || {};
    return {
      id: i.id,
      name: typeof i.name === "string" && i.name.trim() ? i.name : "（名前なし）",
      cat: CAT_LABEL[i.cat] ? i.cat : "mind",
      rule: { o: String(rule.o || ""), t: String(rule.t || ""), x: String(rule.x || "") },
      active: i.active !== false,
    };
  }

  let persistAsked = false;
  function requestPersist() {
    if (persistAsked || !navigator.storage || !navigator.storage.persist) return;
    persistAsked = true;
    navigator.storage.persist().catch(() => {});
  }

  function isEmptyDay(d) { return !Object.keys(d.marks).length && !Object.keys(d.memo).length; }

  async function putDay(day) {
    day.updatedAt = new Date().toISOString();
    if (isEmptyDay(day)) {
      state.days.delete(day.date);
      await run("days", "readwrite", (s) => s.delete(day.date));
    } else {
      state.days.set(day.date, day);
      await run("days", "readwrite", (s) => s.put(day));
    }
    requestPersist();
  }

  async function saveItems() {
    await run("meta", "readwrite", (s) => s.put(state.items, "items"));
  }

  function getDay(date) {
    const d = state.days.get(date);
    return d ? { date, marks: { ...d.marks }, memo: { ...d.memo }, updatedAt: d.updatedAt } : { date, marks: {}, memo: {}, updatedAt: null };
  }

  async function setMark(date, itemId, mark) {
    const day = getDay(date);
    if (mark) day.marks[itemId] = mark;
    else delete day.marks[itemId];
    try {
      await putDay(day);
    } catch (err) {
      toast("保存できませんでした");
    }
  }

  /* ---------- 集計 ---------- */
  const activeItems = () => state.items.filter((i) => i.active);
  const markOf = (date, id) => { const d = state.days.get(date); return d ? d.marks[id] || null : null; };

  function dayScore(date) {
    const d = state.days.get(date);
    const ids = new Set(state.items.map((i) => i.id));
    const marks = d ? Object.entries(d.marks).filter(([k]) => ids.has(k)).map(([, v]) => v) : [];
    const count = { o: 0, t: 0, x: 0 };
    marks.forEach((m) => { count[m] += 1; });
    const pts = marks.reduce((a, m) => a + MARK_POINT[m], 0);
    return { count, recorded: marks.length, score: marks.length ? Math.round((pts / (marks.length * 2)) * 100) : null };
  }

  function rangeDates(end, n) {
    const out = [];
    for (let i = n - 1; i >= 0; i -= 1) out.push(addDays(end, -i));
    return out;
  }

  function itemStats(item, dates) {
    const c = { o: 0, t: 0, x: 0, none: 0 };
    dates.forEach((d) => { const m = markOf(d, item.id); c[m || "none"] += 1; });
    const recorded = c.o + c.t + c.x;
    return {
      ...c,
      recorded,
      total: dates.length,
      achieve: recorded ? Math.round(((c.o * 2 + c.t) / (recorded * 2)) * 100) : null,
    };
  }

  // 今日（未記入なら昨日）から遡って、○か△が続いた日数
  function itemStreak(id, ref = todayStr()) {
    let d = markOf(ref, id) ? ref : addDays(ref, -1);
    let n = 0;
    while (["o", "t"].includes(markOf(d, id))) { n += 1; d = addDays(d, -1); }
    return n;
  }

  // 何かしら記入した日の連続
  function recordStreak(ref = todayStr()) {
    const has = (d) => { const x = state.days.get(d); return !!(x && Object.keys(x.marks).length); };
    let d = has(ref) ? ref : addDays(ref, -1);
    let n = 0;
    while (has(d)) { n += 1; d = addDays(d, -1); }
    return n;
  }

  function periodStats(end, n) {
    const dates = rangeDates(end, n);
    const prevDates = rangeDates(addDays(end, -n), n);
    const items = state.items.filter((i) => i.active || dates.some((d) => markOf(d, i.id)));
    const rows = items.map((item) => ({
      item,
      cur: itemStats(item, dates),
      prev: itemStats(item, prevDates),
      streak: itemStreak(item.id, end),
    }));
    const recordedDays = dates.filter((d) => dayScore(d).recorded > 0).length;
    const scores = dates.map(dayScore).filter((s) => s.score !== null).map((s) => s.score);
    const prevScores = prevDates.map(dayScore).filter((s) => s.score !== null).map((s) => s.score);
    const avg = (a) => (a.length ? Math.round(a.reduce((x, y) => x + y, 0) / a.length) : null);
    const total = { o: 0, t: 0, x: 0 };
    rows.forEach((r) => { total.o += r.cur.o; total.t += r.cur.t; total.x += r.cur.x; });
    return { dates, rows, recordedDays, avgScore: avg(scores), prevAvg: avg(prevScores), total, n };
  }

  function buildInsights(st) {
    const out = [];
    const add = (level, text) => out.push({ level, text });
    const today = todayStr();

    if (!st.recordedDays) {
      add("info", "まだこの期間の記録がありません。「今日」の画面で、項目ごとに ○△× を押すだけで始められます。手書き日記がある日は「月の表」からまとめて書き写せます。");
      return out;
    }

    const rs = recordStreak(today);
    if (rs >= 7) add("good", `${rs}日続けて記録しています。記録そのものが続いているのがいちばんの土台です。`);
    else if (rs === 0) add("warn", "昨日と今日がまだ未記入です。寝る前の1分で、まず ○△× だけ付けましょう（メモは空欄でかまいません）。");

    const rate = st.recordedDays / st.n;
    if (st.n >= 7 && rate < 0.6) add("warn", `記録した日が ${st.recordedDays}/${st.n} 日です。手書き日記から「月の表」に書き写すと、空いた日を埋められます。`);

    const ranked = st.rows.filter((r) => r.cur.recorded >= Math.min(3, st.n)).sort((a, b) => b.cur.achieve - a.cur.achieve);
    const best = ranked[0];
    const worst = ranked[ranked.length - 1];
    if (best && best.cur.achieve >= 80) add("good", `「${best.item.name}」は達成度 ${best.cur.achieve}% で安定しています。この調子で。`);
    if (worst && worst !== best && worst.cur.achieve < 40) {
      add("warn", `「${worst.item.name}」の達成度が ${worst.cur.achieve}% です。やる時間と場所を先に決める（例：朝食の後に5分）か、△の基準を下げて「ゼロの日」をなくすところから。`);
    }

    st.rows.forEach((r) => {
      if (r.cur.recorded < 3 || r.prev.recorded < 3) return;
      const diff = r.cur.achieve - r.prev.achieve;
      if (diff >= 20) add("good", `「${r.item.name}」が前の${st.n}日より ${diff} ポイント上がりました。`);
      if (diff <= -20) add("warn", `「${r.item.name}」が前の${st.n}日より ${Math.abs(diff)} ポイント下がっています。何が変わったか（予定・疲れ・やり方）をメモに残しておくと次に効きます。`);
    });

    // 直近3日の × が続いている項目
    activeItems().forEach((item) => {
      const last3 = [0, 1, 2].map((i) => markOf(addDays(today, -i), item.id));
      const lastRecorded = last3.filter(Boolean);
      if (lastRecorded.length >= 3 && lastRecorded.every((m) => m === "x")) {
        add("warn", `「${item.name}」が3日続けて×です。今日は△（ほんの少し）を取りにいきましょう。`);
      }
    });

    // 曜日の傾向（30日以上・記録8日以上）
    if (st.n >= 30 && st.recordedDays >= 8) {
      const byDow = Array.from({ length: 7 }, () => []);
      st.dates.forEach((d) => { const s = dayScore(d).score; if (s !== null) byDow[dow(d)].push(s); });
      const means = byDow.map((a) => (a.length >= 2 ? a.reduce((x, y) => x + y, 0) / a.length : null));
      const valid = means.map((m, i) => [m, i]).filter(([m]) => m !== null);
      if (valid.length >= 4) {
        valid.sort((a, b) => a[0] - b[0]);
        const [low, li] = valid[0];
        const [high, hi] = valid[valid.length - 1];
        if (high - low >= 20) add("info", `${WEEK[li]}曜日が弱く（平均 ${Math.round(low)}点）、${WEEK[hi]}曜日が強い（平均 ${Math.round(high)}点）傾向です。${WEEK[li]}曜日だけ項目を絞る手もあります。`);
      }
    }

    const order = { warn: 0, info: 1, good: 2 };
    return out.sort((a, b) => order[a.level] - order[b.level]);
  }

  /* ---------- 共通 UI ---------- */
  let toastTimer = null;
  function toast(msg) {
    const t = $("#toast");
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove("show"), 2000);
  }

  function el(tag, attrs = {}, children = []) {
    const node = document.createElement(tag);
    Object.entries(attrs).forEach(([k, v]) => {
      if (v === null || v === undefined || v === false) return;
      if (k === "class") node.className = v;
      else if (k === "text") node.textContent = v;
      else if (k.startsWith("on") && typeof v === "function") node.addEventListener(k.slice(2), v);
      else node.setAttribute(k, v === true ? "" : v);
    });
    [].concat(children).forEach((c) => { if (c !== null && c !== undefined && c !== false) node.append(c); });
    return node;
  }

  function showView(view) {
    state.view = view;
    $$(".tab").forEach((t) => t.removeAttribute("aria-current"));
    const tab = $(`.tab[data-view="${view}"]`);
    if (tab) tab.setAttribute("aria-current", "page");
    $$(".view").forEach((v) => { v.hidden = v.id !== `view-${view}`; });
    render();
    window.scrollTo(0, 0);
  }

  function render() {
    if (state.view === "today") renderToday();
    if (state.view === "month") renderMonth();
    if (state.view === "review") renderReview();
    if (state.view === "settings") renderSettings();
  }

  function ruleText(item) {
    const r = item.rule;
    return MARKS.filter((m) => r[m]).map((m) => `${MARK_CHAR[m]} ${r[m]}`).join("　");
  }

  /* ---------- 今日 ---------- */
  function renderToday() {
    const today = todayStr();
    $("#datePicker").value = state.date;
    $("#datePicker").max = today;
    $("#nextDay").disabled = state.date >= today;
    $("#goToday").hidden = state.date === today;
    renderDayScore();
    renderMarkList();
    renderMemos();
    const d = state.days.get(state.date);
    $("#saveStatus").textContent = d && d.updatedAt ? `${fmtDate(state.date)}の記録は自動で保存されています` : "";
  }

  function renderDayScore() {
    const box = $("#dayScore");
    const s = dayScore(state.date);
    const total = activeItems().length;
    const label = state.date === todayStr() ? "今日" : fmtDate(state.date);
    const scoreText = s.score === null ? "—" : `${s.score}`;
    const pct = s.score === null ? 0 : s.score;
    box.replaceChildren(
      el("div", { class: "score-ring", style: `--p:${pct}` }, [el("strong", { text: scoreText }), el("span", { text: s.score === null ? "未記入" : "点" })]),
      el("div", { class: "score-body" }, [
        el("p", { class: "score-title", text: `${label}の ○△×` }),
        el("p", { class: "score-counts" }, [
          el("span", { class: "m-o", text: `○ ${s.count.o}` }),
          el("span", { class: "m-t", text: `△ ${s.count.t}` }),
          el("span", { class: "m-x", text: `× ${s.count.x}` }),
          el("span", { class: "muted", text: `記入 ${Math.min(s.recorded, total)}/${total}` }),
        ]),
        el("p", { class: "muted small", text: `記録の連続：${recordStreak()}日　（点数＝○2点・△1点・×0点を記入した項目で平均）` }),
      ]),
    );
  }

  function renderMarkList() {
    const wrap = $("#markList");
    const items = activeItems();
    if (!items.length) {
      wrap.replaceChildren(el("div", { class: "card" }, [el("p", { text: "記録する項目がありません。「設定」で項目を足してください。" })]));
      return;
    }
    const groups = CATS.map((c) => ({ cat: c, items: items.filter((i) => i.cat === c.id) })).filter((g) => g.items.length);
    wrap.replaceChildren(...groups.map((g) => el("div", { class: `card mark-group cat-${g.cat.id}` }, [
      el("h2", { class: "cat-title" }, [el("span", { class: "cat-dot", "aria-hidden": "true" }), g.cat.label]),
      ...g.items.map((item) => markRow(item)),
    ])));
  }

  function markRow(item) {
    const current = markOf(state.date, item.id);
    const rt = ruleText(item);
    return el("div", { class: "mark-row", "data-item": item.id }, [
      el("div", { class: "mark-label" }, [
        el("p", { class: "item-name", text: item.name }),
        rt ? el("p", { class: "item-rule", text: rt }) : null,
        el("p", { class: "item-streak", text: streakLabel(item.id) }),
      ]),
      el("div", { class: "mark-buttons", role: "group", "aria-label": `${item.name}の結果` }, MARKS.map((m) => el("button", {
        type: "button",
        class: `mark-btn m-${m}`,
        "data-mark": m,
        "aria-pressed": current === m ? "true" : "false",
        "aria-label": `${MARK_CHAR[m]} ${item.rule[m] || MARK_WORD[m]}`,
        title: item.rule[m] || MARK_WORD[m],
        text: MARK_CHAR[m],
      }))),
    ]);
  }

  function streakLabel(id) {
    const n = itemStreak(id, state.date);
    return n >= 2 ? `${n}日連続 ○△` : "";
  }

  async function onMarkClick(ev) {
    const btn = ev.target.closest(".mark-btn");
    if (!btn) return;
    const row = btn.closest(".mark-row");
    const id = row.dataset.item;
    const mark = btn.dataset.mark;
    const next = markOf(state.date, id) === mark ? null : mark; // 同じボタンをもう一度押すと取り消し
    await setMark(state.date, id, next);
    $$(".mark-btn", row).forEach((b) => b.setAttribute("aria-pressed", b.dataset.mark === next ? "true" : "false"));
    $(".item-streak", row).textContent = streakLabel(id);
    renderDayScore();
    $("#saveStatus").textContent = `${fmtDate(state.date)}の記録は自動で保存されています`;
  }

  function renderMemos() {
    const day = getDay(state.date);
    const box = $("#memoFields");
    box.replaceChildren(...MEMOS.map((m) => el("label", { class: "field" }, [
      el("span", { text: m.label }),
      el("textarea", { name: m.id, rows: "2", placeholder: m.placeholder, maxlength: "2000" }),
    ])));
    MEMOS.forEach((m) => { box.querySelector(`[name="${m.id}"]`).value = day.memo[m.id] || ""; });
  }

  let memoTimer = null;
  function onMemoInput() {
    const date = state.date;
    $("#saveStatus").textContent = "保存中…";
    clearTimeout(memoTimer);
    memoTimer = setTimeout(() => saveMemos(date), 500);
  }

  async function saveMemos(date) {
    if (date !== state.date) return;
    const day = getDay(date);
    MEMOS.forEach((m) => {
      const v = $(`#memoFields [name="${m.id}"]`).value;
      if (v.trim()) day.memo[m.id] = v;
      else delete day.memo[m.id];
    });
    try {
      await putDay(day);
      $("#saveStatus").textContent = `${fmtDate(date)}の記録は自動で保存されています`;
    } catch (err) {
      $("#saveStatus").textContent = "保存できませんでした";
    }
  }

  function flushMemos() {
    if (memoTimer) { clearTimeout(memoTimer); memoTimer = null; return saveMemos(state.date); }
    return Promise.resolve();
  }

  async function goDate(date) {
    await flushMemos();
    state.date = date;
    renderToday();
  }

  /* ---------- 月の表 ---------- */
  function renderMonth() {
    const ym = state.month;
    const [y, m] = ym.split("-").map(Number);
    const today = todayStr();
    $("#monthTitle").textContent = `${y}年${m}月`;
    $("#nextMonth").disabled = ym >= today.slice(0, 7);
    $("#goThisMonth").hidden = ym === today.slice(0, 7);

    const n = daysInMonth(ym);
    const dates = Array.from({ length: n }, (_, i) => `${ym}-${pad(i + 1)}`);
    const items = state.items.filter((i) => i.active || dates.some((d) => markOf(d, i.id)));
    const wrap = $("#gridWrap");
    if (!items.length) {
      wrap.replaceChildren(el("p", { text: "記録する項目がありません。「設定」で項目を足してください。" }));
      return;
    }

    const dayClass = (d) => {
      const w = dow(d);
      return [w === 0 ? "sun" : w === 6 ? "sat" : "", d === today ? "today" : "", d > today ? "future" : ""].filter(Boolean).join(" ");
    };

    const head = el("tr", {}, [
      el("th", { class: "corner", scope: "col", text: "項目" }),
      ...dates.map((d) => el("th", { scope: "col", class: dayClass(d) }, [
        el("button", { type: "button", class: "day-link", "data-date": d, disabled: d > today, "aria-label": `${fmtDate(d)}の画面へ` }, [
          el("span", { text: String(Number(d.slice(8))) }),
          el("small", { text: WEEK[dow(d)] }),
        ]),
      ])),
      el("th", { scope: "col", class: "sum", text: "達成" }),
    ]);

    const rows = [];
    CATS.forEach((c) => {
      const catItems = items.filter((i) => i.cat === c.id);
      if (!catItems.length) return;
      rows.push(el("tr", { class: `cat-row cat-${c.id}` }, [el("th", { scope: "rowgroup", colspan: String(n + 2) }, [el("span", { class: "cat-label" }, [el("span", { class: "cat-dot", "aria-hidden": "true" }), c.label])])]));
      catItems.forEach((item) => {
        const st = itemStats(item, dates.filter((d) => d <= today));
        rows.push(el("tr", { class: item.active ? "" : "paused" }, [
          el("th", { scope: "row", class: "item-cell", title: ruleText(item) }, [item.name, item.active ? null : el("small", { text: "休止中" })]),
          ...dates.map((d) => {
            const mk = markOf(d, item.id);
            return el("td", { class: dayClass(d) }, [el("button", {
              type: "button",
              class: `cell${mk ? ` m-${mk}` : ""}`,
              "data-date": d,
              "data-item": item.id,
              disabled: d > today,
              "aria-label": `${fmtDate(d)} ${item.name}：${mk ? MARK_CHAR[mk] : "未記入"}`,
              text: mk ? MARK_CHAR[mk] : "",
            })]);
          }),
          el("td", { class: "sum", text: st.achieve === null ? "—" : `${st.achieve}%` }),
        ]));
      });
    });

    rows.push(el("tr", { class: "score-row" }, [
      el("th", { scope: "row", class: "item-cell", text: "その日の点" }),
      ...dates.map((d) => { const s = dayScore(d); return el("td", { class: `${dayClass(d)} ${scoreClass(s.score)}`, text: s.score === null ? "" : String(s.score) }); }),
      el("td", { class: "sum", text: "" }),
    ]));

    const table = el("table", { class: "month-grid" }, [el("thead", {}, head), el("tbody", {}, rows)]);
    wrap.replaceChildren(table);
    // 今月なら今日の列が見えるようにスクロール
    if (ym === today.slice(0, 7)) {
      const col = Number(today.slice(8));
      wrap.scrollLeft = Math.max(0, col * 34 - wrap.clientWidth + 160);
    } else {
      wrap.scrollLeft = 0;
    }
  }

  function scoreClass(score) {
    if (score === null) return "";
    if (score >= 80) return "s-high";
    if (score >= 50) return "s-mid";
    return "s-low";
  }

  async function onGridClick(ev) {
    const link = ev.target.closest(".day-link");
    if (link) { state.date = link.dataset.date; showView("today"); return; }
    const cell = ev.target.closest(".cell");
    if (!cell || cell.disabled) return;
    const { date, item } = cell.dataset;
    const cur = markOf(date, item);
    const next = cur === null ? "o" : cur === "o" ? "t" : cur === "t" ? "x" : null;
    await setMark(date, item, next);
    const keepScroll = $("#gridWrap").scrollLeft;
    renderMonth();
    $("#gridWrap").scrollLeft = keepScroll;
    const again = $(`.cell[data-date="${date}"][data-item="${item}"]`);
    if (again) again.focus();
  }

  /* ---------- 振り返り ---------- */
  function renderReview() {
    $$("[data-range]").forEach((b) => b.setAttribute("aria-pressed", b.dataset.range === state.range ? "true" : "false"));
    const n = Number(state.range);
    const st = periodStats(todayStr(), n);

    const best = st.rows.filter((r) => r.streak > 0).sort((a, b) => b.streak - a.streak)[0];
    const diff = st.avgScore !== null && st.prevAvg !== null ? st.avgScore - st.prevAvg : null;
    $("#reviewSummary").replaceChildren(
      summaryCard("記録した日", `${st.recordedDays}/${n}`, "日", `記録の連続 ${recordStreak()}日`),
      summaryCard("平均点", st.avgScore === null ? "—" : String(st.avgScore), "点", diff === null ? "前の期間：記録なし" : `前の${n}日比 ${diff > 0 ? "+" : diff < 0 ? "−" : "±"}${Math.abs(diff)}`),
      summaryCard("○ の数", String(st.total.o), "個", `△ ${st.total.t}・× ${st.total.x}`),
      summaryCard("いちばん続いている", best ? String(best.streak) : "—", best ? "日" : "", best ? best.item.name : "○△ の連続はまだありません"),
    );

    $("#itemStats").replaceChildren(...(st.rows.length ? st.rows.map(statRow) : [el("p", { class: "muted", text: "項目がありません。" })]));

    $("#insights").replaceChildren(...buildInsights(st).map((i) => el("li", { class: `insight ${i.level}`, text: i.text })));

    renderMemoList(st.dates);
    $("#reviewText").value = reviewText(st);
  }

  function summaryCard(label, value, unit, sub) {
    return el("div", { class: "summary-card" }, [
      el("p", { class: "label", text: label }),
      el("p", { class: "value" }, [value, unit ? el("small", { text: unit }) : null]),
      el("p", { class: "sub", text: sub }),
    ]);
  }

  function statRow(r) {
    const c = r.cur;
    const w = (v) => `${(v / c.total) * 100}%`;
    const diff = c.achieve !== null && r.prev.achieve !== null ? c.achieve - r.prev.achieve : null;
    return el("div", { class: "stat-row" }, [
      el("div", { class: "stat-head" }, [
        el("p", { class: "item-name" }, [r.item.name, el("small", { text: CAT_LABEL[r.item.cat] })]),
        el("p", { class: "stat-achieve" }, [
          el("strong", { text: c.achieve === null ? "—" : `${c.achieve}%` }),
          diff !== null && diff !== 0 ? el("small", { class: diff > 0 ? "up" : "down", text: `${diff > 0 ? "▲" : "▼"}${Math.abs(diff)}` }) : null,
        ]),
      ]),
      el("div", { class: "stack-bar", role: "img", "aria-label": `○${c.o} △${c.t} ×${c.x} 未記入${c.none}` }, [
        el("span", { class: "seg m-o", style: `width:${w(c.o)}` }),
        el("span", { class: "seg m-t", style: `width:${w(c.t)}` }),
        el("span", { class: "seg m-x", style: `width:${w(c.x)}` }),
      ]),
      el("p", { class: "stat-counts" }, [
        el("span", { class: "m-o", text: `○${c.o}` }),
        el("span", { class: "m-t", text: `△${c.t}` }),
        el("span", { class: "m-x", text: `×${c.x}` }),
        el("span", { class: "muted", text: `未記入${c.none}` }),
        el("span", { class: "muted", text: r.streak ? `連続 ${r.streak}日` : "" }),
      ]),
    ]);
  }

  function renderMemoList(dates) {
    const sel = $("#memoFilter");
    if (!sel.options.length) {
      sel.append(el("option", { value: "all", text: "すべて" }), ...MEMOS.map((m) => el("option", { value: m.id, text: m.label })));
    }
    sel.value = state.memoFilter;
    const q = state.memoQuery.trim().toLowerCase();
    // 1日1件にまとめる（同じ日の分野ごとのメモは中に並べる）
    const list = [];
    [...dates].reverse().forEach((d) => {
      const day = state.days.get(d);
      if (!day) return;
      const lines = MEMOS.filter((m) => {
        const text = day.memo[m.id];
        if (!text) return false;
        if (state.memoFilter !== "all" && state.memoFilter !== m.id) return false;
        return !q || text.toLowerCase().includes(q);
      }).map((m) => ({ cat: m.id, text: day.memo[m.id] }));
      if (lines.length) list.push({ date: d, lines });
    });
    const shown = list.slice(0, state.memoLimit);
    const items = shown.map((x) => el("li", {}, [
      el("button", { type: "button", class: "memo-date", "data-date": x.date, text: fmtDate(x.date) }),
      ...x.lines.map((l) => el("p", {}, [el("span", { class: `memo-cat cat-${l.cat}`, text: MEMO_LABEL[l.cat] }), l.text])),
    ]));
    if (list.length > shown.length) {
      items.push(el("li", { class: "more" }, [el("button", { type: "button", class: "ghost-btn wide", id: "memoMore", text: `もっと見る（残り ${list.length - shown.length}日）` })]));
    }
    $("#memoList").replaceChildren(...(items.length
      ? items
      : [el("li", { class: "muted empty", text: q ? "見つかりませんでした。" : "この期間のメモはまだありません。" })]));
  }

  function reviewText(st) {
    const lines = [];
    lines.push(`【振り返り】${fmtLong(st.dates[0])}〜${fmtLong(st.dates[st.dates.length - 1])}（${st.n}日間）`);
    lines.push(`記録した日：${st.recordedDays}/${st.n}日　平均点：${st.avgScore === null ? "—" : `${st.avgScore}点`}${st.prevAvg !== null ? `（前の期間 ${st.prevAvg}点）` : ""}`);
    lines.push("※ ○＝2点・△＝1点・×＝0点。達成度は記入した日だけで計算");
    lines.push("");
    lines.push("■ 項目別（○/△/×/未記入・達成度・連続）");
    st.rows.forEach((r) => {
      const c = r.cur;
      const prev = r.prev.achieve !== null ? `、前の期間 ${r.prev.achieve}%` : "";
      lines.push(`- ${r.item.name}［${CAT_LABEL[r.item.cat]}］：○${c.o} △${c.t} ×${c.x} 未${c.none}・${c.achieve === null ? "—" : `${c.achieve}%`}${prev}・連続${r.streak}日${ruleText(r.item) ? `（基準 ${ruleText(r.item)}）` : ""}`);
    });
    const memos = [];
    st.dates.forEach((d) => {
      const day = state.days.get(d);
      if (!day) return;
      MEMOS.forEach((m) => { if (day.memo[m.id]) memos.push(`${fmtDate(d)} ${m.label}：${day.memo[m.id].replace(/\s+/g, " ")}`); });
    });
    if (memos.length) {
      lines.push("");
      lines.push("■ メモ");
      memos.slice(-40).forEach((x) => lines.push(`- ${x}`));
    }
    lines.push("");
    lines.push("この結果から、続いていること・崩れていること・来週ひとつだけ変えるなら何か、を一緒に考えてください。");
    return lines.join("\n");
  }

  /* ---------- 設定 ---------- */
  function renderSettings() {
    renderItemEditor();
    updateStorageInfo();
  }

  function renderItemEditor() {
    const box = $("#itemEditor");
    box.replaceChildren(...state.items.map((item, idx) => el("div", { class: `item-edit${item.active ? "" : " paused"}`, "data-id": item.id }, [
      el("div", { class: "field-row" }, [
        el("label", { class: "field grow" }, [el("span", { text: "項目名" }), el("input", { "data-k": "name", value: item.name, maxlength: "40" })]),
        el("label", { class: "field" }, [el("span", { text: "分野" }), el("select", { "data-k": "cat" }, CATS.map((c) => el("option", { value: c.id, text: c.label, selected: c.id === item.cat })))]),
      ]),
      el("div", { class: "rule-row" }, MARKS.map((m) => el("label", { class: `field rule m-${m}` }, [
        el("span", { text: `${MARK_CHAR[m]} の基準` }),
        el("input", { "data-k": `rule.${m}`, value: item.rule[m], placeholder: MARK_WORD[m], maxlength: "40" }),
      ]))),
      el("div", { class: "btn-row small" }, [
        el("button", { type: "button", class: "ghost-btn", "data-act": "up", disabled: idx === 0, "aria-label": `${item.name}を上へ`, text: "↑" }),
        el("button", { type: "button", class: "ghost-btn", "data-act": "down", disabled: idx === state.items.length - 1, "aria-label": `${item.name}を下へ`, text: "↓" }),
        el("button", { type: "button", class: "ghost-btn", "data-act": "toggle", text: item.active ? "休止する" : "再開する" }),
        el("button", { type: "button", class: "ghost-btn danger-text", "data-act": "delete", text: "削除" }),
      ]),
    ])));
  }

  let itemTimer = null;
  function onItemInput(ev) {
    const input = ev.target.closest("[data-k]");
    if (!input) return;
    const row = input.closest(".item-edit");
    const item = state.items.find((i) => i.id === row.dataset.id);
    if (!item) return;
    const k = input.dataset.k;
    if (k === "name") item.name = input.value.trim() ? input.value : "（名前なし）";
    else if (k === "cat") item.cat = input.value;
    else if (k.startsWith("rule.")) item.rule[k.slice(5)] = input.value;
    clearTimeout(itemTimer);
    itemTimer = setTimeout(() => saveItems().then(() => toast("項目を保存しました")).catch(() => toast("保存できませんでした")), 500);
  }

  async function onItemAction(ev) {
    const btn = ev.target.closest("[data-act]");
    if (!btn) return;
    const row = btn.closest(".item-edit");
    const idx = state.items.findIndex((i) => i.id === row.dataset.id);
    if (idx < 0) return;
    const item = state.items[idx];
    const act = btn.dataset.act;
    if (act === "up" && idx > 0) [state.items[idx - 1], state.items[idx]] = [state.items[idx], state.items[idx - 1]];
    if (act === "down" && idx < state.items.length - 1) [state.items[idx + 1], state.items[idx]] = [state.items[idx], state.items[idx + 1]];
    if (act === "toggle") item.active = !item.active;
    if (act === "delete") {
      if (!window.confirm(`「${item.name}」を削除しますか？ 過去のマスも表に出なくなります。記録を残したいときは「休止する」を使ってください。`)) return;
      state.items.splice(idx, 1);
    }
    clearTimeout(itemTimer);
    await saveItems();
    renderItemEditor();
    toast(act === "delete" ? "削除しました" : act === "toggle" ? (item.active ? "再開しました" : "休止しました") : "並べ替えました");
  }

  async function addItem() {
    const id = `i${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
    state.items.push({ id, name: "新しい項目", cat: "study", rule: { o: "", t: "", x: "" }, active: true });
    await saveItems();
    renderItemEditor();
    const input = $(`.item-edit[data-id="${id}"] [data-k="name"]`);
    if (input) { input.focus(); input.select(); }
  }

  async function updateStorageInfo() {
    const info = $("#storageInfo");
    const parts = [`記録 ${state.days.size}日分・項目 ${state.items.length}個`];
    try {
      if (navigator.storage && navigator.storage.persisted) {
        parts.push((await navigator.storage.persisted()) ? "消えにくい保存：有効" : "消えにくい保存：未許可（ホーム画面に追加すると有効になりやすい）");
      }
    } catch (err) { /* 取得できなくても表示は続ける */ }
    info.textContent = parts.join("／");
  }

  function download(name, blob) {
    const url = URL.createObjectURL(blob);
    const a = el("a", { href: url, download: name });
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }

  function sortedDays() { return [...state.days.values()].sort((a, b) => (a.date < b.date ? -1 : 1)); }

  function exportJson() {
    const data = { app: "maru-log", version: 1, exportedAt: new Date().toISOString(), items: state.items, days: sortedDays() };
    download(`maru-log-${todayStr()}.json`, new Blob([JSON.stringify(data, null, 1)], { type: "application/json" }));
    toast("書き出しました");
  }

  function exportCsv() {
    const q = (v) => {
      const s = v === null || v === undefined ? "" : String(v);
      return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const header = ["date", "score", ...state.items.map((i) => i.name), ...MEMOS.map((m) => `memo_${m.label}`)];
    const rows = sortedDays().map((d) => [
      d.date,
      dayScore(d.date).score ?? "",
      ...state.items.map((i) => (d.marks[i.id] ? MARK_CHAR[d.marks[i.id]] : "")),
      ...MEMOS.map((m) => d.memo[m.id] || ""),
    ].map(q).join(","));
    download(`maru-log-${todayStr()}.csv`, new Blob(["﻿" + [header.map(q).join(","), ...rows].join("\n")], { type: "text/csv" }));
    toast("書き出しました");
  }

  async function importJson(file) {
    let data;
    try { data = JSON.parse(await file.text()); } catch (err) { toast("JSONとして読めませんでした"); return; }
    if (!data || data.app !== "maru-log" || !Array.isArray(data.days)) { toast("Maru Log の書き出しファイルではありません"); return; }
    const items = Array.isArray(data.items) ? data.items.map(normalizeItem).filter(Boolean) : [];
    if (!window.confirm(`記録 ${data.days.length}日分・項目 ${items.length}個を読み込みます。同じ日付は、ファイルに入っているマスとメモだけを置き換えます。`)) return;
    try {
      items.forEach((inc) => {
        const i = state.items.findIndex((x) => x.id === inc.id);
        if (i >= 0) state.items[i] = inc;
        else state.items.push(inc);
      });
      await saveItems();
      for (const raw of data.days) {
        if (!raw || !isDate(raw.date)) continue;
        const inc = normalizeDay(raw);
        const cur = getDay(raw.date);
        const merged = { date: raw.date, marks: { ...cur.marks, ...inc.marks }, memo: { ...cur.memo, ...inc.memo } };
        await putDay(merged);
      }
      toast("読み込みました");
    } catch (err) {
      toast("読み込みの途中で失敗しました");
    }
    render();
  }

  async function wipeAll() {
    if (!window.confirm("この端末の記録と項目設定をすべて削除します。よろしいですか？")) return;
    if (!window.confirm("本当に削除しますか？ 元に戻せません。先にバックアップを書き出すことをおすすめします。")) return;
    await Promise.all(["days", "meta"].map((n) => run(n, "readwrite", (s) => s.clear())));
    state.days.clear();
    state.items = DEFAULT_ITEMS.map((i) => ({ ...i, rule: { ...i.rule } }));
    toast("すべて削除しました");
    render();
  }

  /* ---------- イベント ---------- */
  function bind() {
    $$(".tab").forEach((t) => t.addEventListener("click", async () => { await flushMemos(); showView(t.dataset.view); }));

    $("#prevDay").addEventListener("click", () => goDate(addDays(state.date, -1)));
    $("#nextDay").addEventListener("click", () => { if (state.date < todayStr()) goDate(addDays(state.date, 1)); });
    $("#goToday").addEventListener("click", () => goDate(todayStr()));
    $("#datePicker").addEventListener("change", (e) => {
      const v = e.target.value;
      if (isDate(v) && v <= todayStr()) goDate(v);
      else e.target.value = state.date;
    });
    $("#markList").addEventListener("click", onMarkClick);
    $("#memoForm").addEventListener("input", onMemoInput);
    $("#memoForm").addEventListener("submit", (e) => e.preventDefault());

    $("#prevMonth").addEventListener("click", () => { state.month = addMonths(state.month, -1); renderMonth(); });
    $("#nextMonth").addEventListener("click", () => { if (state.month < todayStr().slice(0, 7)) { state.month = addMonths(state.month, 1); renderMonth(); } });
    $("#goThisMonth").addEventListener("click", () => { state.month = todayStr().slice(0, 7); renderMonth(); });
    $("#gridWrap").addEventListener("click", onGridClick);

    const memoDates = () => rangeDates(todayStr(), Number(state.range));
    $$("[data-range]").forEach((b) => b.addEventListener("click", () => { state.range = b.dataset.range; state.memoLimit = 14; renderReview(); }));
    $("#memoFilter").addEventListener("change", (e) => { state.memoFilter = e.target.value; state.memoLimit = 14; renderMemoList(memoDates()); });
    $("#memoSearch").addEventListener("input", (e) => { state.memoQuery = e.target.value; state.memoLimit = 14; renderMemoList(memoDates()); });
    $("#memoList").addEventListener("click", (e) => {
      if (e.target.closest("#memoMore")) { state.memoLimit += 30; renderMemoList(memoDates()); return; }
      const b = e.target.closest(".memo-date");
      if (b) { state.date = b.dataset.date; showView("today"); }
    });
    $("#copyReview").addEventListener("click", async () => {
      const text = $("#reviewText").value;
      try { await navigator.clipboard.writeText(text); toast("コピーしました"); } catch (err) { $("#reviewText").select(); toast("選択しました。長押しでコピーしてください"); }
    });

    $("#itemEditor").addEventListener("input", onItemInput);
    $("#itemEditor").addEventListener("change", onItemInput);
    $("#itemEditor").addEventListener("click", onItemAction);
    $("#addItem").addEventListener("click", addItem);
    $("#exportJson").addEventListener("click", exportJson);
    $("#exportCsv").addEventListener("click", exportCsv);
    $("#importJson").addEventListener("change", (e) => { const f = e.target.files[0]; if (f) importJson(f); e.target.value = ""; });
    $("#wipeAll").addEventListener("click", wipeAll);

    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") { flushMemos(); return; }
      // 日付をまたいでアプリを開き直したとき、「今日」を更新する
      const today = todayStr();
      if (state.view === "today" && state.date < today && !state.days.has(state.date)) goDate(today);
    });
    window.addEventListener("pagehide", () => { flushMemos(); });
  }

  async function init() {
    bind();
    try {
      db = await openDB();
      await loadAll();
    } catch (err) {
      $("#saveStatus").textContent = "このブラウザでは保存できません（プライベートブラウズを解除してください）";
    }
    render();
    if ("serviceWorker" in navigator && location.protocol !== "file:") {
      navigator.serviceWorker.register("./sw.js").catch(() => {});
    }
  }

  init();
})();
