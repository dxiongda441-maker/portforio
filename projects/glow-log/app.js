"use strict";

/*
 * Glow Log — 自分磨きの毎日記録
 *
 * データはすべてこの端末の IndexedDB（DB名 "glow-log"）に置く。外部通信はしない。
 *   entries : 1日1件（keyPath = date "YYYY-MM-DD"）
 *   photos  : 写真1枚1件（date + slot。同じ日・同じ種類は上書き）
 *   meta    : "profile"（身長・方針・目標）
 */
(() => {
  const DB_NAME = "glow-log";
  const DB_VERSION = 1;
  const PHOTO_MAX = 1440; // 長辺 px。1枚 300KB 前後に収める
  const PHOTO_QUALITY = 0.85;

  const SLOTS = [
    { id: "face-front", label: "顔・正面", freq: "毎日" },
    { id: "face-side", label: "顔・横", freq: "毎日" },
    { id: "body-front", label: "体・正面", freq: "週1" },
    { id: "body-side", label: "体・横", freq: "週1" },
  ];
  const TIMING_LABEL = { morning: "朝", noon: "昼", evening: "夜", "after-bath": "入浴後", other: "その他" };
  const TRAINING_LABEL = { none: "休み", a: "メニューA", b: "メニューB", upper: "上半身", lower: "下半身", full: "全身", cardio: "有酸素" };
  const HABITS = [
    { id: "sunscreen", label: "日焼け止め" },
    { id: "skincare", label: "朝晩スキンケア" },
    { id: "posture", label: "姿勢・ストレッチ" },
    { id: "grooming", label: "眉・ヒゲの手入れ" },
    { id: "no-late-snack", label: "寝る前に食べない" },
  ];
  const SKIN_TAGS = ["赤み", "ニキビ", "乾燥", "テカリ", "カミソリ負け", "青ヒゲ", "クマ"];
  // 体組成計の値（任意）。家庭用の体組成計は体内の水分で数%ぶれるので、朝の同じ条件での推移で見る。
  const BODY_FIELDS = [
    { key: "bodyFat", label: "体脂肪率", unit: "%", min: 2, max: 60 },
    { key: "muscleMass", label: "筋肉量", unit: "kg", min: 10, max: 150 },
    { key: "visceralFat", label: "内臓脂肪レベル", unit: "", min: 1, max: 30 },
    { key: "bmr", label: "基礎代謝", unit: "kcal", min: 600, max: 4000 },
  ];
  // 血液検査のひな形（血算＋白血球分画）。基準範囲は検査機関ごとに違うので、結果票の値で上書きする。
  const LAB_TEMPLATE = [
    ["白血球数", "/μL"], ["赤血球数", "×10⁴/μL"], ["ヘモグロビン", "g/dL"], ["ヘマトクリット", "%"],
    ["MCV", "fL"], ["MCH", "pg"], ["MCHC", "g/dL"], ["血小板数", "×10⁴/μL"],
    ["好中球", "%"], ["リンパ球", "%"], ["単球", "%"], ["好酸球", "%"], ["好塩基球", "%"],
  ];
  const SKIN_RUBRIC = ["", "炎症が広い・痛い・皮がむける", "ニキビ3個以上、または赤み・カミソリ負けが広い", "ニキビ1〜2個、または赤み・乾燥・テカリのどれかが目立つ", "小さく気になる所が1つ程度", "新しいニキビ・赤みが無く、つっぱりもテカリもほぼ無い"];
  const ENERGY_RUBRIC = ["", "体調不良、何もしたくない", "疲れが抜けない、集中できない", "普通。だるさや眠気がときどき", "ほぼ良い。少し眠い時間があった", "すっきり起きられ、眠気もなく、やる気がある"];
  const DEFAULT_PROFILE = {
    height: null,
    targetWeight: null,
    goal: "lean-bulk",
    proteinPerKg: 1.6,
    sleepTarget: 7,
    trainingTarget: 3,
    stepsTarget: 8000, // 身体活動・運動ガイド2023（成人の目安 約8,000歩）
    cardioTarget: 150, // WHO 2020：中強度の有酸素 週150〜300分
  };

  const state = {
    entries: new Map(),
    photos: [],
    profile: { ...DEFAULT_PROFILE },
    labs: [],
    date: todayStr(),
    view: "today",
    range: "30",
    photoFilter: "all",
    cmpMode: "side",
    urls: new Map(),
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
  function dayDiff(a, b) { return Math.round((parse(b) - parse(a)) / 86400000); }
  function fmtDate(s) { const d = parse(s); return `${d.getMonth() + 1}/${d.getDate()}（${"日月火水木金土"[d.getDay()]}）`; }
  function fmtShort(s) { const d = parse(s); return `${d.getMonth() + 1}/${d.getDate()}`; }

  /* ---------- 数値 ---------- */
  const isNum = (v) => typeof v === "number" && Number.isFinite(v);
  const round = (v, d = 1) => (isNum(v) ? Math.round(v * 10 ** d) / 10 ** d : null);
  const fmt = (v, d = 1) => (isNum(v) ? v.toFixed(d) : "—");
  const signed = (v, d = 1) => (isNum(v) ? `${v > 0 ? "+" : v < 0 ? "−" : "±"}${Math.abs(v).toFixed(d)}` : "—");
  const avg = (arr) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null);

  /* ---------- IndexedDB ---------- */
  function openDB() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const d = req.result;
        if (!d.objectStoreNames.contains("entries")) d.createObjectStore("entries", { keyPath: "date" });
        if (!d.objectStoreNames.contains("photos")) {
          const p = d.createObjectStore("photos", { keyPath: "id", autoIncrement: true });
          p.createIndex("date", "date");
        }
        if (!d.objectStoreNames.contains("meta")) d.createObjectStore("meta");
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  function run(storeName, mode, fn) {
    return new Promise((resolve, reject) => {
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
    const [entries, photos, profile, labs] = await Promise.all([
      run("entries", "readonly", (s) => s.getAll()),
      run("photos", "readonly", (s) => s.getAll()),
      run("meta", "readonly", (s) => s.get("profile")),
      run("meta", "readonly", (s) => s.get("labs")),
    ]);
    state.labs = Array.isArray(labs) ? labs : [];
    state.entries = new Map(entries.map((e) => [e.date, e]));
    state.photos = photos;
    state.profile = { ...DEFAULT_PROFILE, ...(profile || {}) };
  }

  async function putEntry(entry) {
    if (isEmptyEntry(entry)) {
      await run("entries", "readwrite", (s) => s.delete(entry.date));
      state.entries.delete(entry.date);
    } else {
      await run("entries", "readwrite", (s) => s.put(entry));
      state.entries.set(entry.date, entry);
    }
  }

  async function saveProfile() {
    await run("meta", "readwrite", (s) => s.put(state.profile, "profile"));
  }

  async function saveLabs() {
    await run("meta", "readwrite", (s) => s.put(state.labs, "labs"));
  }

  async function savePhoto(date, slot, blob, width, height) {
    const old = state.photos.filter((p) => p.date === date && p.slot === slot);
    for (const p of old) await deletePhoto(p.id, true);
    const record = { date, slot, blob, width, height, createdAt: Date.now() };
    const id = await run("photos", "readwrite", (s) => s.add(record));
    record.id = id;
    state.photos.push(record);
    requestPersist();
    return record;
  }

  async function deletePhoto(id, silent) {
    await run("photos", "readwrite", (s) => s.delete(id));
    state.photos = state.photos.filter((p) => p.id !== id);
    const url = state.urls.get(id);
    if (url) { URL.revokeObjectURL(url); state.urls.delete(id); }
    if (!silent) toast("写真を削除しました");
  }

  function photoUrl(p) {
    if (!state.urls.has(p.id)) state.urls.set(p.id, URL.createObjectURL(p.blob));
    return state.urls.get(p.id);
  }

  let persistAsked = false;
  function requestPersist() {
    if (persistAsked || !navigator.storage || !navigator.storage.persist) return;
    persistAsked = true;
    navigator.storage.persist().catch(() => {});
  }

  /* ---------- 計算 ---------- */
  function isEmptyEntry(e) {
    return !isNum(e.weight) && !isNum(e.waist) && !isNum(e.restingHr) && !isNum(e.steps) && !isNum(e.cardio) && !e.bedTime && !e.wakeTime && !BODY_FIELDS.some((f) => isNum(e[f.key])) && !isNum(e.sleep) && !isNum(e.protein) && !e.training &&
      !(e.habits && e.habits.length) && !isNum(e.skin) && !(e.skinTags && e.skinTags.length) && !isNum(e.energy) && !e.note;
  }

  // トレンド体重：Hacker's Diet 方式の指数平滑（1日あたり10%ずつ実測に寄せる）。日が空いたら空いた分だけ寄せる。
  function weightSeries() {
    const list = [...state.entries.values()].filter((e) => isNum(e.weight)).sort((a, b) => (a.date < b.date ? -1 : 1));
    let trend = null;
    let prevDate = null;
    return list.map((e) => {
      if (trend === null) trend = e.weight;
      else {
        const gap = Math.max(1, dayDiff(prevDate, e.date));
        trend += (1 - Math.pow(0.9, gap)) * (e.weight - trend);
      }
      prevDate = e.date;
      return { date: e.date, weight: e.weight, timing: e.timing || "other", time: e.time || "", trend };
    });
  }

  function trendAt(series, date) {
    let last = null;
    for (const p of series) { if (p.date <= date) last = p; else break; }
    return last;
  }

  // 週あたりの変化：直近28日の実測に回帰直線を引く。朝の記録が4件以上あれば朝だけで計算する（条件をそろえる）。
  function weeklyRate(series, ref) {
    const recent = series.filter((p) => { const d = dayDiff(p.date, ref); return d >= 0 && d < 28; });
    const morning = recent.filter((p) => p.timing === "morning");
    const pts = morning.length >= 4 ? morning : recent;
    if (pts.length < 4) return null;
    const span = dayDiff(pts[0].date, pts[pts.length - 1].date);
    if (span < 6) return null;
    const xs = pts.map((p) => dayDiff(pts[0].date, p.date));
    const ys = pts.map((p) => p.weight);
    const mx = avg(xs);
    const my = avg(ys);
    let num = 0;
    let den = 0;
    xs.forEach((x, i) => { num += (x - mx) * (ys[i] - my); den += (x - mx) ** 2; });
    if (!den) return null;
    return { perWeek: (num / den) * 7, n: pts.length, morningOnly: pts === morning };
  }

  function lastNDays(ref, n) {
    const out = [];
    for (let i = 0; i < n; i += 1) {
      const d = addDays(ref, -i);
      if (state.entries.has(d)) out.push(state.entries.get(d));
    }
    return out;
  }

  function streak(ref) {
    let n = 0;
    let d = ref;
    if (!state.entries.has(d)) d = addDays(d, -1); // 今日まだ書いていなくても昨日までの連続は数える
    while (state.entries.has(d) || state.photos.some((p) => p.date === d)) { n += 1; d = addDays(d, -1); }
    return n;
  }

  function computeStats(ref = todayStr()) {
    const series = weightSeries().filter((p) => p.date <= ref);
    const latest = series[series.length - 1] || null;
    const week = lastNDays(ref, 7);
    const prevWeek = lastNDays(addDays(ref, -7), 7);
    const h = isNum(state.profile.height) ? state.profile.height / 100 : null;
    const trend = latest ? latest.trend : null;
    const weekAgo = trendAt(series, addDays(ref, -7));
    const pick = (list, key) => list.map((e) => e[key]).filter(isNum);
    return {
      series,
      latest,
      trend,
      bmi: h && trend ? trend / (h * h) : null,
      stdWeight: h ? 22 * h * h : null,
      rate: weeklyRate(series, ref),
      change7: latest && weekAgo && weekAgo.date !== latest.date ? latest.trend - weekAgo.trend : null,
      sleepAvg: avg(pick(week, "sleep")),
      sleepN: pick(week, "sleep").length,
      proteinAvg: avg(pick(week, "protein")),
      proteinN: pick(week, "protein").length,
      trainingCount: week.filter((e) => e.training && !["none", "cardio"].includes(e.training)).length,
      trainingLogged: week.filter((e) => e.training).length,
      skinAvg: avg(pick(week, "skin")),
      skinPrev: avg(pick(prevWeek, "skin")),
      energyAvg: avg(pick(week, "energy")),
      habitCount: (id) => week.filter((e) => (e.habits || []).includes(id)).length,
      tagCount: (tag) => week.filter((e) => (e.skinTags || []).includes(tag)).length,
      timings7: new Set(series.filter((p) => dayDiff(p.date, ref) < 7).map((p) => p.timing)),
      stepsAvg: avg(pick(week, "steps")),
      stepsN: pick(week, "steps").length,
      cardioSum: pick(week, "cardio").reduce((a, b) => a + b, 0),
      cardioN: pick(week, "cardio").length,
      rhrAvg: avg(pick(week, "restingHr")),
      rhrN: pick(week, "restingHr").length,
      rhrLatest: (() => { const e = week.find((x) => isNum(x.restingHr)); return e ? e.restingHr : null; })(),
      rhrBase: avg(pick(lastNDays(addDays(ref, -7), 21), "restingHr")),
      days: week.length,
      streak: streak(ref),
      body: latestBody(ref),
      lab: [...state.labs].filter((l) => l.date <= ref).sort((a, b) => (a.date < b.date ? 1 : -1))[0] || null,
    };
  }

  // 直近60日で体組成の値がある最新の記録。除脂肪量とFFMI（除脂肪量÷身長²）も出す。
  function latestBody(ref) {
    const e = [...state.entries.values()]
      .filter((x) => x.date <= ref && dayDiff(x.date, ref) <= 60 && BODY_FIELDS.some((f) => isNum(x[f.key])))
      .sort((a, b) => (a.date < b.date ? 1 : -1))[0];
    if (!e) return null;
    const h = isNum(state.profile.height) ? state.profile.height / 100 : null;
    const w = isNum(e.weight) ? e.weight : null;
    const lbm = w && isNum(e.bodyFat) ? w * (1 - e.bodyFat / 100) : null;
    return { ...e, lbm, ffmi: lbm && h ? lbm / (h * h) : null };
  }

  function labFlag(item) {
    if (!isNum(item.value)) return "";
    if (isNum(item.high) && item.value > item.high) return "high";
    if (isNum(item.low) && item.value < item.low) return "low";
    return "";
  }

  /* ---------- 評価と改善点 ---------- */
  function buildInsights(st) {
    const out = [];
    const add = (level, title, body) => out.push({ level, title, body });
    const p = state.profile;

    if (!st.latest) {
      add("info", "まずは1週間、朝に体重を測る", "ならした体重の増減（週あたりの変化）は、朝の記録が4日分以上たまると出ます。");
    } else {
      if (st.latest.timing !== "morning") {
        add("info", `最新の体重は「${TIMING_LABEL[st.latest.timing] || "その他"}」に測った値`, "夜や入浴後は汗と食事の影響で、朝より0.5〜1.5kgずれやすいです。比べるのは朝どうしで。");
      }
      if (st.timings7.size > 1) {
        add("warn", "測るタイミングがばらついています", "朝・夜・入浴後が混ざると、増減が水分の差なのか本当の変化なのか分かりません。朝のトイレ後・食前にそろえましょう。");
      }
    }

    if (!isNum(p.height)) {
      add("info", "設定で身長を入れてください", "BMI と標準体重の判定に使います。");
    } else if (isNum(st.bmi)) {
      const b = st.bmi;
      if (b < 18.5) add("warn", `BMI ${fmt(b)}：低体重`, "筋肉も脂肪も足りていない状態。食事量を増やし、筋トレで増やした分を筋肉に回しましょう。");
      else if (b < 20) add("info", `BMI ${fmt(b)}：やや細め`, "健康面の問題はない範囲。見た目を変えたいなら、体重を少しずつ増やしながら筋トレするのが近道です。");
      else if (b < 25) add("good", `BMI ${fmt(b)}：普通体重`, `BMI＝体重÷身長²の肥満度。標準体重（BMI22）は ${fmt(st.stdWeight)}kg。ここから先は体重の数字より、筋肉と脂肪の比率（体脂肪率と写真）で判断する段階です。`);
      else add("warn", `BMI ${fmt(b)}：肥満（1度以上）`, "体脂肪率の推移と合わせて、ゆるやかな減量を検討しましょう。");
    }

    if (st.rate) {
      const r = st.rate.perWeek;
      const pct = st.trend ? (r / st.trend) * 100 : 0;
      const basis = st.rate.morningOnly ? "朝の記録" : "全記録";
      if (p.goal === "lean-bulk") {
        if (r < 0.05) add("warn", `増えていません（週 ${signed(r, 2)}kg）`, `筋肉をつけるには少しの余剰カロリーが必要。1日 +200〜300kcal（ご飯軽く1杯、またはプロテイン＋バナナ）を足してみましょう。（${basis}から計算）`);
        else if (r <= 0.35) add("good", `ちょうどいいペース（週 ${signed(r, 2)}kg）`, `リーンバルクの目安は週 +0.1〜0.3kg 前後。このまま筋トレの重量が伸びているかも確認を。（${basis}から計算）`);
        else add("warn", `増え方が速め（週 ${signed(r, 2)}kg）`, "速すぎると脂肪の比率が上がります。お腹まわりや体脂肪率が増えていたら、1日100〜200kcal減らしましょう。");
      } else if (p.goal === "cut") {
        if (r > -0.1) add("info", `ほぼ減っていません（週 ${signed(r, 2)}kg）`, "1日 −300〜500kcal を目安に。たんぱく質と筋トレは減量中も維持します。");
        else if (pct < -1) add("warn", `減り方が速すぎます（週 ${signed(pct, 1)}%）`, "体重の1%/週を超えると筋肉も落ちやすい。食事を少し戻しましょう。");
        else add("good", `順調に減っています（週 ${signed(r, 2)}kg）`, "週に体重の0.5〜1%が目安です。");
      } else if (Math.abs(r) > 0.25) {
        add("info", `維持のつもりで週 ${signed(r, 2)}kg 動いています`, "食事量を少し調整しましょう。");
      } else {
        add("good", "体重は安定しています", "体重を維持しつつ筋トレを続けると、少しずつ体脂肪が減り筋肉が増えます（リコンプ）。写真と体脂肪率で確認を。");
      }
      if (isNum(p.targetWeight) && st.trend) {
        const diff = p.targetWeight - st.trend;
        if (Math.abs(diff) < 0.3) add("good", "目標体重に到達", "次の目標（見た目・筋トレの重量・体脂肪率）を決めましょう。");
        else if (Math.sign(diff) === Math.sign(r) && Math.abs(r) > 0.02) {
          const weeks = Math.ceil(diff / r);
          add("info", `目標 ${fmt(p.targetWeight)}kg まで あと ${signed(diff)}kg`, `今のペースだと約${weeks}週（${Math.round(weeks / 4.3)}か月）。`);
        }
      }
    }

    if (st.sleepN >= 3) {
      if (st.sleepAvg < p.sleepTarget) add("warn", `睡眠が平均 ${fmt(st.sleepAvg)}時間`, `目標 ${p.sleepTarget}時間に届いていません。睡眠不足は肌荒れ・目の充血・筋肉の回復の遅れ・食欲の乱れに直結します。`);
      else add("good", `睡眠は平均 ${fmt(st.sleepAvg)}時間`, "回復の土台はできています。");
    }
    if (st.stepsN >= 3) {
      if (st.stepsAvg < p.stepsTarget) add("info", `歩数は平均 ${Math.round(st.stepsAvg).toLocaleString()}歩`, `目標 ${p.stepsTarget.toLocaleString()}歩。通勤で1駅歩く・休憩中に10分歩くなど、日常で足すのが続けやすい方法です。`);
      else add("good", `歩数は平均 ${Math.round(st.stepsAvg).toLocaleString()}歩`, "日常の活動量は十分です。");
    }
    if (st.cardioN >= 1 || st.days >= 5) {
      if (st.cardioSum < p.cardioTarget) add("info", `有酸素運動 ${st.cardioSum}分／7日`, `健康寿命の目安は週${p.cardioTarget}分（少し息が弾む程度）。心肺の強さは長生きと強く結びつく指標なので、筋トレと別に入れましょう。`);
      else add("good", `有酸素運動 ${st.cardioSum}分／7日`, "心肺の目安を満たしています。");
    }
    if (isNum(st.rhrLatest) && isNum(st.rhrBase) && st.rhrLatest - st.rhrBase >= 5) {
      add("warn", `安静時心拍がいつもより高め（${st.rhrLatest} ／ 普段 ${Math.round(st.rhrBase)}）`, "睡眠不足・疲れ・飲酒・体調不良のサインのことが多いです。筋トレは軽めにして、早めに寝ましょう。");
    } else if (st.rhrN >= 3) {
      add(st.rhrAvg <= 65 ? "good" : "info", `安静時心拍は平均 ${Math.round(st.rhrAvg)}拍/分`, st.rhrAvg <= 65 ? "心肺の状態は良好な範囲です。" : "有酸素運動を続けると、少しずつ下がっていきます。");
    }

    const b = st.body;
    if (b) {
      const cond = b.timing && b.timing !== "morning" ? `（${fmtShort(b.date)}・${TIMING_LABEL[b.timing] || "その他"}の測定。朝の値と比べると水分の分ずれます）` : `（${fmtShort(b.date)}の測定）`;
      if (isNum(b.ffmi)) {
        const f = round(b.ffmi, 1); // 表示（小数1桁）と判定をそろえる
        if (f < 18) add("info", `FFMI ${fmt(f)}：筋肉はまだ少なめ`, `除脂肪量 ${fmt(b.lbm)}kg。筋トレで増やす余地が大きい段階です。${cond}`);
        else if (f < 20) add("info", `FFMI ${fmt(f)}：平均的`, `除脂肪量 ${fmt(b.lbm)}kg。鍛えていない〜始めたばかりの人の範囲。20前後まで上がると服の上からも体格が変わって見えます。${cond}`);
        else if (f < 22) add("good", `FFMI ${fmt(f)}：鍛えている人の範囲`, `除脂肪量 ${fmt(b.lbm)}kg。${cond}`);
        else add("good", `FFMI ${fmt(f)}：かなり筋肉が多い`, `除脂肪量 ${fmt(b.lbm)}kg。${cond}`);
      }
      if (isNum(b.bodyFat)) {
        const bf = b.bodyFat;
        const note = "家庭用の体組成計は体内の水分で数%ぶれます。1回の値ではなく、朝の同じ条件での推移で判断を。";
        if (bf < 10) add("info", `体脂肪率 ${fmt(bf)}%：かなり低い`, note);
        else if (bf < 20) add("good", `体脂肪率 ${fmt(bf)}%：標準の範囲`, `リーンバルクを始めて問題ない水準です。${note}`);
        else if (bf < 25) add("info", `体脂肪率 ${fmt(bf)}%：やや高め`, `増量より、体重維持で筋トレする方が見た目は早く変わります。${note}`);
        else add("warn", `体脂肪率 ${fmt(bf)}%：高め`, `ゆるやかな減量を検討しましょう。${note}`);
      }
      if (isNum(b.visceralFat)) {
        if (b.visceralFat >= 10) add("warn", `内臓脂肪レベル ${fmt(b.visceralFat)}：高め`, "多くの体組成計で10以上は「やや過剰」。食事と運動の見直しを。");
        else add("good", `内臓脂肪レベル ${fmt(b.visceralFat)}：標準`, "多くの体組成計で1〜9が標準です。");
      }
      if (isNum(b.bmr)) {
        const keep = Math.round((b.bmr * 1.55) / 50) * 50;
        const plan = { "lean-bulk": [keep + 200, keep + 300, "増量なら"], cut: [keep - 500, keep - 300, "減量なら"], maintain: [keep - 100, keep + 100, "維持なら"] }[p.goal] || [keep, keep, ""];
        add("info", `1日の食事の目安：約${plan[0]}〜${plan[1]}kcal`, `基礎代謝 ${b.bmr}kcal × 1.55（週3回ほど運動する人の係数）≒ 維持 ${keep}kcal。${plan[2]}この範囲で始め、週あたりの体重変化を見て100〜200kcalずつ調整します。`);
      }
    }

    if (st.lab) {
      const out = st.lab.items.filter((it) => labFlag(it));
      const age = dayDiff(st.lab.date, todayStr());
      if (out.length) {
        add("info", `血液検査（${st.lab.date}）で基準外：${out.map((it) => `${it.name}${labFlag(it) === "high" ? "↑" : "↓"}`).join("・")}`,
          "わずかな外れは、風邪の後や採血時の体調で一時的に出ることも多いです。医師から説明があればそれを優先し、気になる症状が続くときや次の健診で再確認を。");
      } else {
        add("good", `血液検査（${st.lab.date}）は記録した項目がすべて基準内`, "");
      }
      if (age > 365) add("info", "血液検査から1年以上たっています", "年1回の健診で、血算に加えて脂質・肝機能・腎機能・血糖も見ておくと安心です（増量で食事が変わるときは特に脂質）。");
    }

    const proteinGoal = st.trend ? Math.round(st.trend * p.proteinPerKg) : null;
    if (st.proteinN >= 3 && proteinGoal) {
      if (st.proteinAvg < proteinGoal) add("warn", `たんぱく質が平均 ${Math.round(st.proteinAvg)}g`, `目標は ${proteinGoal}g/日（体重×${p.proteinPerKg}g）。卵・鶏むね・納豆・ギリシャヨーグルト・プロテインで1日あと${Math.round(proteinGoal - st.proteinAvg)}g。`);
      else add("good", `たんぱく質は平均 ${Math.round(st.proteinAvg)}g`, `目標 ${proteinGoal}g/日を満たしています。`);
    } else if (proteinGoal) {
      add("info", `たんぱく質の目標は1日 ${proteinGoal}g`, "ざっくりでいいので記録すると、足りているか判定できます。");
    }

    if (st.trainingLogged >= 2 || st.trainingCount > 0) {
      if (st.trainingCount >= p.trainingTarget) add("good", `筋トレ ${st.trainingCount}回／7日`, "目標回数を達成。重量か回数を少しずつ伸ばすことを意識しましょう。");
      else add("warn", `筋トレ ${st.trainingCount}回／7日`, `目標は週${p.trainingTarget}回。体型を変える一番の要素なので、短時間でも回数を優先。`);
    }

    const sun = st.habitCount("sunscreen");
    if (st.days >= 3 && sun < Math.min(5, st.days)) {
      add("info", `日焼け止めは7日中 ${sun}日`, "肌の老化（シミ・くすみ・毛穴の目立ち）の最大要因は紫外線。曇りの日も毎朝。");
    }

    if (isNum(st.skinAvg)) {
      if (isNum(st.skinPrev) && st.skinAvg - st.skinPrev >= 0.5) add("good", `肌の調子が上向き（${fmt(st.skinPrev)} → ${fmt(st.skinAvg)}）`, "今週変えたことをメモに残しておくと再現できます。");
      else if (isNum(st.skinPrev) && st.skinPrev - st.skinAvg >= 0.5) add("warn", `肌の調子が下向き（${fmt(st.skinPrev)} → ${fmt(st.skinAvg)}）`, "睡眠・食事・新しく使い始めた物・ヒゲ剃りの方法をメモと照らし合わせてください。");
    }
    if (st.tagCount("カミソリ負け") >= 2 || st.tagCount("青ヒゲ") >= 3) {
      add("info", "ヒゲの悩みが続いています", "T字カミソリならシェービング剤＋毛の流れに沿って。電気シェーバーへの切り替えや、医療脱毛（ヒゲ）も選択肢です。");
    }
    if (st.tagCount("ニキビ") >= 3 || st.tagCount("赤み") >= 4) {
      add("warn", "ニキビ・赤みが続いています", "2〜3週間続くなら皮膚科へ。保険診療で外用薬（アダパレンなど）を出してもらえます。");
    }

    SLOTS.forEach((s) => {
      const last = state.photos.filter((ph) => ph.slot === s.id).map((ph) => ph.date).sort().pop();
      const limit = s.freq === "週1" ? 8 : 3;
      if (last && dayDiff(last, todayStr()) > limit) add("info", `「${s.label}」の写真が${dayDiff(last, todayStr())}日空いています`, s.freq === "週1" ? "体は週1回、同じ曜日・同じ条件で撮ると変化が比べやすいです。" : "顔は毎日撮ると肌の波が見えます。");
    });

    if (st.streak >= 7) add("good", `${st.streak}日連続で記録中`, "続いていること自体が一番の成果です。");

    const order = { warn: 0, info: 1, good: 2 };
    return out.sort((a, b) => order[a.level] - order[b.level]);
  }

  /* ---------- 共通 UI ---------- */
  let toastTimer = null;
  function toast(msg) {
    const el = $("#toast");
    el.textContent = msg;
    el.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove("show"), 2000);
  }

  function el(tag, attrs = {}, children = []) {
    const node = document.createElement(tag);
    Object.entries(attrs).forEach(([k, v]) => {
      if (v === null || v === undefined || v === false) return;
      if (k === "class") node.className = v;
      else if (k === "text") node.textContent = v;
      else node.setAttribute(k, v === true ? "" : v);
    });
    [].concat(children).forEach((c) => { if (c) node.append(c); });
    return node;
  }

  function showView(view) {
    state.view = view;
    $$(".tab").forEach((t) => t.toggleAttribute("aria-current", false));
    const tab = $(`.tab[data-view="${view}"]`);
    if (tab) tab.setAttribute("aria-current", "page");
    $$(".view").forEach((v) => { v.hidden = v.id !== `view-${view}`; });
    render();
    window.scrollTo(0, 0);
  }

  function render() {
    if (state.view === "today") renderToday();
    if (state.view === "trends") renderTrends();
    if (state.view === "photos") renderPhotos();
    if (state.view === "compare") renderCompare();
    if (state.view === "settings") renderSettings();
  }

  /* ---------- 今日 ---------- */
  function buildFormControls() {
    const habitBox = $("#habitChips");
    HABITS.forEach((h) => habitBox.append(el("label", { class: "chip" }, [el("input", { type: "checkbox", name: "habits", value: h.id }), el("span", { text: h.label })])));
    const tagBox = $("#skinTags");
    SKIN_TAGS.forEach((t) => tagBox.append(el("label", { class: "chip" }, [el("input", { type: "checkbox", name: "skinTags", value: t }), el("span", { text: t })])));
    [["#skinScale", "skin"], ["#energyScale", "energy"]].forEach(([sel, name]) => {
      const box = $(sel);
      for (let i = 1; i <= 5; i += 1) {
        box.append(el("label", { class: "scale-item" }, [el("input", { type: "radio", name, value: String(i) }), el("span", { text: String(i) })]));
      }
    });
  }

  function fillForm() {
    const f = $("#entryForm");
    const e = state.entries.get(state.date) || {};
    const setNum = (name, v) => { f.elements[name].value = isNum(v) ? String(v) : ""; };
    setNum("weight", e.weight);
    f.elements.time.value = e.time || "";
    f.elements.bedTime.value = e.bedTime || "";
    f.elements.wakeTime.value = e.wakeTime || "";
    setNum("restingHr", e.restingHr);
    setNum("steps", e.steps);
    setNum("cardio", e.cardio);
    setNum("sleep", e.sleep);
    setNum("protein", e.protein);
    BODY_FIELDS.forEach((b) => setNum(b.key, e[b.key]));
    if (BODY_FIELDS.some((b) => isNum(e[b.key]))) $("#bodyCompBox").open = true;
    f.elements.timing.value = e.timing || defaultTiming();
    f.elements.training.value = e.training || "";
    f.elements.note.value = e.note || "";
    $$('#habitChips input').forEach((i) => { i.checked = (e.habits || []).includes(i.value); });
    $$('#skinTags input').forEach((i) => { i.checked = (e.skinTags || []).includes(i.value); });
    $$('input[name="skin"]').forEach((i) => { i.checked = Number(i.value) === e.skin; });
    $$('input[name="energy"]').forEach((i) => { i.checked = Number(i.value) === e.energy; });
    updateScaleDesc();
    $("#saveStatus").textContent = e.updatedAt ? `保存済み ${new Date(e.updatedAt).toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" })}` : "";
  }

  function defaultTiming() {
    if (state.date !== todayStr()) return "morning";
    return timingFromHour(new Date().getHours());
  }

  function timingFromHour(h) {
    if (h >= 4 && h < 11) return "morning";
    if (h >= 11 && h < 16) return "noon";
    return "evening";
  }

  function nowHHMM() { const d = new Date(); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; }

  // 体重を入れたら時刻を自動で入れる。寝た・起きた時刻から睡眠時間の空欄を埋める（あとで実測値に直せる）。
  function onFormInput(ev) {
    const f = $("#entryForm");
    const name = ev.target && ev.target.name;
    if (name === "weight" && f.elements.weight.value && !f.elements.time.value && state.date === todayStr()) {
      f.elements.time.value = nowHHMM();
    }
    if (name === "time" && f.elements.time.value && !state.entries.get(state.date)) {
      f.elements.timing.value = timingFromHour(Number(f.elements.time.value.slice(0, 2)));
    }
    if ((name === "bedTime" || name === "wakeTime") && f.elements.bedTime.value && f.elements.wakeTime.value && !f.elements.sleep.value) {
      const toMin = (v) => Number(v.slice(0, 2)) * 60 + Number(v.slice(3, 5));
      let diff = toMin(f.elements.wakeTime.value) - toMin(f.elements.bedTime.value);
      if (diff <= 0) diff += 24 * 60;
      f.elements.sleep.value = String(Math.round((diff / 60) * 4) / 4);
    }
    if (name === "skin" || name === "energy") updateScaleDesc();
    scheduleSave();
  }

  function updateScaleDesc() {
    const v = (n) => { const c = $(`input[name="${n}"]:checked`); return c ? Number(c.value) : 0; };
    $("#skinDesc").textContent = v("skin") ? `${v("skin")}：${SKIN_RUBRIC[v("skin")]}` : "";
    $("#energyDesc").textContent = v("energy") ? `${v("energy")}：${ENERGY_RUBRIC[v("energy")]}` : "";
  }

  function collectForm() {
    const f = $("#entryForm");
    const num = (name, min, max) => {
      const raw = f.elements[name].value;
      if (raw === "") return null;
      const v = Number(raw);
      return isNum(v) && v >= min && v <= max ? v : null;
    };
    const radio = (name) => { const c = $(`input[name="${name}"]:checked`); return c ? Number(c.value) : null; };
    const weight = num("weight", 20, 250);
    return {
      date: state.date,
      weight: weight === null ? null : round(weight, 2),
      timing: f.elements.timing.value,
      time: /^\d{2}:\d{2}$/.test(f.elements.time.value) ? f.elements.time.value : "",
      bedTime: /^\d{2}:\d{2}$/.test(f.elements.bedTime.value) ? f.elements.bedTime.value : "",
      wakeTime: /^\d{2}:\d{2}$/.test(f.elements.wakeTime.value) ? f.elements.wakeTime.value : "",
      restingHr: num("restingHr", 25, 140),
      steps: num("steps", 0, 100000),
      cardio: num("cardio", 0, 600),
      sleep: num("sleep", 0, 24),
      training: f.elements.training.value,
      protein: num("protein", 0, 500),
      ...Object.fromEntries(BODY_FIELDS.map((b) => [b.key, num(b.key, b.min, b.max)])),
      habits: $$('#habitChips input:checked').map((i) => i.value),
      skin: radio("skin"),
      skinTags: $$('#skinTags input:checked').map((i) => i.value),
      energy: radio("energy"),
      note: f.elements.note.value.trim(),
      updatedAt: Date.now(),
    };
  }

  let saveTimer = null;
  function scheduleSave() {
    clearTimeout(saveTimer);
    $("#saveStatus").textContent = "入力中…";
    saveTimer = setTimeout(async () => {
      try {
        const entry = collectForm();
        await putEntry(entry);
        requestPersist();
        $("#saveStatus").textContent = `保存済み ${new Date().toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" })}`;
        renderSummary();
      } catch (err) {
        $("#saveStatus").textContent = "保存できませんでした（容量不足やプライベートブラウズの可能性）";
      }
    }, 400);
  }

  function renderSummary() {
    const st = computeStats(state.date);
    const box = $("#summaryCards");
    box.replaceChildren();
    const card = (label, value, unit, sub) => el("div", { class: "summary" }, [
      el("p", { class: "label", text: label }),
      el("p", { class: "value" }, [document.createTextNode(value), unit ? el("small", { text: unit }) : null]),
      sub ? el("p", { class: "sub", text: sub }) : null,
    ]);
    box.append(
      card("ならした体重", fmt(st.trend), "kg", st.latest ? `実測 ${fmt(st.latest.weight)}（${fmtShort(st.latest.date)}${st.latest.time ? ` ${st.latest.time}` : ""}）` : "記録なし"),
      card("BMI（肥満度）", fmt(st.bmi), "", isNum(st.stdWeight) ? "体重÷身長²。18.5〜25未満が普通、目標21〜23" : "身長は設定から"),
      card("週あたりの変化", st.rate ? signed(st.rate.perWeek, 2) : "—", st.rate ? "kg" : "", st.rate ? (st.rate.morningOnly ? "朝の記録から" : "全記録から") : "朝の記録4日分〜"),
      card("連続記録", String(st.streak), "日", `7日中 ${st.days}日記録`),
    );
  }

  function renderSlots() {
    const grid = $("#slotGrid");
    grid.replaceChildren();
    SLOTS.forEach((s) => {
      const photo = state.photos.find((p) => p.date === state.date && p.slot === s.id);
      const btn = el("button", { type: "button", class: "slot", "aria-label": `${s.label}を${photo ? "撮り直す・見る" : "撮る"}` });
      if (photo) {
        btn.append(el("img", { src: photoUrl(photo), alt: `${fmtDate(state.date)}の${s.label}` }), el("span", { class: "slot-label", text: s.label }));
        btn.addEventListener("click", () => openLightbox(photo));
      } else {
        btn.append(el("span", { class: "slot-empty" }, [el("b", { text: "+" }), el("span", { text: s.label }), el("span", { class: "slot-freq", text: `目安：${s.freq}` })]));
        btn.addEventListener("click", () => openCamera(s.id));
      }
      grid.append(btn);
    });
  }

  function renderToday() {
    $("#datePicker").value = state.date;
    $("#datePicker").max = todayStr();
    $("#nextDay").disabled = state.date >= todayStr();
    fillForm();
    renderSummary();
    renderSlots();
  }

  /* ---------- 推移と評価 ---------- */
  function renderChart(series) {
    const box = $("#weightChart");
    box.replaceChildren();
    const ref = todayStr();
    const pts = state.range === "all" ? series : series.filter((p) => dayDiff(p.date, ref) < Number(state.range));
    if (!pts.length) { box.append(el("p", { class: "chart-empty", text: "この期間の体重の記録はまだありません。" })); return; }

    // 実際の表示幅で描く（viewBox を縮めると目盛りの文字が小さくなりすぎるため）
    const W = Math.max(300, Math.round(box.clientWidth || 640));
    const H = W < 500 ? 220 : 250, pl = 40, pr = 14, pt = 14, pb = 28;
    const startDate = state.range === "all" ? pts[0].date : addDays(ref, -(Number(state.range) - 1));
    const span = Math.max(6, dayDiff(startDate, ref));
    const vals = pts.flatMap((p) => [p.weight, p.trend]);
    const target = state.profile.targetWeight;
    let lo = Math.min(...vals);
    let hi = Math.max(...vals);
    const showTarget = isNum(target) && target > lo - 3 && target < hi + 3;
    if (showTarget) { lo = Math.min(lo, target); hi = Math.max(hi, target); }
    lo -= 0.4; hi += 0.4;
    if (hi - lo < 2) { const mid = (hi + lo) / 2; lo = mid - 1; hi = mid + 1; }
    const x = (d) => pl + (dayDiff(startDate, d) / span) * (W - pl - pr);
    const y = (v) => pt + ((hi - v) / (hi - lo)) * (H - pt - pb);

    const NS = "http://www.w3.org/2000/svg";
    const s = (tag, attrs) => { const n = document.createElementNS(NS, tag); Object.entries(attrs).forEach(([k, v]) => n.setAttribute(k, v)); return n; };
    const svg = s("svg", { viewBox: `0 0 ${W} ${H}`, role: "img", "aria-label": `体重の推移。最新のならした体重は ${fmt(pts[pts.length - 1].trend)}kg` });

    const range = hi - lo;
    const step = range > 12 ? 5 : range > 6 ? 2 : range > 3 ? 1 : 0.5;
    for (let v = Math.ceil(lo / step) * step; v <= hi; v += step) {
      svg.append(s("line", { class: "grid", x1: pl, x2: W - pr, y1: y(v), y2: y(v) }));
      const t = s("text", { class: "axis-label", x: pl - 6, y: y(v) + 4, "text-anchor": "end" });
      t.textContent = step < 1 ? v.toFixed(1) : String(v);
      svg.append(t);
    }
    [startDate, addDays(startDate, Math.round(span / 2)), addDays(startDate, span)].forEach((d, i) => {
      const t = s("text", { class: "axis-label", x: x(d), y: H - 8, "text-anchor": ["start", "middle", "end"][i] });
      t.textContent = fmtShort(d);
      svg.append(t);
    });
    if (showTarget) svg.append(s("line", { class: "target", x1: pl, x2: W - pr, y1: y(target), y2: y(target) }));
    svg.append(s("polyline", { class: "trend", points: pts.map((p) => `${x(p.date).toFixed(1)},${y(p.trend).toFixed(1)}`).join(" ") }));
    pts.forEach((p) => {
      const c = s("circle", { class: p.timing === "morning" ? "dot" : "dot hollow", cx: x(p.date), cy: y(p.weight), r: pts.length > 60 ? 2.5 : 3.5 });
      const title = s("title", {});
      title.textContent = `${fmtDate(p.date)}${p.time ? ` ${p.time}` : ""} ${fmt(p.weight)}kg（${TIMING_LABEL[p.timing] || "その他"}）／ならした体重 ${fmt(p.trend)}kg`;
      c.append(title);
      svg.append(c);
    });
    box.append(svg);
  }

  function renderStats(st) {
    const list = $("#statsList");
    list.replaceChildren();
    const p = state.profile;
    const proteinGoal = st.trend ? Math.round(st.trend * p.proteinPerKg) : null;
    const rows = [
      ["ならした体重", st.trend ? `${fmt(st.trend)} kg` : "—"],
      ["7日間の変化（ならした体重）", st.change7 !== null ? `${signed(st.change7, 2)} kg` : "—"],
      ["週あたりの変化", st.rate ? `${signed(st.rate.perWeek, 2)} kg` : "—"],
      ["BMI（体重÷身長²）／ 標準体重", isNum(st.bmi) ? `${fmt(st.bmi)} ／ ${fmt(st.stdWeight)} kg` : "—"],
      ["睡眠 平均 ／ 目標", `${isNum(st.sleepAvg) ? fmt(st.sleepAvg) : "—"} ／ ${p.sleepTarget}〜9 時間`],
      ["安静時心拍 平均", isNum(st.rhrAvg) ? `${Math.round(st.rhrAvg)} 拍/分` : "—"],
      ["歩数 平均 ／ 目標", `${isNum(st.stepsAvg) ? Math.round(st.stepsAvg).toLocaleString() : "—"} ／ ${p.stepsTarget.toLocaleString()} 歩`],
      ["有酸素運動 合計 ／ 目標", `${st.cardioSum} ／ ${p.cardioTarget} 分`],
      ["たんぱく質 平均 ／ 目標", `${isNum(st.proteinAvg) ? Math.round(st.proteinAvg) : "—"} ／ ${proteinGoal || "—"} g`],
      ["筋トレ回数 ／ 目標", `${st.trainingCount} ／ ${p.trainingTarget} 回`],
      ["日焼け止め", `${st.habitCount("sunscreen")} ／ 7 日`],
      ["肌の調子 平均（前週）", isNum(st.skinAvg) ? `${fmt(st.skinAvg)}（${fmt(st.skinPrev)}）` : "—"],
      ["体調・気分 平均", isNum(st.energyAvg) ? fmt(st.energyAvg) : "—"],
    ];
    const b = st.body;
    if (b) {
      rows.push([`体組成（${fmtShort(b.date)}）体脂肪率 ／ 筋肉量 （目標 12〜17%）`, `${isNum(b.bodyFat) ? `${fmt(b.bodyFat)}%` : "—"} ／ ${isNum(b.muscleMass) ? `${fmt(b.muscleMass)}kg` : "—"}`]);
      rows.push(["除脂肪量 ／ FFMI", `${isNum(b.lbm) ? `${fmt(b.lbm)}kg` : "—"} ／ ${isNum(b.ffmi) ? fmt(b.ffmi) : "—"}`]);
      rows.push(["内臓脂肪レベル ／ 基礎代謝", `${isNum(b.visceralFat) ? fmt(b.visceralFat) : "—"} ／ ${isNum(b.bmr) ? `${b.bmr}kcal` : "—"}`]);
    }
    rows.forEach(([k, v]) => list.append(el("dt", { text: k }), el("dd", { text: v })));
  }

  function renderInsights(st) {
    const list = $("#insightList");
    list.replaceChildren();
    buildInsights(st).forEach((i) => list.append(el("li", { class: `insight ${i.level}` }, [el("p", { class: "ttl", text: i.title }), el("p", { class: "body", text: i.body })])));
  }

  function consultText(st) {
    const p = state.profile;
    const goalLabel = { "lean-bulk": "筋肉をつけて増やす（リーンバルク）", maintain: "維持して体を整える", cut: "減量" }[p.goal];
    const lines = [];
    lines.push("自分磨きの記録です。この内容から、体・肌・生活習慣の評価と、来週やるべき改善点を3つに絞って教えてください。");
    lines.push("");
    lines.push(`身長: ${isNum(p.height) ? `${p.height}cm` : "未設定"} / 方針: ${goalLabel} / 目標体重: ${isNum(p.targetWeight) ? `${p.targetWeight}kg` : "未設定"}`);
    lines.push(`ならした体重（日々のブレをならした値）: ${fmt(st.trend)}kg / BMI: ${fmt(st.bmi)} / 週あたり: ${st.rate ? `${signed(st.rate.perWeek, 2)}kg` : "不明"}`);
    if (st.body) {
      const b = st.body;
      lines.push(`体組成（${b.date}・${TIMING_LABEL[b.timing] || "-"}）: 体脂肪率 ${fmt(b.bodyFat)}% / 筋肉量 ${fmt(b.muscleMass)}kg / 内臓脂肪 ${fmt(b.visceralFat)} / 基礎代謝 ${isNum(b.bmr) ? b.bmr : "-"}kcal / FFMI ${fmt(b.ffmi)}`);
    }
    if (st.lab) {
      const out = st.lab.items.filter((it) => labFlag(it));
      lines.push(`血液検査（${st.lab.date}）: ${out.length ? `基準外 ${out.map((it) => `${it.name} ${it.value}${it.unit || ""}（基準 ${isNum(it.low) ? it.low : ""}〜${isNum(it.high) ? it.high : ""}）`).join("、")}` : "記録した項目はすべて基準内"}`);
    }
    lines.push("");
    lines.push("日付 | 体重(時刻・タイミング) | ならした体重 | 睡眠h | 安静時心拍 | 歩数 | 有酸素分 | たんぱく質g | 筋トレ | 肌1-5 | 気になる所 | 体調 | できたこと | メモ");
    const series = weightSeries();
    for (let i = 13; i >= 0; i -= 1) {
      const d = addDays(todayStr(), -i);
      const e = state.entries.get(d);
      if (!e) continue;
      const tr = series.find((s) => s.date === d);
      lines.push([
        fmtShort(d),
        isNum(e.weight) ? `${fmt(e.weight)}(${e.time ? `${e.time} ` : ""}${TIMING_LABEL[e.timing] || "-"})` : "-",
        tr ? fmt(tr.trend) : "-",
        isNum(e.sleep) ? e.sleep : "-",
        isNum(e.restingHr) ? e.restingHr : "-",
        isNum(e.steps) ? e.steps : "-",
        isNum(e.cardio) ? e.cardio : "-",
        isNum(e.protein) ? e.protein : "-",
        e.training ? TRAINING_LABEL[e.training] : "-",
        isNum(e.skin) ? e.skin : "-",
        (e.skinTags || []).join("・") || "-",
        isNum(e.energy) ? e.energy : "-",
        (e.habits || []).map((h) => (HABITS.find((x) => x.id === h) || {}).label).filter(Boolean).join("・") || "-",
        e.note ? e.note.replace(/\s+/g, " ") : "-",
      ].join(" | "));
    }
    return lines.join("\n");
  }

  function renderTrends() {
    const st = computeStats();
    $$("[data-range]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.range === state.range)));
    renderChart(st.series);
    renderStats(st);
    renderInsights(st);
    renderLabs();
    $("#consultText").value = consultText(st);
  }

  /* ---------- 血液検査 ---------- */
  const normName = (n) => String(n || "").replace(/[（(].*?[)）]/g, "").replace(/\s/g, "");

  function renderLabs() {
    const box = $("#labList");
    box.replaceChildren();
    const labs = [...state.labs].sort((a, b) => (a.date < b.date ? 1 : -1));
    if (!labs.length) { box.append(el("p", { class: "empty", text: "まだ記録がありません。下の「検査結果を追加する」から入れられます。" })); return; }
    labs.forEach((lab, idx) => {
      const prev = labs[idx + 1];
      const table = el("table", { class: "lab-table" });
      table.append(el("thead", {}, [el("tr", {}, [el("th", { text: "項目" }), el("th", { text: "結果" }), el("th", { text: "基準範囲" }), el("th", { text: "前回" })])]));
      const tbody = el("tbody");
      lab.items.forEach((it) => {
        const flag = labFlag(it);
        const before = prev && prev.items.find((x) => normName(x.name) === normName(it.name));
        const range = isNum(it.low) || isNum(it.high) ? `${isNum(it.low) ? it.low : ""}〜${isNum(it.high) ? it.high : ""}` : "—";
        tbody.append(el("tr", { class: flag ? `flag-${flag}` : "" }, [
          el("th", { scope: "row", text: it.name }),
          el("td", { text: `${isNum(it.value) ? it.value : "—"}${flag === "high" ? " ↑" : flag === "low" ? " ↓" : ""}` }),
          el("td", {}, [document.createTextNode(range), it.unit ? el("small", { class: "unit", text: it.unit }) : null]),
          el("td", { text: before && isNum(before.value) ? String(before.value) : "—" }),
        ]));
      });
      table.append(tbody);
      const del = el("button", { type: "button", class: "link-btn dark", text: "この記録を削除" });
      del.addEventListener("click", async () => {
        if (!window.confirm(`${lab.date} の検査記録を削除しますか？`)) return;
        state.labs = state.labs.filter((x) => x.id !== lab.id);
        await saveLabs();
        renderTrends();
      });
      const out = lab.items.filter((it) => labFlag(it)).length;
      const det = el("details", { class: "lab-record" }, [
        el("summary", {}, [el("strong", { text: lab.date.replace(/-/g, "/") }), document.createTextNode(`　${lab.place || ""}　`), el("span", { class: out ? "badge warn" : "badge good", text: out ? `基準外 ${out}` : "すべて基準内" })]),
        el("div", { class: "table-wrap" }, [table]),
        lab.note ? el("p", { class: "hint", text: lab.note }) : null,
        del,
      ]);
      if (idx === 0) det.open = true;
      box.append(det);
    });
  }

  function addLabRow(name = "", unit = "", value = "", low = "", high = "") {
    const row = el("div", { class: "lab-row" });
    [["name", "項目名", "text", name], ["value", "結果", "number", value], ["unit", "単位", "text", unit], ["low", "下限", "number", low], ["high", "上限", "number", high]].forEach(([k, ph, type, v]) => {
      row.append(el("input", { class: `lab-${k}`, type, placeholder: ph, "aria-label": ph, value: v, step: type === "number" ? "any" : null, inputmode: type === "number" ? "decimal" : null }));
    });
    const rm = el("button", { type: "button", class: "icon-btn small", "aria-label": "この行を消す", text: "×" });
    rm.addEventListener("click", () => row.remove());
    row.append(rm);
    $("#labRows").append(row);
  }

  async function saveLabFromForm() {
    const date = $("#labDate").value;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) { toast("採血日を入れてください"); return; }
    const n = (v) => (v === "" || !isNum(Number(v)) ? null : Number(v));
    const items = $$("#labRows .lab-row").map((r) => ({
      name: $(".lab-name", r).value.trim(), value: n($(".lab-value", r).value), unit: $(".lab-unit", r).value.trim(),
      low: n($(".lab-low", r).value), high: n($(".lab-high", r).value),
    })).filter((it) => it.name && isNum(it.value));
    if (!items.length) { toast("結果が入った項目がありません"); return; }
    state.labs.push({ id: `lab-${date}-${Date.now()}`, date, place: $("#labPlace").value.trim(), items });
    await saveLabs();
    $("#labRows").replaceChildren();
    $("#labPlace").value = "";
    toast("検査結果を保存しました");
    renderTrends();
  }

  /* ---------- 写真一覧 ---------- */
  function renderPhotos() {
    const filter = $("#photoFilter");
    filter.replaceChildren();
    [{ id: "all", label: "すべて" }, ...SLOTS].forEach((s) => {
      const b = el("button", { type: "button", "aria-pressed": String(state.photoFilter === s.id), text: s.label });
      b.addEventListener("click", () => { state.photoFilter = s.id; renderPhotos(); });
      filter.append(b);
    });
    const list = $("#photoList");
    list.replaceChildren();
    const photos = state.photos.filter((p) => state.photoFilter === "all" || p.slot === state.photoFilter);
    if (!photos.length) { list.append(el("p", { class: "empty", text: "まだ写真がありません。「今日」タブの写真枠から撮れます。" })); return; }
    const dates = [...new Set(photos.map((p) => p.date))].sort().reverse();
    dates.forEach((d) => {
      const row = el("div", { class: "photo-row" });
      SLOTS.forEach((s) => {
        const p = photos.find((ph) => ph.date === d && ph.slot === s.id);
        if (!p) return;
        const b = el("button", { type: "button", class: "photo-thumb", "aria-label": `${fmtDate(d)} ${s.label}を拡大` }, [el("img", { src: photoUrl(p), alt: "", loading: "lazy" }), el("span", { text: s.label })]);
        b.addEventListener("click", () => openLightbox(p));
        row.append(b);
      });
      const e = state.entries.get(d);
      list.append(el("section", { class: "photo-day" }, [el("h3", { text: `${fmtDate(d)}${e && isNum(e.weight) ? `　${fmt(e.weight)}kg` : ""}` }), row]));
    });
  }

  /* ---------- 比較 ---------- */
  function renderCompare() {
    const slotSel = $("#cmpSlot");
    if (!slotSel.options.length) SLOTS.forEach((s) => slotSel.append(el("option", { value: s.id, text: s.label })));
    const slot = slotSel.value;
    const dates = [...new Set(state.photos.filter((p) => p.slot === slot).map((p) => p.date))].sort();
    const fillSel = (sel, def) => {
      const prev = sel.value;
      sel.replaceChildren(...dates.map((d) => el("option", { value: d, text: fmtDate(d) })));
      sel.value = dates.includes(prev) ? prev : def || "";
    };
    fillSel($("#cmpA"), dates[0]);
    fillSel($("#cmpB"), dates[dates.length - 1]);
    $$("[data-cmp]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.cmp === state.cmpMode)));

    const stage = $("#cmpStage");
    stage.replaceChildren();
    stage.className = "cmp-stage";
    $("#cmpRange").hidden = true;
    if (dates.length < 2) {
      $("#cmpMeta").textContent = "";
      stage.append(el("p", { class: "empty", text: "この種類の写真が2日分以上たまると比べられます。" }));
      stage.style.gridTemplateColumns = "1fr";
      return;
    }
    stage.style.gridTemplateColumns = "";
    const a = state.photos.find((p) => p.slot === slot && p.date === $("#cmpA").value);
    const b = state.photos.find((p) => p.slot === slot && p.date === $("#cmpB").value);
    if (!a || !b) return;
    const series = weightSeries();
    const ta = trendAt(series, a.date);
    const tb = trendAt(series, b.date);
    const days = dayDiff(a.date, b.date);
    $("#cmpMeta").textContent = `${Math.abs(days)}日の差` + (ta && tb ? `／ならした体重 ${fmt(ta.trend)} → ${fmt(tb.trend)}kg（${signed(tb.trend - ta.trend)}）` : "");

    if (state.cmpMode === "side") {
      stage.append(
        el("figure", {}, [el("img", { src: photoUrl(a), alt: `${fmtDate(a.date)}の写真` }), el("figcaption", { text: `前 ${fmtDate(a.date)}` })]),
        el("figure", {}, [el("img", { src: photoUrl(b), alt: `${fmtDate(b.date)}の写真` }), el("figcaption", { text: `後 ${fmtDate(b.date)}` })]),
      );
    } else {
      stage.classList.add("slider");
      const top = el("div", { class: "cmp-top" }, [el("img", { src: photoUrl(a), alt: `${fmtDate(a.date)}の写真` })]);
      const line = el("div", { class: "cmp-line" });
      stage.append(el("img", { src: photoUrl(b), alt: `${fmtDate(b.date)}の写真` }), top, line);
      const range = $("#cmpRange");
      range.hidden = false;
      const apply = () => {
        const v = Number(range.value);
        top.style.clipPath = `inset(0 ${100 - v}% 0 0)`;
        line.style.left = `calc(${v}% - 1px)`;
      };
      range.oninput = apply;
      apply();
    }
  }

  /* ---------- 設定 ---------- */
  function renderSettings() {
    const f = $("#profileForm");
    const p = state.profile;
    ["height", "targetWeight", "proteinPerKg", "sleepTarget", "trainingTarget", "stepsTarget", "cardioTarget"].forEach((k) => { f.elements[k].value = isNum(p[k]) ? String(p[k]) : ""; });
    f.elements.goal.value = p.goal;
    updateStorageInfo();
  }

  async function updateStorageInfo() {
    const info = $("#storageInfo");
    const parts = [`記録 ${state.entries.size}日分・写真 ${state.photos.length}枚`];
    try {
      if (navigator.storage && navigator.storage.estimate) {
        const est = await navigator.storage.estimate();
        parts.push(`使用量 約${Math.round((est.usage || 0) / 1024 / 1024)}MB`);
      }
      if (navigator.storage && navigator.storage.persisted) {
        parts.push((await navigator.storage.persisted()) ? "消えにくい保存：有効" : "消えにくい保存：未許可（ホーム画面に追加すると有効になりやすい）");
      }
    } catch (err) { /* 取得できなくても表示は続ける */ }
    info.textContent = parts.join("／");
  }

  function onProfileInput() {
    const f = $("#profileForm");
    const num = (k, min, max, fallback) => {
      const raw = f.elements[k].value;
      if (raw === "") return fallback;
      const v = Number(raw);
      return isNum(v) && v >= min && v <= max ? v : fallback;
    };
    state.profile = {
      ...state.profile,
      height: num("height", 100, 230, null),
      targetWeight: num("targetWeight", 20, 250, null),
      proteinPerKg: num("proteinPerKg", 0.8, 3, DEFAULT_PROFILE.proteinPerKg),
      sleepTarget: num("sleepTarget", 4, 12, DEFAULT_PROFILE.sleepTarget),
      trainingTarget: num("trainingTarget", 0, 14, DEFAULT_PROFILE.trainingTarget),
      stepsTarget: num("stepsTarget", 1000, 30000, DEFAULT_PROFILE.stepsTarget),
      cardioTarget: num("cardioTarget", 0, 1000, DEFAULT_PROFILE.cardioTarget),
      goal: f.elements.goal.value,
    };
    clearTimeout(onProfileInput.t);
    onProfileInput.t = setTimeout(() => saveProfile().then(() => toast("設定を保存しました")), 500);
  }

  function download(name, blob) {
    const url = URL.createObjectURL(blob);
    const a = el("a", { href: url, download: name });
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }

  function blobToDataUrl(blob) {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result);
      r.onerror = () => reject(r.error);
      r.readAsDataURL(blob);
    });
  }

  // fetch(dataURL) は CSP の connect-src で止まるので、自前でデコードする
  function dataUrlToBlob(url) {
    const [head, body] = url.split(",");
    const type = (head.match(/^data:([^;]+)/) || [])[1] || "image/jpeg";
    const bin = atob(body);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i);
    return new Blob([bytes], { type });
  }

  async function exportJson() {
    toast("書き出しています…");
    const photos = [];
    for (const p of state.photos) {
      photos.push({ date: p.date, slot: p.slot, width: p.width, height: p.height, createdAt: p.createdAt, dataUrl: await blobToDataUrl(p.blob) });
    }
    const data = { app: "glow-log", version: 1, exportedAt: new Date().toISOString(), profile: state.profile, labs: state.labs, entries: [...state.entries.values()], photos };
    download(`glow-log-${todayStr()}.json`, new Blob([JSON.stringify(data)], { type: "application/json" }));
  }

  function exportCsv() {
    const series = weightSeries();
    const header = ["date", "weight", "time", "timing", "trend", "bed_time", "wake_time", "sleep", "resting_hr", "steps", "cardio_min", "protein", "training", "skin", "skin_tags", "energy", "habits", "body_fat", "muscle_mass", "visceral_fat", "bmr", "note"];
    const q = (v) => {
      const s = v === null || v === undefined ? "" : String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const rows = [...state.entries.values()].sort((a, b) => (a.date < b.date ? -1 : 1)).map((e) => {
      const t = series.find((s) => s.date === e.date);
      return [e.date, e.weight, e.time, e.timing, t ? round(t.trend, 2) : "", e.bedTime, e.wakeTime, e.sleep, e.restingHr, e.steps, e.cardio, e.protein, e.training, e.skin, (e.skinTags || []).join("/"), e.energy, (e.habits || []).join("/"), e.bodyFat, e.muscleMass, e.visceralFat, e.bmr, e.note].map(q).join(",");
    });
    download(`glow-log-${todayStr()}.csv`, new Blob(["﻿" + [header.join(","), ...rows].join("\n")], { type: "text/csv" }));
  }

  async function importJson(file) {
    let data;
    try { data = JSON.parse(await file.text()); } catch (err) { toast("JSONとして読めませんでした"); return; }
    if (!data || data.app !== "glow-log" || !Array.isArray(data.entries)) { toast("Glow Log の書き出しファイルではありません"); return; }
    const labs = Array.isArray(data.labs) ? data.labs : [];
    if (!window.confirm(`記録 ${data.entries.length}日分・写真 ${(data.photos || []).length}枚・血液検査 ${labs.length}件を読み込みます。同じ日付の記録は、ファイルに値がある項目だけ上書きします。`)) return;
    const hasValue = (v) => v !== null && v !== undefined && v !== "" && !(Array.isArray(v) && !v.length);
    for (const e of data.entries) {
      if (!e || !/^\d{4}-\d{2}-\d{2}$/.test(e.date)) continue;
      const merged = { ...(state.entries.get(e.date) || {}) };
      Object.entries(e).forEach(([k, v]) => { if (hasValue(v)) merged[k] = v; });
      merged.date = e.date;
      await putEntry(merged);
    }
    for (const l of labs) {
      if (!l || !/^\d{4}-\d{2}-\d{2}$/.test(l.date) || !Array.isArray(l.items)) continue;
      const id = l.id || `lab-${l.date}-${Date.now()}`;
      state.labs = state.labs.filter((x) => x.id !== id).concat([{ ...l, id }]);
    }
    if (labs.length) await saveLabs();
    for (const p of data.photos || []) {
      if (!p || !SLOTS.some((s) => s.id === p.slot) || !/^\d{4}-\d{2}-\d{2}$/.test(p.date) || !/^data:image\//.test(p.dataUrl || "")) continue;
      await savePhoto(p.date, p.slot, dataUrlToBlob(p.dataUrl), p.width, p.height);
    }
    if (data.profile) {
      const incoming = Object.fromEntries(Object.entries(data.profile).filter(([, v]) => hasValue(v)));
      state.profile = { ...DEFAULT_PROFILE, ...state.profile, ...incoming };
      await saveProfile();
    }
    toast("読み込みました");
    render();
  }

  async function wipeAll() {
    if (!window.confirm("この端末の記録と写真をすべて削除します。よろしいですか？")) return;
    if (!window.confirm("本当に削除しますか？ 元に戻せません。先にバックアップを書き出すことをおすすめします。")) return;
    await Promise.all(["entries", "photos", "meta"].map((n) => run(n, "readwrite", (s) => s.clear())));
    state.urls.forEach((u) => URL.revokeObjectURL(u));
    state.urls.clear();
    state.entries.clear();
    state.photos = [];
    state.profile = { ...DEFAULT_PROFILE };
    state.labs = [];
    toast("すべて削除しました");
    render();
  }

  /* ---------- カメラ ---------- */
  const cam = { stream: null, facing: "user", slot: null, timer: 0, busy: false };

  function ghostFor(slot) {
    const prev = state.photos.filter((p) => p.slot === slot && p.date !== state.date).sort((a, b) => (a.date < b.date ? 1 : -1))[0];
    return prev || null;
  }

  async function openCamera(slot) {
    cam.slot = slot;
    const s = SLOTS.find((x) => x.id === slot);
    cam.facing = slot.startsWith("face") ? "user" : "environment";
    $("#camTitle").textContent = `${fmtDate(state.date)}　${s.label}`;
    const ghost = ghostFor(slot);
    const g = $("#camGhost");
    if (ghost) { g.src = photoUrl(ghost); g.hidden = false; } else { g.removeAttribute("src"); g.hidden = true; }
    $("#ghostOpacity").parentElement.hidden = !ghost;
    $("#camera").hidden = false;
    document.body.style.overflow = "hidden";
    await startStream();
  }

  async function startStream() {
    stopStream();
    const video = $("#camVideo");
    $("#camError").hidden = true;
    $("#camShoot").disabled = true;
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { $("#camError").hidden = false; return; }
    try {
      cam.stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: cam.facing, width: { ideal: 1920 }, height: { ideal: 1920 } },
        audio: false,
      });
      video.srcObject = cam.stream;
      video.classList.toggle("mirror", cam.facing === "user");
      await video.play();
      $("#camShoot").disabled = false;
    } catch (err) {
      $("#camError").hidden = false;
    }
  }

  function stopStream() {
    if (cam.stream) cam.stream.getTracks().forEach((t) => t.stop());
    cam.stream = null;
    $("#camVideo").srcObject = null;
  }

  function closeCamera() {
    stopStream();
    cam.busy = false;
    $("#camCount").textContent = "";
    $("#camera").hidden = true;
    document.body.style.overflow = "";
  }

  function wait(ms) { return new Promise((r) => setTimeout(r, ms)); }

  async function shoot() {
    if (cam.busy) return;
    cam.busy = true;
    const count = $("#camCount");
    for (let i = cam.timer; i > 0; i -= 1) {
      if ($("#camera").hidden) return;
      count.textContent = String(i);
      await wait(1000);
    }
    count.textContent = "";
    const video = $("#camVideo");
    const vw = video.videoWidth;
    const vh = video.videoHeight;
    if (!vw || !vh) { cam.busy = false; return; }
    const scale = Math.min(1, PHOTO_MAX / Math.max(vw, vh));
    const w = Math.round(vw * scale);
    const h = Math.round(vh * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    // 画面で見たまま（内カメラは鏡像）で保存する。前回写真との重ね合わせがずれないようにするため。
    if (cam.facing === "user") { ctx.translate(w, 0); ctx.scale(-1, 1); }
    ctx.drawImage(video, 0, 0, w, h);
    const blob = await new Promise((r) => canvas.toBlob(r, "image/jpeg", PHOTO_QUALITY));
    const slot = cam.slot;
    closeCamera();
    if (!blob) { toast("撮影に失敗しました"); return; }
    await savePhoto(state.date, slot, blob, w, h);
    toast("保存しました");
    render();
  }

  function fileToJpeg(file) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, PHOTO_MAX / Math.max(img.naturalWidth, img.naturalHeight));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.naturalWidth * scale);
        canvas.height = Math.round(img.naturalHeight * scale);
        canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((b) => {
          URL.revokeObjectURL(url);
          if (b) resolve({ blob: b, width: canvas.width, height: canvas.height });
          else reject(new Error("toBlob failed"));
        }, "image/jpeg", PHOTO_QUALITY);
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("decode failed")); };
      img.src = url;
    });
  }

  let pendingSlot = null;
  function pickFile(slot) {
    pendingSlot = slot;
    closeCamera();
    $("#fileInput").value = "";
    $("#fileInput").click();
  }

  /* ---------- 拡大 ---------- */
  let lightboxPhoto = null;
  function openLightbox(photo) {
    lightboxPhoto = photo;
    const s = SLOTS.find((x) => x.id === photo.slot);
    $("#lbTitle").textContent = `${fmtDate(photo.date)}　${s ? s.label : ""}`;
    $("#lbImg").src = photoUrl(photo);
    $("#lbImg").alt = `${fmtDate(photo.date)}の${s ? s.label : "写真"}`;
    $("#lightbox").hidden = false;
    document.body.style.overflow = "hidden";
  }
  function closeLightbox() {
    $("#lightbox").hidden = true;
    document.body.style.overflow = "";
    lightboxPhoto = null;
  }

  /* ---------- イベント ---------- */
  function bind() {
    $$(".tab").forEach((t) => t.addEventListener("click", () => showView(t.dataset.view)));

    $("#prevDay").addEventListener("click", () => { state.date = addDays(state.date, -1); renderToday(); });
    $("#nextDay").addEventListener("click", () => { if (state.date < todayStr()) { state.date = addDays(state.date, 1); renderToday(); } });
    $("#goToday").addEventListener("click", () => { state.date = todayStr(); renderToday(); });
    $("#datePicker").addEventListener("change", (e) => {
      const v = e.target.value;
      if (/^\d{4}-\d{2}-\d{2}$/.test(v) && v <= todayStr()) { state.date = v; renderToday(); }
    });

    const form = $("#entryForm");
    form.addEventListener("input", onFormInput);
    form.addEventListener("change", onFormInput);
    form.addEventListener("submit", (e) => e.preventDefault());

    $$("[data-range]").forEach((b) => b.addEventListener("click", () => { state.range = b.dataset.range; renderTrends(); }));
    $("#copyConsult").addEventListener("click", async () => {
      const text = $("#consultText").value;
      try { await navigator.clipboard.writeText(text); toast("コピーしました"); } catch (err) { $("#consultText").select(); toast("選択しました。長押しでコピーしてください"); }
    });

    $("#cmpSlot").addEventListener("change", renderCompare);
    $("#cmpA").addEventListener("change", renderCompare);
    $("#cmpB").addEventListener("change", renderCompare);
    $$("[data-cmp]").forEach((b) => b.addEventListener("click", () => { state.cmpMode = b.dataset.cmp; renderCompare(); }));

    $("#profileForm").addEventListener("input", onProfileInput);
    $("#profileForm").addEventListener("change", onProfileInput);
    $("#profileForm").addEventListener("submit", (e) => e.preventDefault());
    $("#exportJson").addEventListener("click", exportJson);
    $("#exportCsv").addEventListener("click", exportCsv);
    $("#importJson").addEventListener("change", (e) => { const f = e.target.files[0]; if (f) importJson(f); e.target.value = ""; });
    $("#wipeAll").addEventListener("click", wipeAll);
    $("#labTemplate").addEventListener("click", () => LAB_TEMPLATE.forEach(([name, unit]) => addLabRow(name, unit)));
    $("#labAddRow").addEventListener("click", () => addLabRow());
    $("#labSave").addEventListener("click", saveLabFromForm);

    $("#camClose").addEventListener("click", closeCamera);
    $("#camShoot").addEventListener("click", shoot);
    $("#camFlip").addEventListener("click", () => { cam.facing = cam.facing === "user" ? "environment" : "user"; startStream(); });
    $("#camTimer").addEventListener("click", () => {
      cam.timer = cam.timer === 0 ? 3 : cam.timer === 3 ? 10 : 0;
      $("#camTimer").textContent = `タイマー ${cam.timer}秒`;
    });
    $("#ghostOpacity").addEventListener("input", (e) => { $("#camGhost").style.opacity = String(Number(e.target.value) / 100); });
    $("#camFile").addEventListener("click", () => pickFile(cam.slot));
    $("#camPick").addEventListener("click", () => pickFile(cam.slot));
    $("#fileInput").addEventListener("change", async (e) => {
      const f = e.target.files[0];
      if (!f || !pendingSlot) return;
      try {
        const { blob, width, height } = await fileToJpeg(f);
        await savePhoto(state.date, pendingSlot, blob, width, height);
        toast("保存しました");
        render();
      } catch (err) { toast("この画像は読み込めませんでした"); }
      pendingSlot = null;
    });

    $("#lbClose").addEventListener("click", closeLightbox);
    $("#lbDelete").addEventListener("click", async () => {
      if (!lightboxPhoto) return;
      if (!window.confirm("この写真を削除しますか？")) return;
      await deletePhoto(lightboxPhoto.id);
      closeLightbox();
      render();
    });

    document.addEventListener("keydown", (e) => {
      if (e.key !== "Escape") return;
      if (!$("#camera").hidden) closeCamera();
      if (!$("#lightbox").hidden) closeLightbox();
    });
    document.addEventListener("visibilitychange", () => {
      // 日付をまたいでアプリを開き直したとき、「今日」を更新する
      if (document.visibilityState === "visible" && state.view === "today" && !state.entries.has(state.date) && state.date < todayStr()) {
        state.date = todayStr();
        renderToday();
      }
    });
  }

  async function init() {
    buildFormControls();
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
