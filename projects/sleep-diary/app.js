"use strict";

/*
 * ねむり日誌 — 不眠の認知行動療法（CBT-I）の睡眠日誌を2週間つけるセルフケア PWA
 *
 * データはすべてこの端末の IndexedDB（DB名 "sleep-diary"）に置く。外部通信はしない。
 *   nights : 1晩1件（keyPath = date "YYYY-MM-DD" ＝ 起きた日の日付）
 *            { date, bed, lightsOff, finalWake, outOfBed: "HH:MM",
 *              sol, waso: 分, wakeups: 回, quality: 1-5, tags: [id], note, updatedAt }
 *   meta   : "settings" { onboarded, wakeTarget "HH:MM", safety: { answers, flagged, crisis, checkedAt }, plan }
 *            plan = { window: 分, wake: "HH:MM", start: "YYYY-MM-DD" } | null
 *
 * 計算（Carney 2012 のコンセンサス睡眠日誌に準拠）
 *   床上時間 TIB = 床から出た − 床に入った
 *   睡眠時間 TST = 最後に目が覚めた − 消灯 − 寝つくまで − 夜中に起きていた合計
 *   睡眠効率 SE  = TST ÷ TIB × 100
 */
(() => {
  const DB_NAME = "sleep-diary";
  const DB_VERSION = 1;
  const PROGRAM_NIGHTS = 14; // 2週間プログラム
  const MIN_NIGHTS_FOR_PLAN = 5; // 直近7日でこの夜数以上あれば目安を出す
  const MIN_WINDOW = 360; // 目安の下限（6時間）。臨床では5時間前後まで縮めることもあるが、セルフケアなので安全側に
  const MAX_WINDOW = 540; // 上限（9時間）
  const STEP = 15; // 目安を動かす幅（分）

  // メール講座など次のステップの登録先。空のあいだは「準備中」と表示する。
  // 外部ページへの移動（リンク）なので CSP の connect-src には影響しない。
  const SIGNUP_URL = "";

  const TAGS = [
    { id: "caffeine", label: "14時以降のカフェイン" },
    { id: "alcohol", label: "寝る前の飲酒" },
    { id: "nap", label: "昼寝（20分超）" },
    { id: "exercise", label: "運動した" },
    { id: "screen", label: "床でスマホ" },
    { id: "stress", label: "強いストレス" },
  ];
  const TAG_LABEL = Object.fromEntries(TAGS.map((t) => [t.id, t.label]));

  // はじめる前の確認。1つでも当てはまれば、眠る時間を縮める提案は出さない。
  const SAFETY = [
    { id: "minor", text: "18歳未満である" },
    { id: "apnea", text: "大きないびき、または眠っている間に呼吸が止まっていると言われたことがある" },
    { id: "sleepy", text: "運転中や会話中など、起きているべき場面で耐えがたい眠気がある" },
    { id: "bipolar", text: "双極性障害（躁うつ病）・てんかんと診断されている、またはその疑いがある" },
    { id: "pregnant", text: "妊娠中である" },
    { id: "shift", text: "夜勤や交代勤務をしている" },
    { id: "rls", text: "夕方〜夜に脚がむずむずして、じっとしていられない" },
    { id: "mood", text: "気分の落ち込みが強い、または死にたい気持ちになることがある", crisis: true },
  ];

  const QUALITY = [
    { v: 1, label: "とても悪い" },
    { v: 2, label: "悪い" },
    { v: 3, label: "ふつう" },
    { v: 4, label: "よい" },
    { v: 5, label: "とてもよい" },
  ];

  const DEFAULT_SETTINGS = {
    onboarded: false,
    wakeTarget: "06:30",
    safety: { answers: {}, flagged: false, crisis: false, checkedAt: null },
    plan: null,
  };

  const state = {
    nights: new Map(),
    settings: structuredClone(DEFAULT_SETTINGS),
    date: todayStr(),
    view: "record",
    range: "7",
  };
  let db = null;

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

  /* ---------- 日付と時刻 ---------- */
  function pad(n) { return String(n).padStart(2, "0"); }
  function toStr(d) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }
  function todayStr() { return toStr(new Date()); }
  function parse(s) { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); }
  function addDays(s, n) { const d = parse(s); d.setDate(d.getDate() + n); return toStr(d); }
  function daysBetween(a, b) { return Math.round((parse(b) - parse(a)) / 86400000); }
  const WEEK = "日月火水木金土";
  function fmtDate(s) { const d = parse(s); return `${d.getMonth() + 1}/${d.getDate()}（${WEEK[d.getDay()]}）`; }
  const isDate = (s) => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(parse(s).getTime());
  const isTime = (s) => typeof s === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(s);

  // "HH:MM" を、起きた日の 0:00 を基準にした分に直す。12:00 以降は前の晩とみなす（例 23:30 → -30）。
  function toAbs(t) {
    const [h, m] = t.split(":").map(Number);
    const v = h * 60 + m;
    return v >= 720 ? v - 1440 : v;
  }
  function fromAbs(v) { const m = ((Math.round(v) % 1440) + 1440) % 1440; return `${pad(Math.floor(m / 60))}:${pad(m % 60)}`; }
  function fmtDur(min) {
    if (min == null || Number.isNaN(min)) return "—";
    const m = Math.round(min);
    const h = Math.floor(m / 60);
    return h > 0 ? `${h}時間${m % 60 ? `${m % 60}分` : ""}` : `${m}分`;
  }
  const floorStep = (v) => Math.floor(v / STEP) * STEP;
  const roundStep = (v) => Math.round(v / STEP) * STEP;

  /* ---------- 計算 ---------- */
  function calc(n) {
    const bed = toAbs(n.bed);
    const off = toAbs(n.lightsOff);
    const wake = toAbs(n.finalWake);
    const out = toAbs(n.outOfBed);
    if (!(bed <= off)) return { error: "② 消灯が ① 床に入った時刻より前になっています" };
    if (!(off < wake)) return { error: "⑥ 最後に目が覚めた時刻が ② 消灯より前になっています" };
    if (!(wake <= out)) return { error: "⑦ 床から出た時刻が ⑥ 最後に目が覚めた時刻より前になっています" };
    const tib = out - bed;
    const tst = Math.max(0, wake - off - n.sol - n.waso);
    if (n.sol + n.waso > wake - off) return { error: "③ と ⑤ の合計が、消灯から目覚めまでの時間より長くなっています" };
    return { tib, tst, se: tib > 0 ? (tst / tib) * 100 : 0, bed, off, wake, out, sleepStart: off + n.sol };
  }

  function nightsIn(endDate, days) {
    const start = addDays(endDate, -(days - 1));
    return [...state.nights.values()].filter((n) => n.date >= start && n.date <= endDate).sort((a, b) => (a.date < b.date ? -1 : 1));
  }

  const mean = (arr) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null);
  function sd(arr) {
    if (arr.length < 2) return null;
    const m = mean(arr);
    return Math.sqrt(arr.reduce((a, b) => a + (b - m) ** 2, 0) / (arr.length - 1));
  }

  function summarize(list) {
    const rows = list.map((n) => ({ n, c: calc(n) })).filter((r) => !r.c.error);
    if (!rows.length) return null;
    const tst = mean(rows.map((r) => r.c.tst));
    const tib = mean(rows.map((r) => r.c.tib));
    return {
      count: rows.length,
      tst,
      tib,
      se: (rows.reduce((a, r) => a + r.c.tst, 0) / rows.reduce((a, r) => a + r.c.tib, 0)) * 100,
      sol: mean(rows.map((r) => r.n.sol)),
      waso: mean(rows.map((r) => r.n.waso)),
      wakeups: mean(rows.map((r) => r.n.wakeups)),
      quality: mean(rows.map((r) => r.n.quality)),
      outSd: sd(rows.map((r) => r.c.out)),
      outMean: mean(rows.map((r) => r.c.out)),
      rows,
    };
  }

  /* ---------- 眠る時間の目安（睡眠制限法をセルフケア向けにゆるめたもの） ---------- */
  function buildPlan() {
    const s = state.settings;
    const today = todayStr();
    const last7 = summarize(nightsIn(today, 7));
    const count = last7 ? last7.count : 0;
    const wake = s.wakeTarget;

    if (s.safety.flagged) return { kind: "blocked" };
    if (count < MIN_NIGHTS_FOR_PLAN) return { kind: "wait", need: MIN_NIGHTS_FOR_PLAN - count };

    if (!s.plan) {
      // 最初の目安：平均睡眠時間（15分単位で切り下げ）。下限6時間。すでに効率が高ければ今の床上時間のまま。
      if (last7.se >= 90) {
        const w = Math.min(MAX_WINDOW, Math.max(MIN_WINDOW, roundStep(last7.tib)));
        return { kind: "new", window: w, wake, reason: `睡眠効率が ${last7.se.toFixed(0)}% と高いので、床にいる時間は今のままで大丈夫です。起床時刻をそろえることを優先しましょう。`, s: last7 };
      }
      const w = Math.min(roundStep(last7.tib), Math.max(MIN_WINDOW, floorStep(last7.tst)));
      return { kind: "new", window: w, wake, reason: `直近${last7.count}夜の平均睡眠時間は ${fmtDur(last7.tst)}、床にいる時間は ${fmtDur(last7.tib)}。床にいる時間を眠れている時間に近づけると、眠りがまとまりやすくなります。`, s: last7 };
    }

    // 目安を試している最中：始めてから7日たったら、その間の睡眠効率で15分ずつ調整する
    const p = s.plan;
    const elapsed = daysBetween(p.start, today);
    const since = summarize([...state.nights.values()].filter((n) => n.date > p.start && n.date <= today));
    if (elapsed < 7 || !since || since.count < MIN_NIGHTS_FOR_PLAN) {
      return { kind: "trying", window: p.window, wake: p.wake, day: Math.max(1, elapsed), s: since };
    }
    let w = p.window;
    let reason;
    if (since.se >= 90) { w = Math.min(MAX_WINDOW, p.window + STEP); reason = `この1週間の睡眠効率は ${since.se.toFixed(0)}%。よく眠れているので、床にいる時間を${STEP}分のばします。`; }
    else if (since.se >= 85) { reason = `この1週間の睡眠効率は ${since.se.toFixed(0)}%。ちょうどよい状態なので、今の目安を続けます。`; }
    else if (p.window > MIN_WINDOW) { w = Math.max(MIN_WINDOW, p.window - STEP); reason = `この1週間の睡眠効率は ${since.se.toFixed(0)}%。まだ床で起きている時間が長めなので、${STEP}分短くします。`; }
    else { reason = `この1週間の睡眠効率は ${since.se.toFixed(0)}%。目安はすでに下限の6時間なので、これ以上は縮めません。改善しない場合は睡眠外来への相談をおすすめします。`; }
    return { kind: "review", window: w, prev: p.window, wake: p.wake, reason, s: since };
  }

  /* ---------- IndexedDB ---------- */
  function openDB() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const d = req.result;
        if (!d.objectStoreNames.contains("nights")) d.createObjectStore("nights", { keyPath: "date" });
        if (!d.objectStoreNames.contains("meta")) d.createObjectStore("meta");
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  function tx(store, mode, fn) {
    return new Promise((resolve, reject) => {
      const t = db.transaction(store, mode);
      const s = t.objectStore(store);
      const r = fn(s);
      t.oncomplete = () => resolve(r && "result" in r ? r.result : undefined);
      t.onerror = () => reject(t.error);
    });
  }
  const dbAll = (store) => tx(store, "readonly", (s) => s.getAll());
  const dbGet = (store, key) => tx(store, "readonly", (s) => s.get(key));
  const dbPut = (store, value, key) => tx(store, "readwrite", (s) => (key === undefined ? s.put(value) : s.put(value, key)));
  const dbDel = (store, key) => tx(store, "readwrite", (s) => s.delete(key));
  const dbClear = (store) => tx(store, "readwrite", (s) => s.clear());
  const saveSettings = () => dbPut("meta", state.settings, "settings");

  /* ---------- 入力の検査（読み込み時にも使う） ---------- */
  function clampInt(v, min, max) {
    const n = Math.round(Number(v));
    return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : null;
  }
  function sanitizeNight(raw) {
    if (!raw || typeof raw !== "object" || !isDate(raw.date)) return null;
    for (const k of ["bed", "lightsOff", "finalWake", "outOfBed"]) if (!isTime(raw[k])) return null;
    const sol = clampInt(raw.sol, 0, 600);
    const waso = clampInt(raw.waso, 0, 600);
    const wakeups = clampInt(raw.wakeups, 0, 30);
    const quality = clampInt(raw.quality, 1, 5);
    if (sol == null || waso == null || wakeups == null || quality == null) return null;
    const n = {
      date: raw.date,
      bed: raw.bed, lightsOff: raw.lightsOff, finalWake: raw.finalWake, outOfBed: raw.outOfBed,
      sol, waso, wakeups, quality,
      tags: Array.isArray(raw.tags) ? raw.tags.filter((t) => TAG_LABEL[t]) : [],
      note: typeof raw.note === "string" ? raw.note.slice(0, 200) : "",
      updatedAt: typeof raw.updatedAt === "string" ? raw.updatedAt : new Date().toISOString(),
    };
    return calc(n).error ? null : n;
  }
  function sanitizeSettings(raw) {
    const s = structuredClone(DEFAULT_SETTINGS);
    if (!raw || typeof raw !== "object") return s;
    s.onboarded = raw.onboarded === true;
    if (isTime(raw.wakeTarget)) s.wakeTarget = raw.wakeTarget;
    if (raw.safety && typeof raw.safety === "object") {
      const answers = {};
      for (const q of SAFETY) if (raw.safety.answers && raw.safety.answers[q.id] === true) answers[q.id] = true;
      s.safety = { answers, flagged: Object.keys(answers).length > 0, crisis: SAFETY.some((q) => q.crisis && answers[q.id]), checkedAt: typeof raw.safety.checkedAt === "string" ? raw.safety.checkedAt : null };
    }
    const p = raw.plan;
    if (p && isDate(p.start) && isTime(p.wake) && Number.isFinite(p.window)) s.plan = { window: Math.min(MAX_WINDOW, Math.max(MIN_WINDOW, roundStep(p.window))), wake: p.wake, start: p.start };
    return s;
  }

  /* ---------- 画面：はじめに ---------- */
  function renderSafety() {
    const ans = state.settings.safety.answers || {};
    $("#safetyList").innerHTML = SAFETY.map((q) => `<label class="check"><input type="checkbox" name="${q.id}" ${ans[q.id] ? "checked" : ""} /><span>${esc(q.text)}</span></label>`).join("");
    $("#startWake").value = state.settings.wakeTarget;
  }

  function showStart(show) {
    $("#view-start").hidden = !show;
    $("#app").hidden = show;
    $("#tabs").hidden = show;
    if (show) renderSafety();
  }

  async function submitSafety(e) {
    e.preventDefault();
    const answers = {};
    for (const q of SAFETY) if ($(`#safetyForm input[name="${q.id}"]`).checked) answers[q.id] = true;
    const wake = $("#startWake").value;
    state.settings.safety = { answers, flagged: Object.keys(answers).length > 0, crisis: SAFETY.some((q) => q.crisis && answers[q.id]), checkedAt: new Date().toISOString() };
    if (isTime(wake)) state.settings.wakeTarget = wake;
    if (state.settings.safety.flagged) state.settings.plan = null;
    state.settings.onboarded = true;
    await saveSettings();
    showStart(false);
    setView("record");
    toast(state.settings.safety.flagged ? "記録をはじめましょう。眠る時間の目安は表示しません" : "記録をはじめましょう。毎朝1分です");
  }

  /* ---------- 画面：記録 ---------- */
  function defaultsFor(date) {
    // 直前の記録 → 目安 → 決まった初期値 の順で埋める
    const prev = [...state.nights.values()].filter((n) => n.date < date).sort((a, b) => (a.date < b.date ? 1 : -1))[0];
    if (prev) return { bed: prev.bed, lightsOff: prev.lightsOff, sol: prev.sol, wakeups: prev.wakeups, waso: prev.waso, finalWake: prev.finalWake, outOfBed: prev.outOfBed, quality: 3, tags: [], note: "" };
    const wake = state.settings.wakeTarget;
    const w = toAbs(wake);
    return { bed: fromAbs(w - 480), lightsOff: fromAbs(w - 465), sol: 20, wakeups: 1, waso: 15, finalWake: fromAbs(w - 10), outOfBed: wake, quality: 3, tags: [], note: "" };
  }

  function renderProgress() {
    const total = state.nights.size;
    const n = Math.min(total, PROGRAM_NIGHTS);
    const pct = Math.round((n / PROGRAM_NIGHTS) * 100);
    const plan = state.settings.plan;
    const planLine = plan && !state.settings.safety.flagged
      ? `<p class="plan-line">今週の目安：<b>${fromAbs(toAbs(plan.wake) - plan.window)}</b> に床へ → <b>${plan.wake}</b> に起きる（${fmtDur(plan.window)}）</p>`
      : `<p class="plan-line">起床時刻 <b>${esc(state.settings.wakeTarget)}</b> を毎朝そろえるのが第一歩です。</p>`;
    const head = total >= PROGRAM_NIGHTS ? `2週間の日誌が完成しました（${total}夜）` : `2週間の睡眠日誌 <b>${n}</b> / ${PROGRAM_NIGHTS} 夜`;
    $("#progressCard").innerHTML = `<p class="progress-head">${head}</p><div class="bar" role="progressbar" aria-valuemin="0" aria-valuemax="${PROGRAM_NIGHTS}" aria-valuenow="${n}"><span style="width:${pct}%"></span></div>${planLine}`;
  }

  function renderRecord() {
    renderProgress();
    $("#datePicker").value = state.date;
    $("#datePicker").max = todayStr();
    $("#nextDay").disabled = state.date >= todayStr();
    const existing = state.nights.get(state.date);
    const v = existing || defaultsFor(state.date);
    const f = $("#nightForm");
    for (const k of ["bed", "lightsOff", "sol", "wakeups", "waso", "finalWake", "outOfBed", "note"]) f.elements[k].value = v[k];
    $("#qualityGroup").innerHTML = QUALITY.map((q) => `<label class="rate"><input type="radio" name="quality" value="${q.v}" ${v.quality === q.v ? "checked" : ""} /><span><b>${q.v}</b>${q.label}</span></label>`).join("");
    $("#tagGroup").innerHTML = TAGS.map((t) => `<label class="chip"><input type="checkbox" name="tag" value="${t.id}" ${v.tags.includes(t.id) ? "checked" : ""} /><span>${esc(t.label)}</span></label>`).join("");
    $("#formTitle").textContent = `${fmtDate(addDays(state.date, -1))}の夜 → ${fmtDate(state.date)}の朝`;
    $("#deleteNight").hidden = !existing;
    updatePreview();
  }

  function readForm() {
    const f = $("#nightForm");
    const num = (k) => (f.elements[k].value === "" ? null : Number(f.elements[k].value));
    return {
      date: state.date,
      bed: f.elements.bed.value, lightsOff: f.elements.lightsOff.value, finalWake: f.elements.finalWake.value, outOfBed: f.elements.outOfBed.value,
      sol: num("sol"), waso: num("waso"), wakeups: num("wakeups"),
      quality: Number((f.querySelector('input[name="quality"]:checked') || {}).value || 3),
      tags: $$('input[name="tag"]:checked', f).map((i) => i.value),
      note: f.elements.note.value.trim(),
    };
  }

  function validate(n) {
    for (const k of ["bed", "lightsOff", "finalWake", "outOfBed"]) if (!isTime(n[k])) return { error: "時刻をすべて入れてください" };
    for (const k of ["sol", "waso", "wakeups"]) if (n[k] == null || !Number.isFinite(n[k]) || n[k] < 0) return { error: "③〜⑤ に 0 以上の数を入れてください" };
    return calc(n);
  }

  function updatePreview() {
    const c = validate(readForm());
    const el = $("#calcPreview");
    if (c.error) { el.innerHTML = `<p class="calc-error">${esc(c.error)}</p>`; return; }
    el.innerHTML = `<dl><div><dt>床にいた時間</dt><dd>${fmtDur(c.tib)}</dd></div><div><dt>眠っていた時間</dt><dd>${fmtDur(c.tst)}</dd></div><div><dt>睡眠効率</dt><dd class="${seClass(c.se)}">${c.se.toFixed(0)}%</dd></div></dl>`;
  }
  const seClass = (se) => (se >= 85 ? "good" : se >= 75 ? "mid" : "low");

  async function saveNight(e) {
    e.preventDefault();
    const n = readForm();
    const c = validate(n);
    if (c.error) { toast(c.error); return; }
    const clean = sanitizeNight({ ...n, updatedAt: new Date().toISOString() });
    if (!clean) { toast("入力を確かめてください"); return; }
    await dbPut("nights", clean);
    const first = !state.nights.has(clean.date);
    state.nights.set(clean.date, clean);
    renderRecord();
    const total = state.nights.size;
    if (first && total === PROGRAM_NIGHTS) toast("2週間の日誌が完成しました。振り返りタブでレポートを見られます");
    else if (first && total === 7) toast("1週間分そろいました。振り返りタブを見てみましょう");
    else toast(`保存しました（睡眠効率 ${c.se.toFixed(0)}%）`);
  }

  async function deleteNight() {
    if (!confirm(`${fmtDate(state.date)}の朝の記録を消します。よろしいですか？`)) return;
    await dbDel("nights", state.date);
    state.nights.delete(state.date);
    renderRecord();
    toast("記録を消しました");
  }

  /* ---------- 画面：振り返り ---------- */
  function renderReview() {
    $$(".segmented button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.range === state.range)));
    const days = Number(state.range);
    const today = todayStr();
    const list = nightsIn(today, days);
    const s = summarize(list);
    const prev = summarize(nightsIn(addDays(today, -days), days));

    if (!s) {
      $("#summaryCards").innerHTML = `<div class="card empty">この${days}日間の記録はまだありません。記録タブから昨夜の眠りを入れてみましょう。</div>`;
    } else {
      const diff = (cur, old, unit, digits = 0, reverse = false) => {
        if (old == null || cur == null) return "";
        const d = cur - old;
        if (Math.abs(d) < (unit === "%" ? 1 : 5)) return `<small class="flat">前の期間と同じくらい</small>`;
        const better = reverse ? d < 0 : d > 0;
        const txt = unit === "%" ? `${d > 0 ? "+" : ""}${d.toFixed(digits)}pt` : `${d > 0 ? "+" : "−"}${fmtDur(Math.abs(d))}`;
        return `<small class="${better ? "up" : "down"}">前の期間より ${txt}</small>`;
      };
      const cards = [
        { label: "睡眠効率", value: `${s.se.toFixed(0)}%`, cls: seClass(s.se), note: diff(s.se, prev && prev.se, "%"), help: "85%以上が目安" },
        { label: "眠っていた時間", value: fmtDur(s.tst), note: diff(s.tst, prev && prev.tst, "min") },
        { label: "床にいた時間", value: fmtDur(s.tib), note: diff(s.tib, prev && prev.tib, "min") },
        { label: "寝つくまで", value: fmtDur(s.sol), note: diff(s.sol, prev && prev.sol, "min", 0, true), help: "30分以内が目安" },
        { label: "夜中に起きていた", value: fmtDur(s.waso), note: diff(s.waso, prev && prev.waso, "min", 0, true), help: `平均 ${s.wakeups.toFixed(1)} 回` },
        { label: "起床時刻のばらつき", value: s.outSd == null ? "—" : `±${fmtDur(s.outSd)}`, help: s.outMean == null ? "" : `平均 ${fromAbs(s.outMean)}` },
      ];
      $("#summaryCards").innerHTML = cards.map((c) => `<div class="stat"><p class="stat-label">${c.label}</p><p class="stat-value ${c.cls || ""}">${c.value}</p>${c.note || ""}${c.help ? `<small>${c.help}</small>` : ""}</div>`).join("") + `<p class="stat-foot">記録した夜：${s.count} / ${days}</p>`;
    }

    renderTimeline(nightsIn(today, Math.min(days, 14)));
    renderInsights(s, list);
    renderPlan();
    renderFinish();
    $("#reportText").value = buildReport();
  }

  function renderTimeline(list) {
    const el = $("#timeline");
    if (!list.length) { el.innerHTML = `<p class="hint">記録がたまると、ここに夜ごとの帯が並びます。</p>`; return; }
    // 横軸：前日 20:00（-240）〜 当日 12:00（720）
    // 画面の幅そのままの座標で描く（縮小されて文字が小さくならないように）
    const X0 = -240, X1 = 720, W = Math.max(300, Math.round(el.clientWidth || 600)), LABEL = 76, RIGHT = 40, ROW = 26;
    const plotW = W - LABEL - RIGHT;
    const x = (v) => LABEL + ((Math.min(X1, Math.max(X0, v)) - X0) / (X1 - X0)) * plotW;
    const H = list.length * ROW + 26;
    const ticks = W < 480 ? [-240, 0, 240, 480, 720] : [-240, -120, 0, 120, 240, 360, 480, 600, 720];
    let svg = `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="夜ごとの床にいた時間と眠っていた時間">`;
    for (const t of ticks) svg += `<line x1="${x(t)}" x2="${x(t)}" y1="0" y2="${H - 20}" class="tl-grid"/><text x="${x(t)}" y="${H - 6}" class="tl-tick" text-anchor="middle">${fromAbs(t).replace(/^0/, "")}</text>`;
    list.forEach((n, i) => {
      const c = calc(n);
      const y = i * ROW + 4;
      svg += `<text x="0" y="${y + 13}" class="tl-label">${fmtDate(n.date)}</text>`;
      if (c.error) return;
      svg += `<rect x="${x(c.bed)}" y="${y + 2}" width="${Math.max(1, x(c.out) - x(c.bed))}" height="14" rx="4" class="tl-bed"/>`;
      svg += `<rect x="${x(c.sleepStart)}" y="${y + 2}" width="${Math.max(1, x(c.wake) - x(c.sleepStart))}" height="14" rx="4" class="tl-sleep ${seClass(c.se)}"/>`;
      svg += `<text x="${W - 2}" y="${y + 13}" class="tl-se ${seClass(c.se)}" text-anchor="end">${c.se.toFixed(0)}%</text>`;
    });
    svg += `</svg>`;
    el.innerHTML = svg;
  }

  function tagEffects(list) {
    // 「その行動があった日」と「なかった日」の睡眠効率の差。両方3夜以上あるときだけ。因果ではなく、記録上の傾向。
    const rows = list.map((n) => ({ n, c: calc(n) })).filter((r) => !r.c.error);
    const out = [];
    for (const t of TAGS) {
      const yes = rows.filter((r) => r.n.tags.includes(t.id)).map((r) => r.c.se);
      const no = rows.filter((r) => !r.n.tags.includes(t.id)).map((r) => r.c.se);
      if (yes.length >= 3 && no.length >= 3) out.push({ t, d: mean(yes) - mean(no), yes: yes.length, no: no.length });
    }
    return out.sort((a, b) => Math.abs(b.d) - Math.abs(a.d));
  }

  function buildInsights(s, list) {
    const out = [];
    if (!s) return [{ k: "info", t: "記録が1夜あれば、ここに気づきが出ます。" }];
    if (s.count < 3) out.push({ k: "info", t: `記録はまだ ${s.count} 夜です。傾向は3夜以上から、眠る時間の目安は直近7日で${MIN_NIGHTS_FOR_PLAN}夜そろうと出ます。` });
    if (s.se < 85) out.push({ k: "warn", t: `睡眠効率が ${s.se.toFixed(0)}% で、床にいる時間のうち約 ${fmtDur(s.tib - s.tst)} は起きています。床にいる時間を、眠れている時間に近づけるのが近道です（眠りのコツ ⑤）。` });
    else out.push({ k: "good", t: `睡眠効率 ${s.se.toFixed(0)}% は目安の85%以上です。床にいる時間と眠れている時間がよく合っています。` });
    if (s.sol > 30) out.push({ k: "warn", t: `寝つくまで平均 ${fmtDur(s.sol)}。眠くなってから床に入り、20分ほど眠れなければいったん床を出てみましょう（眠りのコツ ②③）。` });
    if (s.waso > 30) out.push({ k: "warn", t: `夜中に起きている時間が平均 ${fmtDur(s.waso)}。目が覚めたら時計を見ないこと、長く眠れないときは床を出ることが助けになります。` });
    if (s.outSd != null && s.outSd > 45) out.push({ k: "warn", t: `起床時刻が日によって ±${fmtDur(s.outSd)} ずれています。まずは毎朝 ${state.settings.wakeTarget} にそろえることから（眠りのコツ ①）。` });
    else if (s.outSd != null && s.count >= 3) out.push({ k: "good", t: `起床時刻のばらつきは ±${fmtDur(s.outSd)}。体内時計を整えるうえで大事な土台ができています。` });
    if (s.tst < MIN_WINDOW && s.se >= 85) out.push({ k: "info", t: `よく眠れていますが、睡眠時間は平均 ${fmtDur(s.tst)} です。日中に強い眠気があるなら、睡眠時間そのものが足りていない可能性があります。` });
    for (const e of tagEffects(list).slice(0, 2)) {
      if (Math.abs(e.d) < 3) continue;
      out.push({ k: "info", t: `記録上は「${e.t.label}」があった夜のほうが、なかった夜より睡眠効率が平均 ${Math.abs(e.d).toFixed(0)}pt ${e.d < 0 ? "低め" : "高め"}です（${e.yes}夜 対 ${e.no}夜）。偶然の可能性もあるので、記録が増えるまでは目安として見てください。` });
    }
    return out;
  }

  function renderInsights(s, list) {
    $("#insights").innerHTML = buildInsights(s, list).map((i) => `<li class="ins-${i.k}">${esc(i.t)}</li>`).join("");
  }

  function renderPlan() {
    const p = buildPlan();
    const el = $("#planCard");
    const bedOf = (w, wake) => fromAbs(toAbs(wake) - w);
    if (p.kind === "blocked") {
      el.innerHTML = `<h2>眠る時間の目安</h2><p>はじめる前の確認で当てはまる項目があったため、眠る時間を縮める提案は出していません。記録と振り返りはそのまま使えます。このレポートを持って、睡眠外来や心療内科に相談してみてください。</p>${state.settings.safety.crisis ? crisisBox() : ""}`;
      return;
    }
    if (p.kind === "wait") {
      el.innerHTML = `<h2>眠る時間の目安</h2><p>直近7日で <b>あと ${p.need} 夜</b> 記録すると、あなたの記録から「何時に床に入り、何時に起きるか」の目安を出します。</p>`;
      return;
    }
    if (p.kind === "trying") {
      el.innerHTML = `<h2>眠る時間の目安（試している最中・${p.day}日目）</h2><p class="plan-big"><b>${bedOf(p.window, p.wake)}</b> に床へ → <b>${p.wake}</b> に起きる</p><p class="hint">${fmtDur(p.window)}。始めてから7日たち、5夜以上記録がたまると、睡眠効率を見て15分ずつ調整します。${p.s ? `ここまでの睡眠効率：${p.s.se.toFixed(0)}%。` : ""}眠い日も起床時刻は守り、昼寝は控えめに。日中の眠気が強いときは運転を避けてください。</p>`;
      return;
    }
    const changed = p.kind === "review" && p.window !== p.prev;
    el.innerHTML = `<h2>眠る時間の目安${p.kind === "review" ? "（1週間の見直し）" : ""}</h2>
      <p>${esc(p.reason)}</p>
      <p class="plan-big"><b>${bedOf(p.window, p.wake)}</b> に床へ → <b>${p.wake}</b> に起きる</p>
      <p class="hint">床にいる時間 ${fmtDur(p.window)}${changed ? `（これまで ${fmtDur(p.prev)}）` : ""}。眠くなければ床に入る時刻を遅らせても構いませんが、早めないでください。安全のため6時間より短くはしません。</p>
      <button type="button" class="primary-btn" id="acceptPlan">この目安で1週間試す</button>`;
    $("#acceptPlan").addEventListener("click", async () => {
      state.settings.plan = { window: p.window, wake: p.wake, start: todayStr() };
      await saveSettings();
      renderReview();
      toast("目安を設定しました。記録タブの上にも表示されます");
    });
  }

  function crisisBox() {
    return `<div class="crisis"><p><b>つらい気持ちが強いときは、ひとりで抱えずに相談してください。</b></p><p>こころの健康相談統一ダイヤル <b>0570-064-556</b>（お住まいの地域の相談窓口につながります）。命の危険があるときは <b>119</b> へ。</p></div>`;
  }

  function renderFinish() {
    const el = $("#finishCard");
    const total = state.nights.size;
    if (total < PROGRAM_NIGHTS) { el.hidden = true; return; }
    el.hidden = false;
    const cta = SIGNUP_URL
      ? `<a class="primary-btn" href="${esc(SIGNUP_URL)}" target="_blank" rel="noreferrer">次の4週間プログラムの案内を受け取る ↗</a><p class="hint">メールアドレスの登録は外部のフォームで行います。日誌のデータは送られません。</p>`
      : `<p class="soon">次のステップ（4週間のセルフケアプログラム）は準備中です。</p>`;
    el.innerHTML = `<h2>2週間の日誌が完成しました</h2><p>${total}夜分の記録で、あなたの眠りの「型」が見えてきました。下のレポートを見返して、眠る時間の目安を1週間ずつ試していきましょう。</p>${cta}`;
  }

  function buildReport() {
    const today = todayStr();
    const days = Number(state.range);
    const s = summarize(nightsIn(today, days));
    if (!s) return "まだ記録がありません。";
    const lines = [
      `【睡眠日誌のまとめ】${fmtDate(addDays(today, -(days - 1)))}〜${fmtDate(today)}（記録 ${s.count}夜）`,
      `・睡眠効率：${s.se.toFixed(0)}%（目安85%以上）`,
      `・眠っていた時間：平均 ${fmtDur(s.tst)}`,
      `・床にいた時間：平均 ${fmtDur(s.tib)}`,
      `・寝つくまで：平均 ${fmtDur(s.sol)}`,
      `・夜中に起きていた時間：平均 ${fmtDur(s.waso)}（平均 ${s.wakeups.toFixed(1)} 回）`,
      `・起床時刻：平均 ${fromAbs(s.outMean)}${s.outSd != null ? `、ばらつき ±${fmtDur(s.outSd)}` : ""}`,
      `・眠りの満足度：平均 ${s.quality.toFixed(1)} / 5`,
    ];
    const effects = tagEffects(nightsIn(today, days)).filter((e) => Math.abs(e.d) >= 3);
    if (effects.length) lines.push(`・行動との関係（記録上の傾向）：${effects.map((e) => `「${e.t.label}」の夜は ${e.d > 0 ? "+" : "−"}${Math.abs(e.d).toFixed(0)}pt`).join("、")}`);
    const p = state.settings.plan;
    if (p && !state.settings.safety.flagged) lines.push(`・試している目安：${fromAbs(toAbs(p.wake) - p.window)} 就床 → ${p.wake} 起床（${fmtDur(p.window)}、${fmtDate(p.start)}から）`);
    lines.push("", "（ねむり日誌で記録。セルフケア用の記録で、診断ではありません）");
    return lines.join("\n");
  }

  /* ---------- 画面：設定 ---------- */
  function renderSettings() {
    $("#wakeTarget").value = state.settings.wakeTarget;
    const sf = state.settings.safety;
    const hit = SAFETY.filter((q) => sf.answers[q.id]).map((q) => q.text);
    $("#safetyStatus").textContent = sf.flagged
      ? `当てはまる項目：${hit.join(" / ")}。眠る時間を縮める提案は出しません。`
      : "当てはまる項目はありませんでした。状況が変わったらやり直してください。";
  }

  async function exportJson() {
    const data = { app: "sleep-diary", version: 1, exportedAt: new Date().toISOString(), settings: state.settings, nights: [...state.nights.values()].sort((a, b) => (a.date < b.date ? -1 : 1)) };
    download(`sleep-diary-${todayStr()}.json`, JSON.stringify(data, null, 2), "application/json");
  }
  function exportCsv() {
    const q = (v) => `"${String(v).replace(/"/g, '""')}"`;
    const head = ["起きた日", "床に入った", "消灯", "寝つくまで(分)", "目覚めた回数", "夜中に起きていた(分)", "最後に目覚めた", "床から出た", "満足度", "床にいた(分)", "眠っていた(分)", "睡眠効率(%)", "行動", "メモ"];
    const rows = [...state.nights.values()].sort((a, b) => (a.date < b.date ? -1 : 1)).map((n) => {
      const c = calc(n);
      return [n.date, n.bed, n.lightsOff, n.sol, n.wakeups, n.waso, n.finalWake, n.outOfBed, n.quality, c.tib, c.tst, c.se.toFixed(1), n.tags.map((t) => TAG_LABEL[t]).join(" / "), n.note].map(q).join(",");
    });
    download(`sleep-diary-${todayStr()}.csv`, "﻿" + [head.map(q).join(","), ...rows].join("\r\n"), "text/csv");
  }
  function download(name, text, type) {
    const url = URL.createObjectURL(new Blob([text], { type }));
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  async function importJson(e) {
    const file = e.target.files[0];
    e.target.value = "";
    if (!file) return;
    let data;
    try { data = JSON.parse(await file.text()); } catch { toast("JSON として読めませんでした"); return; }
    if (!data || data.app !== "sleep-diary" || !Array.isArray(data.nights)) { toast("ねむり日誌の書き出しファイルではないようです"); return; }
    let ok = 0, ng = 0;
    for (const raw of data.nights) {
      const n = sanitizeNight(raw);
      if (!n) { ng++; continue; }
      await dbPut("nights", n);
      state.nights.set(n.date, n);
      ok++;
    }
    if (data.settings && !state.settings.onboarded) {
      state.settings = sanitizeSettings(data.settings);
      await saveSettings();
    }
    renderCurrent();
    toast(`${ok}夜を読み込みました${ng ? `（読めなかった ${ng}件）` : ""}`);
  }
  async function wipeAll() {
    if (!confirm("この端末の記録と設定をすべて消します。元に戻せません。よろしいですか？")) return;
    await dbClear("nights");
    await dbClear("meta");
    state.nights.clear();
    state.settings = structuredClone(DEFAULT_SETTINGS);
    state.date = todayStr();
    showStart(true);
    toast("すべて削除しました");
  }

  /* ---------- 共通 ---------- */
  let toastTimer;
  function toast(msg) {
    const el = $("#toast");
    el.textContent = msg;
    el.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove("show"), 2600);
  }

  function setView(v) {
    state.view = v;
    for (const b of $$(".tab")) {
      if (b.dataset.view === v) b.setAttribute("aria-current", "page");
      else b.removeAttribute("aria-current");
    }
    for (const sec of $$("#app .view")) sec.hidden = sec.id !== `view-${v}`;
    renderCurrent();
    window.scrollTo({ top: 0 });
  }
  function renderCurrent() {
    if (state.view === "record") renderRecord();
    else if (state.view === "review") renderReview();
    else if (state.view === "settings") renderSettings();
  }

  function bind() {
    $("#safetyForm").addEventListener("submit", submitSafety);
    $$(".tab").forEach((b) => b.addEventListener("click", () => setView(b.dataset.view)));
    $("#prevDay").addEventListener("click", () => { state.date = addDays(state.date, -1); renderRecord(); });
    $("#nextDay").addEventListener("click", () => { if (state.date < todayStr()) { state.date = addDays(state.date, 1); renderRecord(); } });
    $("#goToday").addEventListener("click", () => { state.date = todayStr(); renderRecord(); });
    $("#datePicker").addEventListener("change", (e) => { if (isDate(e.target.value) && e.target.value <= todayStr()) { state.date = e.target.value; renderRecord(); } });
    $("#nightForm").addEventListener("input", updatePreview);
    $("#nightForm").addEventListener("submit", saveNight);
    $("#deleteNight").addEventListener("click", deleteNight);
    $$(".segmented button").forEach((b) => b.addEventListener("click", () => { state.range = b.dataset.range; renderReview(); }));
    $("#copyReport").addEventListener("click", async () => {
      const t = $("#reportText");
      try { await navigator.clipboard.writeText(t.value); } catch { t.select(); document.execCommand("copy"); }
      toast("コピーしました");
    });
    $("#wakeTarget").addEventListener("change", async (e) => {
      if (!isTime(e.target.value)) return;
      state.settings.wakeTarget = e.target.value;
      if (state.settings.plan) state.settings.plan.wake = e.target.value;
      await saveSettings();
      toast("起床時刻を変更しました");
    });
    $("#redoSafety").addEventListener("click", () => showStart(true));
    $("#resetPlan").addEventListener("click", async () => {
      state.settings.plan = null;
      await saveSettings();
      toast("目安をリセットしました。振り返りタブで新しい目安が出ます");
    });
    $("#exportJson").addEventListener("click", exportJson);
    $("#exportCsv").addEventListener("click", exportCsv);
    $("#importJson").addEventListener("change", importJson);
    $("#wipeAll").addEventListener("click", wipeAll);
  }

  async function init() {
    bind();
    try {
      db = await openDB();
      const [nights, settings] = await Promise.all([dbAll("nights"), dbGet("meta", "settings")]);
      for (const raw of nights) { const n = sanitizeNight(raw); if (n) state.nights.set(n.date, n); }
      state.settings = sanitizeSettings(settings);
    } catch (err) {
      console.error(err);
      toast("この端末では保存できません（プライベートブラウズでは使えないことがあります）");
    }
    showStart(!state.settings.onboarded);
    if (state.settings.onboarded) setView("record");
    if ("serviceWorker" in navigator && location.protocol !== "file:") navigator.serviceWorker.register("./sw.js").catch(() => {});
  }

  init();
})();
