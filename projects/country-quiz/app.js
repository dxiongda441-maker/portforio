const APP_ID = "world-country-quiz";
const APP_VERSION = "1.2.1";
const STATE_SCHEMA_VERSION = 3;
const BACKUP_FORMAT_VERSION = 1;
const DB_NAME = "world-country-quiz-db";
const DB_VERSION = 1;
const STORE_NAME = "app-state";
const STATE_KEY = "current";
const FALLBACK_STORAGE_KEY = "world-country-quiz-state-v2";

const REGION_LABELS = {
  Asia: "アジア",
  Europe: "ヨーロッパ",
  Africa: "アフリカ",
  Americas: "南北アメリカ",
  Oceania: "オセアニア"
};

const QUIZ_TYPE_LABELS = {
  flag: "Flag quiz",
  map: "Map quiz",
  capital: "Capital quiz",
  "flag-map": "こっき ＋ せかいちず"
};

const QUIZ_PROMPTS = {
  flag: "この国旗はどこの国？",
  map: "色が付いた国はどこ？",
  capital: "この首都がある国はどこ？",
  "flag-map": "国旗と地図を見て、国をえらぼう"
};

const COUNTRY_NAME_READINGS = {
  ARE: [["アラブ", ""], ["首長国連邦", "しゅちょうこくれんぽう"]],
  COG: [["コンゴ", ""], ["共和国", "きょうわこく"]],
  COD: [["コンゴ", ""], ["民主共和国", "みんしゅきょうわこく"]],
  KNA: [["セントキッツ・ネーヴィス", ""], ["連邦", "れんぽう"]],
  SLB: [["ソロモン", ""], ["諸島", "しょとう"]],
  DOM: [["ドミニカ", ""], ["共和国", "きょうわこく"]],
  DMA: [["ドミニカ", ""], ["国", "こく"]],
  MHL: [["マーシャル", ""], ["諸島", "しょとう"]],
  KOR: [["韓国", "かんこく"]],
  GNQ: [["赤道", "せきどう"], ["ギニア", ""]],
  CAF: [["中央", "ちゅうおう"], ["アフリカ", ""]],
  CHN: [["中国", "ちゅうごく"]],
  TLS: [["東", "ひがし"], ["ティモール", ""]],
  ZAF: [["南", "みなみ"], ["アフリカ", ""]],
  SSD: [["南", "みなみ"], ["スーダン", ""]],
  JPN: [["日本", "にほん"]],
  MKD: [["北", "きた"], ["マケドニア", ""]],
  PRK: [["北朝鮮", "きたちょうせん"]]
};

const CAPITAL_READINGS = {
  CHN: [["北京", "ペキン"]],
  JPN: [["東京", "とうきょう"]]
};

const ILLUSTRATION_PALETTES = {
  Asia: { sky: "#dcefe5", land: "#4f8658", accent: "#e6953d", deep: "#285b4d" },
  Europe: { sky: "#dbeaf2", land: "#64899a", accent: "#d86555", deep: "#36566e" },
  Africa: { sky: "#f3dfac", land: "#b56e3d", accent: "#2f7868", deep: "#76502f" },
  Americas: { sky: "#d3eaed", land: "#3f826c", accent: "#e6a239", deep: "#265e64" },
  Oceania: { sky: "#cfeaf0", land: "#438b8a", accent: "#ef9b45", deep: "#315f77" }
};

const DEFAULT_VIEW_BOX = { x: 0, y: 0, width: 1000, height: 520 };
const MIN_VIEW_BOX_WIDTH = 180;

let database = null;
let persistenceMode = "IndexedDB";
let state = createEmptyState();
let bundledCountries = [];
let countries = [];
let countriesByIso = new Map();
let mapFeatures = [];
let mapFeatureByIso = new Map();
let mapPathByIso = new Map();
let masterMetadata = { masterVersion: "-", source: {} };
let selectedCountry = null;
let currentView = "explore";
let mapRegion = "all";
let mapViewBox = { ...DEFAULT_VIEW_BOX };
let dragStart = null;
let quizType = "flag";
let quizSession = null;
let lastQuizConfig = null;
let pendingRestoreState = null;
let deferredInstallPrompt = null;

const views = {
  explore: document.querySelector("#exploreView"),
  quiz: document.querySelector("#quizView"),
  progress: document.querySelector("#progressView"),
  settings: document.querySelector("#settingsView")
};

const worldMap = document.querySelector("#worldMap");
const countryLayer = document.querySelector("#countryLayer");
const markerLayer = document.querySelector("#markerLayer");
const selectedLabel = document.querySelector("#selectedLabel");
const restoreDialog = document.querySelector("#restoreDialog");

function createId(prefix = "item") {
  if (window.crypto?.randomUUID) return `${prefix}-${window.crypto.randomUUID()}`;
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function createEmptyState() {
  const now = new Date().toISOString();
  return {
    app: APP_ID,
    schemaVersion: STATE_SCHEMA_VERSION,
    progress: {
      totalAnswers: 0,
      correctAnswers: 0,
      bestStreak: 0,
      byCountry: {},
      daily: {},
      sessions: []
    },
    customCountries: [],
    preferences: {
      kidsMode: true,
      quizType: "flag-map",
      adultQuizType: "flag",
      region: "all",
      difficulty: "beginner",
      length: 5
    },
    meta: { createdAt: now, updatedAt: now, appVersion: APP_VERSION }
  };
}

function openDatabase() {
  return new Promise((resolve, reject) => {
    if (!window.indexedDB) {
      reject(new Error("IndexedDB is unavailable"));
      return;
    }
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);
    request.addEventListener("upgradeneeded", () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) request.result.createObjectStore(STORE_NAME);
    });
    request.addEventListener("success", () => resolve(request.result));
    request.addEventListener("error", () => reject(request.error || new Error("Database open failed")));
  });
}

function readDatabaseState() {
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, "readonly");
    const request = transaction.objectStore(STORE_NAME).get(STATE_KEY);
    request.addEventListener("success", () => resolve(request.result || null));
    request.addEventListener("error", () => reject(request.error || new Error("Database read failed")));
  });
}

function writeDatabaseState(value) {
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).put(value, STATE_KEY);
    transaction.addEventListener("complete", resolve);
    transaction.addEventListener("error", () => reject(transaction.error || new Error("Database write failed")));
  });
}

async function initializeStorage() {
  try {
    database = await openDatabase();
    const stored = await readDatabaseState();
    state = stored ? normalizeState(stored) : createEmptyState();
    if (!stored) await persistState();
  } catch (error) {
    console.warn("IndexedDB fallback:", error);
    database = null;
    persistenceMode = "ローカルストレージ";
    try {
      state = normalizeState(JSON.parse(localStorage.getItem(FALLBACK_STORAGE_KEY) || "null"));
    } catch {
      state = createEmptyState();
    }
    await persistState();
  }
}

async function persistState() {
  state.app = APP_ID;
  state.schemaVersion = STATE_SCHEMA_VERSION;
  state.meta = { ...state.meta, appVersion: APP_VERSION, updatedAt: new Date().toISOString() };
  try {
    if (database) await writeDatabaseState(state);
    else localStorage.setItem(FALLBACK_STORAGE_KEY, JSON.stringify(state));
    updateSettingsSummary();
  } catch (error) {
    console.error(error);
    showToast("保存できませんでした。端末の空き容量を確認してください。", "error");
    throw error;
  }
}

function normalizeState(raw) {
  const base = createEmptyState();
  const source = raw && typeof raw === "object" ? raw : {};
  const byCountry = {};
  Object.entries(source.progress?.byCountry || {}).forEach(([iso3, value]) => {
    const key = normalizeIso3(iso3);
    if (!key) return;
    const correct = safeInteger(value?.correct, 0, 1000000);
    const lastAnswered = validIso(value?.lastAnswered);
    byCountry[key] = {
      correct,
      incorrect: safeInteger(value?.incorrect, 0, 1000000),
      lastAnswered,
      manualReview: Boolean(value?.manualReview),
      passportStampedAt: validIso(value?.passportStampedAt) || (correct > 0 ? lastAnswered || validIso(source.meta?.updatedAt) || base.meta.createdAt : "")
    };
  });
  const daily = {};
  Object.entries(source.progress?.daily || {}).forEach(([date, value]) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return;
    daily[date] = {
      answers: safeInteger(value?.answers, 0, 1000000),
      correct: safeInteger(value?.correct, 0, 1000000)
    };
  });
  const isLegacyState = safeInteger(source.schemaVersion, 0, STATE_SCHEMA_VERSION) < STATE_SCHEMA_VERSION;
  const kidsMode = isLegacyState ? true : source.preferences?.kidsMode !== false;
  const sourceQuizType = ["flag", "map", "capital", "flag-map"].includes(source.preferences?.quizType) ? source.preferences.quizType : "flag";
  const adultQuizType = ["flag", "map", "capital"].includes(source.preferences?.adultQuizType) ? source.preferences.adultQuizType : (sourceQuizType === "flag-map" ? "flag" : sourceQuizType);
  return {
    ...base,
    progress: {
      totalAnswers: safeInteger(source.progress?.totalAnswers, 0, 100000000),
      correctAnswers: safeInteger(source.progress?.correctAnswers, 0, 100000000),
      bestStreak: safeInteger(source.progress?.bestStreak, 0, 1000000),
      byCountry,
      daily,
      sessions: Array.isArray(source.progress?.sessions) ? source.progress.sessions.map(normalizeHistory).filter(Boolean).slice(0, 50) : []
    },
    customCountries: Array.isArray(source.customCountries) ? source.customCountries.map(normalizeCustomCountry).filter(Boolean) : [],
    preferences: {
      kidsMode,
      quizType: kidsMode ? "flag-map" : adultQuizType,
      adultQuizType,
      region: ["all", ...Object.keys(REGION_LABELS)].includes(source.preferences?.region) ? source.preferences.region : "all",
      difficulty: isLegacyState ? "beginner" : (["beginner", "standard", "challenge"].includes(source.preferences?.difficulty) ? source.preferences.difficulty : "beginner"),
      length: isLegacyState ? 5 : ([5, 10].includes(Number(source.preferences?.length)) ? Number(source.preferences.length) : 5)
    },
    meta: {
      createdAt: validIso(source.meta?.createdAt) || base.meta.createdAt,
      updatedAt: validIso(source.meta?.updatedAt) || base.meta.updatedAt,
      appVersion: cleanText(source.meta?.appVersion, 30) || APP_VERSION
    }
  };
}

function normalizeHistory(raw) {
  if (!raw || typeof raw !== "object") return null;
  const total = safeInteger(raw.total, 1, 1000);
  return {
    id: cleanIdentifier(raw.id) || createId("session"),
    date: validIso(raw.date) || new Date().toISOString(),
    type: ["flag", "map", "capital", "flag-map"].includes(raw.type) ? raw.type : "flag",
    region: ["all", ...Object.keys(REGION_LABELS)].includes(raw.region) ? raw.region : "all",
    difficulty: ["beginner", "standard", "challenge"].includes(raw.difficulty) ? raw.difficulty : "standard",
    total,
    correct: safeInteger(raw.correct, 0, total),
    bestStreak: safeInteger(raw.bestStreak, 0, total),
    hintCount: safeInteger(raw.hintCount, 0, total)
  };
}

function normalizeCustomCountry(raw) {
  if (!raw || typeof raw !== "object") return null;
  const iso3 = normalizeIso3(raw.iso3 || raw.id);
  const nameJa = cleanText(raw.nameJa || raw.name, 100);
  if (!iso3 || !nameJa) return null;
  const region = Object.keys(REGION_LABELS).includes(raw.region) ? raw.region : "Asia";
  const latlng = Array.isArray(raw.latlng) ? [clampNumber(raw.latlng[0], -90, 90), clampNumber(raw.latlng[1], -180, 180)] : [0, 0];
  return {
    id: iso3.toLowerCase(),
    iso2: cleanText(raw.iso2, 2).toUpperCase(),
    iso3,
    nameJa,
    nameEn: cleanText(raw.nameEn, 100),
    officialJa: cleanText(raw.officialJa, 140),
    capital: cleanText(raw.capital, 100) || "未設定",
    capitalEn: cleanText(raw.capitalEn, 100),
    region,
    regionJa: REGION_LABELS[region],
    subregion: cleanText(raw.subregion, 100),
    latlng,
    area: clampNumber(raw.area, 0, 100000000),
    languages: normalizeStringArray(raw.languages, 20, 80),
    currencies: Array.isArray(raw.currencies) ? raw.currencies.slice(0, 10).map((item) => ({ code: cleanText(item?.code || item, 8), name: cleanText(item?.name, 80), symbol: cleanText(item?.symbol, 12) })).filter((item) => item.code) : [],
    landlocked: Boolean(raw.landlocked),
    borders: normalizeStringArray(raw.borders, 30, 3).map((item) => item.toUpperCase()),
    flag: cleanText(raw.flag, 16),
    flagPath: normalizeFlagSource(raw.flagPath || raw.flagSrc),
    beginner: Boolean(raw.beginner),
    feature: cleanText(raw.feature, 400),
    custom: true
  };
}

function normalizeFlagSource(value) {
  const source = String(value || "").trim();
  if (/^data:image\/(?:png|jpeg|webp|svg\+xml);base64,/i.test(source)) return source;
  try {
    const url = new URL(source);
    return ["http:", "https:"].includes(url.protocol) ? url.href : "";
  } catch {
    return "";
  }
}

function normalizeStringArray(value, maxItems, maxLength) {
  return Array.isArray(value) ? value.map((item) => cleanText(item, maxLength)).filter(Boolean).slice(0, maxItems) : [];
}

function normalizeIso3(value) {
  const iso = String(value || "").toUpperCase().replace(/[^A-Z]/g, "");
  return iso.length === 3 ? iso : "";
}

function cleanIdentifier(value) {
  return String(value || "").replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 160);
}

function cleanText(value, maxLength) {
  return String(value ?? "").trim().slice(0, maxLength);
}

function safeInteger(value, min, max) {
  const number = Math.round(Number(value || 0));
  return Number.isFinite(number) ? Math.min(max, Math.max(min, number)) : min;
}

function clampNumber(value, min, max) {
  const number = Number(value || 0);
  return Number.isFinite(number) ? Math.min(max, Math.max(min, number)) : min;
}

function validIso(value) {
  const date = new Date(value || "");
  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
}

async function loadMasterData() {
  const [masterResponse, mapResponse] = await Promise.all([
    fetch("./data/countries.json"),
    fetch("./data/world-map.geojson")
  ]);
  if (!masterResponse.ok || !mapResponse.ok) throw new Error("Master data load failed");
  const master = await masterResponse.json();
  const map = await mapResponse.json();
  masterMetadata = { masterVersion: cleanText(master.masterVersion, 40) || "-", source: master.source || {} };
  bundledCountries = Array.isArray(master.countries) ? master.countries.map((country) => ({ ...country, nameJa: country.iso3 === "ARE" ? "アラブ首長国連邦" : country.nameJa, custom: false })).filter((country) => normalizeIso3(country.iso3)) : [];
  mapFeatures = Array.isArray(map.features) ? map.features : [];
  mapFeatureByIso = new Map(mapFeatures.map((feature) => [normalizeIso3(feature.properties?.iso3), feature]));
  rebuildCountryIndex();
}

function rebuildCountryIndex() {
  const merged = new Map(bundledCountries.map((country) => [country.iso3, country]));
  state.customCountries.forEach((country) => merged.set(country.iso3, country));
  countries = [...merged.values()].sort((a, b) => a.nameJa.localeCompare(b.nameJa, "ja"));
  countriesByIso = new Map(countries.map((country) => [country.iso3, country]));
  if (!selectedCountry || !countriesByIso.has(selectedCountry.iso3)) selectedCountry = countriesByIso.get("JPN") || countries[0];
  document.querySelector("#countryCount").textContent = `${countries.length}か国`;
  document.querySelector("#quizMasterCount").textContent = `${countries.length}か国収録`;
  document.querySelector("#masterCountryCount").textContent = `${countries.length}か国`;
}

function switchView(name) {
  if (!views[name]) return;
  if (state.preferences.kidsMode && name === "settings") name = "progress";
  currentView = name;
  Object.entries(views).forEach(([viewName, element]) => element.classList.toggle("active", viewName === name));
  document.querySelectorAll(".nav-item").forEach((button) => {
    const active = button.dataset.view === name;
    button.classList.toggle("active", active);
    button.setAttribute("aria-current", active ? "page" : "false");
  });
  if (name === "progress") renderProgress();
  if (name === "settings") updateSettingsSummary();
  if (name === "quiz" && !quizSession) showQuizSetup();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function applyExperienceMode() {
  const kidsMode = state.preferences.kidsMode;
  document.body.classList.toggle("kids-mode", kidsMode);
  document.querySelector("#enableKidsMode").classList.toggle("active", kidsMode);
  document.querySelector("#enableKidsMode").setAttribute("aria-pressed", String(kidsMode));
  document.querySelector("#enableDetailedMode").classList.toggle("active", !kidsMode);
  document.querySelector("#enableDetailedMode").setAttribute("aria-pressed", String(!kidsMode));
  document.querySelector("#experienceModeLabel").textContent = kidsMode ? "こどもモード" : "くわしく見るモード";
  document.querySelectorAll(".nav-label").forEach((label) => {
    label.textContent = kidsMode ? label.dataset.kids : label.dataset.adult;
  });
  document.querySelector("#exploreTitle").innerHTML = kidsMode ? `<ruby>世界地図<rt>せかいちず</rt></ruby>で国を見つけよう` : "世界地図から国を知る";
  document.querySelector("#quizTitle").innerHTML = kidsMode ? `<ruby>国旗<rt>こっき</rt></ruby>と<ruby>世界地図<rt>せかいちず</rt></ruby>クイズ` : "国旗・地図・首都クイズ";
  document.querySelector("#progressTitle").innerHTML = kidsMode ? `<ruby>世界<rt>せかい</rt></ruby>パスポートと<ruby>記録<rt>きろく</rt></ruby>` : "学習記録";
  document.querySelector("#countrySearch").placeholder = kidsMode ? "国のなまえを入れてね" : "国名・首都・国コードを検索";
  document.querySelector("#startQuiz").innerHTML = kidsMode ? `<ruby>冒険<rt>ぼうけん</rt></ruby>をはじめる` : "クイズを始める";
  document.querySelector("#quizSelected").textContent = kidsMode ? "この国をクイズで見る" : "この国から出題";
  document.querySelector("#progressReviewQuiz").textContent = kidsMode ? "もういちど挑戦" : "復習を始める";
  document.querySelector("#quizMasterCount").textContent = kidsMode ? "195か国にチャレンジ" : `${countries.length}か国収録`;
  if (selectedCountry) selectCountry(selectedCountry);
  renderProgress();
}

async function setExperienceMode(kidsMode) {
  if (state.preferences.kidsMode === kidsMode) return;
  if (quizSession && !window.confirm("いまのクイズを終わって、モードを切りかえますか？")) return;
  if (quizSession) showQuizSetup();
  if (kidsMode) {
    if (quizType !== "flag-map") state.preferences.adultQuizType = quizType;
    state.preferences.kidsMode = true;
    state.preferences.quizType = "flag-map";
    state.preferences.difficulty = "beginner";
    state.preferences.length = 5;
    quizType = "flag-map";
  } else {
    state.preferences.kidsMode = false;
    quizType = state.preferences.adultQuizType || "flag";
    state.preferences.quizType = quizType;
  }
  setQuizType(quizType);
  document.querySelector("#quizDifficulty").value = state.preferences.difficulty;
  document.querySelector("#quizLength").value = String(state.preferences.length);
  if (kidsMode && currentView === "settings") switchView("progress");
  applyExperienceMode();
  await persistState();
  showToast(kidsMode ? "こどもモードに切りかえました。" : "くわしく見るモードに切りかえました。");
}

function projectPoint([lon, lat]) {
  return [10 + ((Number(lon) + 180) / 360) * 980, 10 + ((90 - Number(lat)) / 180) * 500];
}

function ringToPath(ring) {
  return ring.map((point, index) => {
    const [x, y] = projectPoint(point);
    return `${index ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`;
  }).join(" ") + " Z";
}

function geometryToPath(geometry) {
  if (!geometry) return "";
  if (geometry.type === "Polygon") return geometry.coordinates.map(ringToPath).join(" ");
  if (geometry.type === "MultiPolygon") return geometry.coordinates.flatMap((polygon) => polygon.map(ringToPath)).join(" ");
  return "";
}

function geometryProjectedBounds(geometry) {
  const points = [];
  const visit = (value) => {
    if (!Array.isArray(value)) return;
    if (typeof value[0] === "number" && typeof value[1] === "number") points.push(projectPoint(value));
    else value.forEach(visit);
  };
  visit(geometry?.coordinates);
  if (!points.length) return null;
  const xs = points.map((point) => point[0]);
  const ys = points.map((point) => point[1]);
  return { minX: Math.min(...xs), maxX: Math.max(...xs), minY: Math.min(...ys), maxY: Math.max(...ys) };
}

function renderMapGeometry() {
  mapPathByIso = new Map();
  countryLayer.innerHTML = mapFeatures.map((feature) => {
    const iso3 = normalizeIso3(feature.properties?.iso3);
    const country = countriesByIso.get(iso3);
    if (!country) return "";
    const path = geometryToPath(feature.geometry);
    mapPathByIso.set(iso3, path);
    return `<path class="country-shape" data-iso="${iso3}" tabindex="0" role="button" aria-label="${escapeHtml(country.nameJa)}" d="${path}"><title>${escapeHtml(country.nameJa)}</title></path>`;
  }).join("");

  const markerCountries = countries.filter((country) => {
    const feature = mapFeatureByIso.get(country.iso3);
    const bounds = geometryProjectedBounds(feature?.geometry);
    return !bounds || (bounds.maxX - bounds.minX < 5) || (bounds.maxY - bounds.minY < 5) || country.custom;
  });
  markerLayer.innerHTML = markerCountries.map((country) => {
    const [x, y] = projectPoint([country.latlng?.[1] || 0, country.latlng?.[0] || 0]);
    return `<circle class="country-marker" data-iso="${country.iso3}" tabindex="0" role="button" aria-label="${escapeHtml(country.nameJa)}" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="4"><title>${escapeHtml(country.nameJa)}</title></circle>`;
  }).join("");
  updateMapState();
  document.querySelector("#mapStatus").textContent = `${countries.length}か国を表示中`;
}

function updateMapState() {
  document.querySelectorAll(".country-shape, .country-marker").forEach((element) => {
    const country = countriesByIso.get(element.dataset.iso);
    const visible = mapRegion === "all" || country?.region === mapRegion;
    element.classList.toggle("filtered", !visible);
    element.setAttribute("tabindex", visible ? "0" : "-1");
    element.classList.toggle("active", element.dataset.iso === selectedCountry?.iso3);
    element.setAttribute("aria-pressed", element.dataset.iso === selectedCountry?.iso3 ? "true" : "false");
  });
  if (!selectedCountry) return;
  const [x, y] = projectPoint([selectedCountry.latlng?.[1] || 0, selectedCountry.latlng?.[0] || 0]);
  selectedLabel.innerHTML = `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="7"></circle><text x="${x.toFixed(1)}" y="${(y - 12).toFixed(1)}">${escapeHtml(selectedCountry.nameJa)}</text>`;
}

function readingMarkup(segments, fallback) {
  if (!state.preferences.kidsMode || !segments) return escapeHtml(fallback);
  return segments.map(([text, reading]) => reading ? `<ruby>${escapeHtml(text)}<rt>${escapeHtml(reading)}</rt></ruby>` : escapeHtml(text)).join("");
}

function countryNameMarkup(country) {
  return readingMarkup(COUNTRY_NAME_READINGS[country.iso3], country.nameJa);
}

function capitalMarkup(country) {
  return readingMarkup(CAPITAL_READINGS[country.iso3], country.capital || "未設定");
}

function getIllustrationTheme(country) {
  const text = `${country.feature || countryFeature(country)} ${country.subregion || ""}`;
  if (/島|海|海岸|サンゴ|群島|環礁|ocean|island/i.test(text)) return { id: "ocean", label: "海と島" };
  if (/砂漠|乾燥|サバンナ|ピラミッド|desert/i.test(text)) return { id: "desert", label: "大地" };
  if (/山|火山|高原|アルプス|ヒマラヤ|アンデス|mountain/i.test(text)) return { id: "mountain", label: "山なみ" };
  if (/森林|熱帯|生態系|自然|アマゾン|野生|forest/i.test(text)) return { id: "forest", label: "森と川" };
  if (/歴史|文化|建築|遺産|古代|城|寺|教会|history|culture/i.test(text)) return { id: "heritage", label: "文化とまちなみ" };
  const fallback = { Asia: "mountain", Europe: "heritage", Africa: "desert", Americas: "forest", Oceania: "ocean" }[country.region] || "city";
  return { id: fallback, label: { mountain: "山なみ", heritage: "文化とまちなみ", desert: "大地", forest: "森と川", ocean: "海と島", city: "まちなみ" }[fallback] };
}

function countryOutlineBadgeMarkup(country, palette) {
  const feature = mapFeatureByIso.get(country.iso3);
  const bounds = geometryProjectedBounds(feature?.geometry);
  if (!feature || !bounds) return `<rect x="306" y="16" width="158" height="126" rx="9" fill="#fffefa" fill-opacity="0.9"/><text x="385" y="88" text-anchor="middle" fill="${palette.deep}" font-size="25" font-weight="900">${escapeHtml(country.iso3)}</text>`;
  const shapeWidth = Math.max(4, bounds.maxX - bounds.minX);
  const shapeHeight = Math.max(4, bounds.maxY - bounds.minY);
  const padding = Math.max(shapeWidth, shapeHeight) * 0.18 + 2;
  const viewX = bounds.minX - padding;
  const viewY = bounds.minY - padding;
  const viewWidth = shapeWidth + padding * 2;
  const viewHeight = shapeHeight + padding * 2;
  const path = mapPathByIso.get(country.iso3) || geometryToPath(feature.geometry);
  return `<rect x="306" y="16" width="158" height="126" rx="9" fill="#fffefa" fill-opacity="0.92"/><svg x="318" y="24" width="134" height="91" viewBox="${viewX.toFixed(2)} ${viewY.toFixed(2)} ${viewWidth.toFixed(2)} ${viewHeight.toFixed(2)}" preserveAspectRatio="xMidYMid meet" aria-hidden="true"><path d="${path}" fill="${palette.accent}" stroke="${palette.deep}" stroke-width="2" vector-effect="non-scaling-stroke"/></svg><text x="385" y="132" text-anchor="middle" fill="${palette.deep}" font-size="12" font-weight="900">${escapeHtml(country.iso3)}</text>`;
}

function getCountryInsights(country) {
  const insights = [];
  if (country.capital && country.capital !== "未設定") insights.push(`首都は${country.capital}です。`);
  const area = Number(country.area || 0);
  const areaRanking = countries.filter((item) => Number(item.area || 0) > 0).sort((a, b) => Number(b.area || 0) - Number(a.area || 0));
  const areaRank = areaRanking.findIndex((item) => item.iso3 === country.iso3) + 1;
  if (area > 0 && areaRank > 0) insights.push(`面積は約${Math.round(area).toLocaleString("ja-JP")}平方キロメートルで、${areaRanking.length}か国中第${areaRank}位です。`);
  const borderNames = (country.borders || []).map((iso3) => countriesByIso.get(iso3)?.nameJa).filter(Boolean);
  if (country.landlocked) insights.push("海に面していない内陸国です。");
  else if (!(country.borders || []).length) insights.push("ほかの国との陸の国境がなく、海に囲まれています。");
  else if (borderNames.length) insights.push(`陸の国境は${borderNames.slice(0, 3).join("、")}${borderNames.length > 3 ? "など" : ""}と接しています。`);
  const latitude = Number(country.latlng?.[0]);
  if (Number.isFinite(latitude)) insights.push(Math.abs(latitude) <= 10 ? "赤道に近い場所にあります。" : `${latitude > 0 ? "北半球" : "南半球"}にあります。`);
  return insights.slice(0, 4);
}

function countryIllustrationMarkup(country) {
  const palette = ILLUSTRATION_PALETTES[country.region] || ILLUSTRATION_PALETTES.Asia;
  const theme = getIllustrationTheme(country);
  const motifs = {
    mountain: `<circle cx="386" cy="54" r="25" fill="${palette.accent}"/><path d="M0 190 112 84l70 68 64-104 126 142Z" fill="${palette.deep}"/><path d="m202 118 44-70 44 69-28-15-16 19-17-18Z" fill="#fffef8"/><path d="M0 176 94 128l77 62 74-48 116 48Z" fill="${palette.land}"/><path d="M52 196v-39m-16 20 16-35 16 35m330 19v-42m-17 22 17-38 18 38" stroke="#fffef8" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>`,
    ocean: `<circle cx="390" cy="57" r="27" fill="${palette.accent}"/><path d="M0 145h480v95H0Z" fill="${palette.deep}"/><path d="M0 165c56-23 101 22 158 0s101 22 159 0 105 22 163 0v75H0Z" fill="${palette.land}"/><path d="M150 153c20-41 48-60 82-60 34 0 61 19 82 60Z" fill="${palette.deep}"/><path d="M196 94c5-28 24-46 47-50m-47 50c-9-20-27-31-48-32m48 32c-2-20 4-38 18-54" stroke="#fffef8" stroke-width="8" stroke-linecap="round"/>`,
    desert: `<circle cx="382" cy="58" r="29" fill="${palette.accent}"/><path d="M0 171c89-45 169-41 244 11 71-52 150-55 236-10v68H0Z" fill="${palette.land}"/><path d="M0 201c92-40 177-34 255 18 67-42 142-45 225-10v31H0Z" fill="${palette.deep}"/><path d="m172 177 43-80 45 80Zm72 0 55-105 58 105Z" fill="#fff1ca" stroke="${palette.deep}" stroke-width="5"/>`,
    forest: `<circle cx="393" cy="51" r="23" fill="${palette.accent}"/><path d="M0 166 94 113l78 52 85-73 106 74 57-35 60 35v74H0Z" fill="${palette.deep}"/><path d="M0 190c102-33 188-27 258 20 68-43 142-47 222-11v41H0Z" fill="${palette.land}"/><path d="M232 240c-3-32 12-58 44-77 27-17 42-39 45-67" fill="none" stroke="#fffef8" stroke-width="15" stroke-linecap="round"/><path d="M49 187v-55m-25 35 25-65 27 65m324 31v-52m-23 31 23-62 26 62" stroke="#fffef8" stroke-width="8" stroke-linejoin="round" stroke-linecap="round"/>`,
    heritage: `<circle cx="392" cy="52" r="23" fill="${palette.accent}"/><path d="M0 184 93 143l86 29 79-53 98 48 124-52v125H0Z" fill="${palette.land}"/><path d="M111 184v-62h100v62m-120-62 70-46 72 46m-94 62v-38h45v38m84 0v-81h82v81m-96-81 55-39 57 39" fill="#fffef8" stroke="${palette.deep}" stroke-width="7" stroke-linejoin="round"/><path d="M0 205h480v35H0Z" fill="${palette.deep}"/>`,
    city: `<circle cx="390" cy="54" r="24" fill="${palette.accent}"/><path d="M0 195 91 137l88 41 79-69 91 69 131-54v116H0Z" fill="${palette.land}"/><path d="M74 199v-63h45v63m19 0v-94h55v94m25 0v-54h43v54m22 0V87h61v112m24 0v-72h49v72" fill="#fffef8" stroke="${palette.deep}" stroke-width="6"/><path d="M0 199h480v41H0Z" fill="${palette.deep}"/>`
  };
  return `<svg class="country-scene" viewBox="0 0 480 240" role="img" aria-label="${escapeHtml(country.nameJa)}の国土の形と${theme.label}を組み合わせたイラスト"><rect width="480" height="240" fill="${palette.sky}"/>${motifs[theme.id] || motifs.city}${countryOutlineBadgeMarkup(country, palette)}</svg>`;
}

function shortCountryFeature(country) {
  const feature = countryFeature(country).trim();
  if (feature.length <= 88) return feature;
  return `${feature.slice(0, 87).replace(/[、。\s]+$/u, "")}。`;
}

function selectCountry(country, options = {}) {
  if (!country) return;
  selectedCountry = country;
  const flag = document.querySelector("#countryFlag");
  flag.src = getFlagSource(country);
  flag.alt = `${country.nameJa}の国旗`;
  document.querySelector("#countryIso").textContent = country.iso3;
  document.querySelector("#countryName").innerHTML = countryNameMarkup(country);
  document.querySelector("#countryNameEn").textContent = country.nameEn || country.officialJa || "";
  document.querySelector("#countryRegion").textContent = country.regionJa || REGION_LABELS[country.region] || country.region;
  document.querySelector("#countrySubregion").textContent = country.subregion || "";
  document.querySelector("#countryCapital").innerHTML = capitalMarkup(country);
  document.querySelector("#countryArea").textContent = formatArea(country.area);
  document.querySelector("#countryLanguages").textContent = country.languages?.slice(0, 3).join("、") || "未設定";
  document.querySelector("#countryCurrencies").textContent = country.currencies?.map((currency) => currency.code).slice(0, 3).join("、") || "未設定";
  document.querySelector("#countryFeature").textContent = shortCountryFeature(country);
  document.querySelector("#countryInsights").innerHTML = getCountryInsights(country).map((insight) => `<li>${escapeHtml(insight)}</li>`).join("");
  document.querySelector("#countryIllustration").innerHTML = countryIllustrationMarkup(country);
  const illustrationTheme = getIllustrationTheme(country);
  document.querySelector("#countryIllustrationCaption").textContent = `${country.nameJa}の国土の形と${illustrationTheme.label}を組み合わせた図鑑イラスト`;
  const progress = getCountryProgress(country.iso3);
  document.querySelector("#toggleReview").textContent = progress.manualReview ? "復習から外す" : "復習に追加";
  updateMapState();
  if (options.zoom) zoomToCountry(country);
}

function countryFeature(country) {
  if (country.feature) return country.feature;
  const region = country.regionJa || REGION_LABELS[country.region];
  const capital = country.capital && country.capital !== "未設定" ? `首都は${country.capital}です。` : "";
  const borderCount = country.borders?.length || 0;
  const area = Number(country.area || 0);
  if (!country.landlocked && borderCount === 0) return `${region}にある島国です。海にかこまれた国で、${capital}`;
  if (country.landlocked) return `${region}にある、海に面していない国です。${capital}`;
  if (area >= 5000000) return `${region}にある、世界でも特に国土が広い国です。${capital}`;
  if (area > 0 && area <= 1000) return `${region}にある、とても小さな国です。${capital}`;
  if (borderCount >= 7) return `${region}で、たくさんの国と国境を接している国です。${capital}`;
  return `${region}にあり、海と陸の両方に接している国です。${capital}`;
}

function getFlagSource(country) {
  if (country?.flagPath) return country.flagPath;
  const symbol = cleanText(country?.flag, 16) || "?";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 80"><rect width="120" height="80" fill="#f5f6f4"/><text x="60" y="52" text-anchor="middle" font-size="42">${symbol.replace(/[<>&]/g, "")}</text></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function zoomToCountry(country) {
  const bounds = geometryProjectedBounds(mapFeatureByIso.get(country.iso3)?.geometry);
  let centerX;
  let centerY;
  let width;
  if (bounds) {
    centerX = (bounds.minX + bounds.maxX) / 2;
    centerY = (bounds.minY + bounds.maxY) / 2;
    width = Math.max(220, Math.min(760, (bounds.maxX - bounds.minX) * 2.4));
  } else {
    [centerX, centerY] = projectPoint([country.latlng?.[1] || 0, country.latlng?.[0] || 0]);
    width = 260;
  }
  const height = width * (DEFAULT_VIEW_BOX.height / DEFAULT_VIEW_BOX.width);
  mapViewBox = clampMapViewBox({ x: centerX - width / 2, y: centerY - height / 2, width, height });
  applyMapViewBox();
}

function clampMapViewBox(box) {
  const width = Math.min(DEFAULT_VIEW_BOX.width, Math.max(MIN_VIEW_BOX_WIDTH, box.width));
  const height = width * (DEFAULT_VIEW_BOX.height / DEFAULT_VIEW_BOX.width);
  return {
    x: Math.min(DEFAULT_VIEW_BOX.width - width, Math.max(0, box.x)),
    y: Math.min(DEFAULT_VIEW_BOX.height - height, Math.max(0, box.y)),
    width,
    height
  };
}

function applyMapViewBox() {
  worldMap.setAttribute("viewBox", `${mapViewBox.x} ${mapViewBox.y} ${mapViewBox.width} ${mapViewBox.height}`);
}

function zoomMap(scale) {
  const centerX = mapViewBox.x + mapViewBox.width / 2;
  const centerY = mapViewBox.y + mapViewBox.height / 2;
  const width = mapViewBox.width * scale;
  const height = width * (DEFAULT_VIEW_BOX.height / DEFAULT_VIEW_BOX.width);
  mapViewBox = clampMapViewBox({ x: centerX - width / 2, y: centerY - height / 2, width, height });
  applyMapViewBox();
}

function resetMapZoom() {
  mapViewBox = { ...DEFAULT_VIEW_BOX };
  applyMapViewBox();
}

function renderSearchResults(query) {
  const panel = document.querySelector("#searchResults");
  const normalized = query.trim().toLocaleLowerCase("ja");
  if (!normalized) {
    panel.hidden = true;
    panel.innerHTML = "";
    return;
  }
  const matches = countries.filter((country) => [country.nameJa, country.nameEn, country.capital, country.capitalEn, country.iso2, country.iso3].join(" ").toLocaleLowerCase("ja").includes(normalized)).slice(0, 8);
  panel.innerHTML = matches.length ? matches.map((country) => `<button type="button" data-iso="${country.iso3}"><img src="${escapeHtml(getFlagSource(country))}" alt="" /><span><strong>${countryNameMarkup(country)}</strong><small>${capitalMarkup(country)} / ${escapeHtml(country.regionJa)}</small></span></button>`).join("") : '<p>一致する国がありません。</p>';
  panel.hidden = false;
}

function getCountryProgress(iso3) {
  if (!state.progress.byCountry[iso3]) state.progress.byCountry[iso3] = { correct: 0, incorrect: 0, lastAnswered: "", manualReview: false, passportStampedAt: "" };
  return state.progress.byCountry[iso3];
}

function getWeakCountries() {
  return countries.map((country) => {
    const progress = state.progress.byCountry[country.iso3] || { correct: 0, incorrect: 0, manualReview: false };
    const total = progress.correct + progress.incorrect;
    return { country, progress, total, accuracy: total ? progress.correct / total : 1 };
  }).filter((item) => item.progress.manualReview || (item.progress.incorrect > 0 && item.accuracy < 0.8)).sort((a, b) => Number(b.progress.manualReview) - Number(a.progress.manualReview) || b.progress.incorrect - a.progress.incorrect || a.accuracy - b.accuracy);
}

function setQuizType(type) {
  if (!QUIZ_TYPE_LABELS[type]) return;
  quizType = type;
  state.preferences.quizType = type;
  if (type !== "flag-map") state.preferences.adultQuizType = type;
  document.querySelectorAll("#quizTypeControl .segment").forEach((button) => button.classList.toggle("active", button.dataset.value === type));
}

function getQuizPool(region, difficulty) {
  let pool = countries.filter((country) => region === "all" || country.region === region);
  if (difficulty === "beginner") {
    const beginner = pool.filter((country) => country.beginner);
    if (beginner.length >= 3) pool = beginner;
  }
  return pool;
}

function startQuickQuiz(length) {
  const questionCount = length === 10 ? 10 : 5;
  document.querySelector("#quizRegion").value = "all";
  document.querySelector("#quizDifficulty").value = "beginner";
  document.querySelector("#quizLength").value = String(questionCount);
  startQuiz({ region: "all", difficulty: "beginner", length: questionCount, type: "flag-map" });
}

function startQuiz(options = {}) {
  const region = options.region || document.querySelector("#quizRegion").value;
  const difficulty = options.difficulty || document.querySelector("#quizDifficulty").value;
  const length = Number(options.length || document.querySelector("#quizLength").value);
  const type = options.type || (state.preferences.kidsMode ? "flag-map" : quizType);
  let pool = options.pool || (options.review ? getWeakCountries().map((item) => item.country) : getQuizPool(region, difficulty));
  if (!pool.length) {
    showToast("出題できる国がありません。", "error");
    return;
  }
  let questions = shuffle(pool).slice(0, Math.min(length, pool.length));
  if (options.seedCountry) questions = [options.seedCountry, ...questions.filter((country) => country.iso3 !== options.seedCountry.iso3)].slice(0, Math.min(length, pool.length));
  lastQuizConfig = { region, difficulty, length, type, review: Boolean(options.review) };
  quizSession = { questions, baseLength: questions.length, index: 0, score: 0, streak: 0, bestStreak: 0, hintCount: 0, answered: false, hintUsed: false, answers: [], options: [], retryScheduled: {} };
  state.preferences = { ...state.preferences, quizType: type, region, difficulty, length: options.review ? state.preferences.length : ([5, 10].includes(length) ? length : 5) };
  setQuizType(type);
  document.querySelector("#quizSetup").hidden = true;
  document.querySelector("#quizResult").hidden = true;
  document.querySelector("#quizSession").hidden = false;
  switchView("quiz");
  renderQuestion();
  persistState();
}

function renderQuestion() {
  if (!quizSession) return;
  const answer = quizSession.questions[quizSession.index];
  quizSession.answered = false;
  quizSession.hintUsed = false;
  const optionCount = { beginner: 3, standard: 4, challenge: 6 }[lastQuizConfig.difficulty] || 4;
  const sameRegion = shuffle(countries.filter((country) => country.iso3 !== answer.iso3 && country.region === answer.region));
  const others = shuffle(countries.filter((country) => country.iso3 !== answer.iso3 && country.region !== answer.region));
  const wrong = [...sameRegion, ...others].slice(0, optionCount - 1);
  quizSession.options = shuffle([answer, ...wrong]);

  document.querySelector("#questionNumber").textContent = `${quizSession.index + 1} / ${quizSession.questions.length}`;
  document.querySelector("#progressBar").style.width = `${((quizSession.index + 1) / quizSession.questions.length) * 100}%`;
  document.querySelector("#sessionScore").textContent = quizSession.score;
  document.querySelector("#sessionStreak").textContent = quizSession.streak;
  document.querySelector("#questionTypeLabel").textContent = QUIZ_TYPE_LABELS[lastQuizConfig.type];
  document.querySelector("#questionPrompt").innerHTML = lastQuizConfig.type === "flag-map" ? `<ruby>国旗<rt>こっき</rt></ruby>と<ruby>地図<rt>ちず</rt></ruby>を見て、国をえらぼう` : escapeHtml(QUIZ_PROMPTS[lastQuizConfig.type]);
  document.querySelector("#feedback").innerHTML = "";
  document.querySelector("#feedback").classList.remove("is-correct", "is-wrong");
  document.querySelector("#nextQuestion").hidden = true;
  document.querySelector("#showHint").disabled = false;
  document.querySelector("#hintText").textContent = "地域や首都から考えてみましょう。";
  document.querySelector("#hintRegion").textContent = "-";
  document.querySelector("#hintCapital").textContent = "-";
  renderQuestionVisual(answer);
  document.querySelector("#choices").innerHTML = quizSession.options.map((country, index) => `<button class="choice" type="button" data-iso="${country.iso3}"><span class="choice-number">${index + 1}</span><span class="choice-name">${countryNameMarkup(country)}</span></button>`).join("");
}

function quizMapMarkup(answer) {
  const paths = mapFeatures.map((feature) => {
    const iso3 = normalizeIso3(feature.properties?.iso3);
    const active = iso3 === answer.iso3 ? " active" : "";
    return `<path class="quiz-map-country${active}" d="${mapPathByIso.get(iso3) || geometryToPath(feature.geometry)}"></path>`;
  }).join("");
  const [x, y] = projectPoint([answer.latlng?.[1] || 0, answer.latlng?.[0] || 0]);
  const labelOnLeft = x > 820;
  const labelX = Math.min(908, Math.max(20, labelOnLeft ? x - 108 : x + 36));
  const labelY = Math.min(470, Math.max(18, y < 76 ? y + 32 : y - 60));
  const labelCenterX = labelX + 36;
  const labelCenterY = labelY + 15;
  return `<div class="quiz-map-frame" data-quiz-map data-target-x="${x.toFixed(1)}" data-target-y="${y.toFixed(1)}"><div class="quiz-map-toolbar" role="group" aria-label="クイズ地図の操作"><button class="quiz-map-control" type="button" data-quiz-map-action="out" aria-label="地図を縮小" title="地図を縮小">−</button><button class="quiz-map-control" type="button" data-quiz-map-action="reset" aria-label="世界全体を表示" title="世界全体を表示">⌂</button><button class="quiz-map-control is-target" type="button" data-quiz-map-action="target" aria-label="国の場所を拡大" title="国の場所を拡大">◎</button><button class="quiz-map-control" type="button" data-quiz-map-action="in" aria-label="地図を拡大" title="地図を拡大">＋</button></div><div class="quiz-map-viewport"><svg class="quiz-map-interactive" viewBox="0 0 1000 520" role="img" tabindex="0" aria-label="出題中の国の場所。赤い印で示しています。拡大して動かせます"><rect class="quiz-map-ocean" x="10" y="10" width="980" height="500" rx="8"></rect><g>${paths}</g><g class="quiz-map-target" aria-hidden="true"><circle class="quiz-map-target-halo" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="31"></circle><circle class="quiz-map-marker" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="13"></circle><circle class="quiz-map-dot" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="5"></circle><path class="quiz-map-pointer" d="M${x.toFixed(1)} ${y.toFixed(1)} L${labelCenterX.toFixed(1)} ${labelCenterY.toFixed(1)}"></path><rect class="quiz-map-label-bg" x="${labelX.toFixed(1)}" y="${labelY.toFixed(1)}" width="72" height="30" rx="6"></rect><text class="quiz-map-label" x="${labelCenterX.toFixed(1)}" y="${(labelY + 21).toFixed(1)}">ここ</text></g></svg></div></div>`;
}

function initializeQuizMapInteraction() {
  const frame = document.querySelector("#questionVisual [data-quiz-map]");
  if (!frame) return;
  const svg = frame.querySelector(".quiz-map-interactive");
  const target = { x: Number(frame.dataset.targetX), y: Number(frame.dataset.targetY) };
  let viewBox = { ...DEFAULT_VIEW_BOX };
  let drag = null;

  function clampViewBox(box) {
    const width = Math.min(DEFAULT_VIEW_BOX.width, Math.max(MIN_VIEW_BOX_WIDTH, box.width));
    const height = width * (DEFAULT_VIEW_BOX.height / DEFAULT_VIEW_BOX.width);
    return {
      x: Math.min(DEFAULT_VIEW_BOX.width - width, Math.max(0, box.x)),
      y: Math.min(DEFAULT_VIEW_BOX.height - height, Math.max(0, box.y)),
      width,
      height
    };
  }

  function updateControls() {
    frame.querySelector('[data-quiz-map-action="out"]').disabled = viewBox.width >= DEFAULT_VIEW_BOX.width - 1;
    frame.querySelector('[data-quiz-map-action="in"]').disabled = viewBox.width <= MIN_VIEW_BOX_WIDTH + 1;
    frame.querySelector('[data-quiz-map-action="reset"]').disabled = viewBox.width >= DEFAULT_VIEW_BOX.width - 1;
  }

  function applyViewBox(nextBox) {
    viewBox = clampViewBox(nextBox);
    svg.setAttribute("viewBox", `${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`);
    updateControls();
  }

  function zoom(scale, anchor = null) {
    const point = anchor || { x: viewBox.x + viewBox.width / 2, y: viewBox.y + viewBox.height / 2 };
    const width = viewBox.width * scale;
    const ratio = width / viewBox.width;
    applyViewBox({
      x: point.x - (point.x - viewBox.x) * ratio,
      y: point.y - (point.y - viewBox.y) * ratio,
      width
    });
  }

  function focusTarget() {
    const width = 280;
    const height = width * (DEFAULT_VIEW_BOX.height / DEFAULT_VIEW_BOX.width);
    applyViewBox({ x: target.x - width / 2, y: target.y - height / 2, width });
  }

  frame.querySelectorAll("[data-quiz-map-action]").forEach((button) => {
    button.addEventListener("click", () => {
      const action = button.dataset.quizMapAction;
      if (action === "in") zoom(0.72, viewBox.width >= DEFAULT_VIEW_BOX.width - 1 ? target : null);
      if (action === "out") zoom(1.28);
      if (action === "reset") applyViewBox({ ...DEFAULT_VIEW_BOX });
      if (action === "target") focusTarget();
    });
  });

  svg.addEventListener("wheel", (event) => {
    event.preventDefault();
    const rect = svg.getBoundingClientRect();
    const anchor = {
      x: viewBox.x + ((event.clientX - rect.left) / rect.width) * viewBox.width,
      y: viewBox.y + ((event.clientY - rect.top) / rect.height) * viewBox.height
    };
    zoom(event.deltaY < 0 ? 0.86 : 1.16, anchor);
  }, { passive: false });

  svg.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) return;
    svg.setPointerCapture(event.pointerId);
    svg.classList.add("dragging");
    drag = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, box: { ...viewBox } };
  });

  svg.addEventListener("pointermove", (event) => {
    if (!drag || drag.pointerId !== event.pointerId || drag.box.width >= DEFAULT_VIEW_BOX.width) return;
    const rect = svg.getBoundingClientRect();
    const dx = ((event.clientX - drag.x) / rect.width) * drag.box.width;
    const dy = ((event.clientY - drag.y) / rect.height) * drag.box.height;
    applyViewBox({ ...drag.box, x: drag.box.x - dx, y: drag.box.y - dy });
  });

  function endDrag(event) {
    if (!drag || drag.pointerId !== event.pointerId) return;
    drag = null;
    svg.classList.remove("dragging");
  }

  svg.addEventListener("pointerup", endDrag);
  svg.addEventListener("pointercancel", endDrag);
  svg.addEventListener("keydown", (event) => {
    const pan = viewBox.width * 0.1;
    if (["+", "="].includes(event.key)) zoom(0.72, target);
    else if (event.key === "-") zoom(1.28);
    else if (event.key === "0") applyViewBox({ ...DEFAULT_VIEW_BOX });
    else if (event.key === "ArrowLeft") applyViewBox({ ...viewBox, x: viewBox.x - pan });
    else if (event.key === "ArrowRight") applyViewBox({ ...viewBox, x: viewBox.x + pan });
    else if (event.key === "ArrowUp") applyViewBox({ ...viewBox, y: viewBox.y - pan });
    else if (event.key === "ArrowDown") applyViewBox({ ...viewBox, y: viewBox.y + pan });
    else return;
    event.preventDefault();
  });

  applyViewBox(viewBox);
}

function renderQuestionVisual(answer) {
  const visual = document.querySelector("#questionVisual");
  if (lastQuizConfig.type === "flag-map") {
    visual.className = "question-visual combined-question";
    visual.innerHTML = `<div class="combined-flag"><span><ruby>国旗<rt>こっき</rt></ruby></span><img src="${escapeHtml(getFlagSource(answer))}" alt="出題中の国旗" /></div><div class="combined-map"><span class="map-location-label">この国の<ruby>場所<rt>ばしょ</rt></ruby></span>${quizMapMarkup(answer)}</div>`;
    initializeQuizMapInteraction();
    return;
  }
  if (lastQuizConfig.type === "flag") {
    visual.className = "question-visual flag-question";
    visual.innerHTML = `<img src="${escapeHtml(getFlagSource(answer))}" alt="出題中の国旗" />`;
    return;
  }
  if (lastQuizConfig.type === "capital") {
    visual.className = "question-visual capital-question";
    visual.innerHTML = `<strong>${escapeHtml(answer.capital)}</strong><span>Capital city</span>`;
    return;
  }
  visual.className = "question-visual map-question";
  visual.innerHTML = quizMapMarkup(answer);
  initializeQuizMapInteraction();
}

async function answerQuestion(iso3) {
  if (!quizSession || quizSession.answered) return;
  quizSession.answered = true;
  const answer = quizSession.questions[quizSession.index];
  const isCorrect = iso3 === answer.iso3;
  if (isCorrect) {
    quizSession.score += 1;
    quizSession.streak += 1;
    quizSession.bestStreak = Math.max(quizSession.bestStreak, quizSession.streak);
  } else {
    quizSession.streak = 0;
  }

  document.querySelectorAll(".choice").forEach((button) => {
    button.disabled = true;
    if (button.dataset.iso === answer.iso3) button.classList.add("correct");
    if (button.dataset.iso === iso3 && !isCorrect) button.classList.add("wrong");
  });
  const progress = getCountryProgress(answer.iso3);
  let retryScheduled = false;
  if (!isCorrect && !quizSession.retryScheduled[answer.iso3]) {
    const retryIndex = Math.min(quizSession.questions.length, quizSession.index + 3);
    quizSession.questions.splice(retryIndex, 0, answer);
    quizSession.retryScheduled[answer.iso3] = true;
    retryScheduled = true;
    document.querySelector("#questionNumber").textContent = `${quizSession.index + 1} / ${quizSession.questions.length}`;
    document.querySelector("#progressBar").style.width = `${((quizSession.index + 1) / quizSession.questions.length) * 100}%`;
  }
  const newPassportStamp = isCorrect && !progress.passportStampedAt;
  progress[isCorrect ? "correct" : "incorrect"] += 1;
  progress.lastAnswered = new Date().toISOString();
  if (newPassportStamp) progress.passportStampedAt = progress.lastAnswered;
  state.progress.totalAnswers += 1;
  if (isCorrect) state.progress.correctAnswers += 1;
  state.progress.bestStreak = Math.max(state.progress.bestStreak, quizSession.bestStreak);
  const date = todayKey();
  if (!state.progress.daily[date]) state.progress.daily[date] = { answers: 0, correct: 0 };
  state.progress.daily[date].answers += 1;
  if (isCorrect) state.progress.daily[date].correct += 1;
  quizSession.answers.push({ iso3: answer.iso3, correct: isCorrect, hintUsed: quizSession.hintUsed });

  document.querySelector("#sessionScore").textContent = quizSession.score;
  document.querySelector("#sessionStreak").textContent = quizSession.streak;
  const feedback = document.querySelector("#feedback");
  feedback.classList.toggle("is-correct", isCorrect);
  feedback.classList.toggle("is-wrong", !isCorrect);
  const answerInsights = getCountryInsights(answer).slice(0, 2).map((insight) => `<li>${escapeHtml(insight)}</li>`).join("");
  feedback.innerHTML = `<div class="answer-learning-card"><div class="answer-illustration">${countryIllustrationMarkup(answer)}</div><div class="answer-learning-copy"><span class="answer-status">${isCorrect ? "せいかい！" : "おしい！"}</span><strong>${isCorrect ? `${countryNameMarkup(answer)}を見つけたね` : `こたえは ${countryNameMarkup(answer)}`}</strong><p><b>国のひとこと</b>${escapeHtml(shortCountryFeature(answer))}</p><ul class="answer-insights">${answerInsights}</ul>${retryScheduled ? `<span class="retry-scheduled">少しあとに、もう一度出てきます</span>` : ""}${newPassportStamp ? `<span class="passport-earned">NEW　パスポートにスタンプがつきました</span>` : ""}</div></div>`;
  document.querySelector("#nextQuestion").hidden = false;
  document.querySelector("#nextQuestion").textContent = quizSession.index === quizSession.questions.length - 1 ? "結果を見る" : "次の問題";
  await persistState();
  renderProgress();
}

function showHint() {
  if (!quizSession || quizSession.answered) return;
  const answer = quizSession.questions[quizSession.index];
  if (!quizSession.hintUsed) {
    quizSession.hintUsed = true;
    quizSession.hintCount += 1;
  }
  document.querySelector("#hintText").textContent = `${answer.regionJa}にある国です。`;
  document.querySelector("#hintRegion").textContent = answer.regionJa;
  document.querySelector("#hintCapital").innerHTML = capitalMarkup(answer);
  document.querySelector("#showHint").disabled = true;
}

function advanceQuestion() {
  if (!quizSession?.answered) return;
  if (quizSession.index >= quizSession.questions.length - 1) {
    finishQuiz();
    return;
  }
  quizSession.index += 1;
  renderQuestion();
}

async function finishQuiz() {
  if (!quizSession) return;
  const completed = quizSession;
  const total = completed.questions.length;
  const history = {
    id: createId("session"),
    date: new Date().toISOString(),
    type: lastQuizConfig.type,
    region: lastQuizConfig.region,
    difficulty: lastQuizConfig.difficulty,
    total,
    correct: completed.score,
    bestStreak: completed.bestStreak,
    hintCount: completed.hintCount
  };
  state.progress.sessions = [history, ...state.progress.sessions].slice(0, 50);
  const reviewAdded = new Set(completed.answers.filter((answer) => !answer.correct).map((answer) => answer.iso3)).size;
  document.querySelector("#resultPercent").textContent = formatPercent(completed.score, total);
  document.querySelector("#resultDetail").textContent = `${completed.score} / ${total} 正解`;
  document.querySelector("#resultStreak").textContent = `${completed.bestStreak}問`;
  document.querySelector("#resultHints").textContent = `${completed.hintCount}回`;
  document.querySelector("#resultReview").textContent = `${reviewAdded}か国`;
  document.querySelector("#quizSession").hidden = true;
  document.querySelector("#quizResult").hidden = false;
  quizSession = null;
  await persistState();
  renderProgress();
  renderQuizSetupSummary();
}

function showQuizSetup() {
  quizSession = null;
  document.querySelector("#quizSetup").hidden = false;
  document.querySelector("#quizSession").hidden = true;
  document.querySelector("#quizResult").hidden = true;
  renderQuizSetupSummary();
}

function startReviewQuiz() {
  const weak = getWeakCountries().map((item) => item.country);
  if (!weak.length) {
    showToast("復習対象の国はまだありません。", "error");
    return;
  }
  startQuiz({ pool: weak, region: "all", difficulty: state.preferences.difficulty, length: Math.min(state.preferences.length, weak.length), type: state.preferences.quizType, review: true });
}

function renderQuizSetupSummary() {
  const today = state.progress.daily[todayKey()] || { answers: 0, correct: 0 };
  document.querySelector("#todayAnswers").textContent = `${today.answers}問`;
  document.querySelector("#todayAccuracy").textContent = today.answers ? formatPercent(today.correct, today.answers) : "-";
  document.querySelector("#reviewCount").textContent = `${getWeakCountries().length}か国`;
}

function renderPassport() {
  const stampedCountries = countries.map((country) => ({ country, progress: state.progress.byCountry[country.iso3] })).filter(({ progress }) => Boolean(progress?.passportStampedAt || progress?.correct > 0)).sort((a, b) => new Date(b.progress.passportStampedAt || b.progress.lastAnswered || 0) - new Date(a.progress.passportStampedAt || a.progress.lastAnswered || 0));
  const total = countries.length;
  const percent = total ? Math.round((stampedCountries.length / total) * 100) : 0;
  document.querySelector("#passportCount").textContent = stampedCountries.length;
  document.querySelector("#passportTotal").textContent = `/ ${total}か国`;
  document.querySelector("#passportProgressBar").style.width = `${percent}%`;
  document.querySelector("#passportGrid").innerHTML = stampedCountries.length ? stampedCountries.map(({ country, progress }) => `<button class="passport-stamp" type="button" data-iso="${country.iso3}" aria-label="${escapeHtml(country.nameJa)}を地図で見る"><span class="passport-stamp-flag"><img src="${escapeHtml(getFlagSource(country))}" alt="" /></span><strong>${countryNameMarkup(country)}</strong><small>${escapeHtml(country.regionJa || REGION_LABELS[country.region])}</small><span class="passport-date">${formatPassportDate(progress.passportStampedAt || progress.lastAnswered)}</span></button>`).join("") : '<div class="empty-state"><strong>スタンプはまだありません</strong><span>クイズに正解すると国がここに記録されます。</span></div>';
  renderPassportMap();
}

function renderPassportMap() {
  const passportCountryLayer = document.querySelector("#passportCountryLayer");
  const passportMarkerLayer = document.querySelector("#passportMarkerLayer");
  if (!passportCountryLayer || !passportMarkerLayer) return;
  passportCountryLayer.innerHTML = mapFeatures.map((feature) => {
    const iso3 = normalizeIso3(feature.properties?.iso3);
    const country = countriesByIso.get(iso3);
    if (!country) return "";
    const stamped = (state.progress.byCountry[iso3]?.correct || 0) > 0;
    const status = stamped ? "正解済み" : "未正解";
    return `<path class="passport-map-country${stamped ? " is-stamped" : ""}" data-iso="${iso3}" tabindex="0" role="button" aria-label="${escapeHtml(country.nameJa)}、${status}" d="${mapPathByIso.get(iso3) || geometryToPath(feature.geometry)}"><title>${escapeHtml(country.nameJa)}・${status}</title></path>`;
  }).join("");
  const markerCountries = countries.filter((country) => {
    const bounds = geometryProjectedBounds(mapFeatureByIso.get(country.iso3)?.geometry);
    return !bounds || (bounds.maxX - bounds.minX < 5) || (bounds.maxY - bounds.minY < 5) || country.custom;
  });
  passportMarkerLayer.innerHTML = markerCountries.map((country) => {
    const stamped = (state.progress.byCountry[country.iso3]?.correct || 0) > 0;
    const [x, y] = projectPoint([country.latlng?.[1] || 0, country.latlng?.[0] || 0]);
    return `<circle class="passport-map-marker${stamped ? " is-stamped" : ""}" data-iso="${country.iso3}" tabindex="0" role="button" aria-label="${escapeHtml(country.nameJa)}、${stamped ? "正解済み" : "未正解"}" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${stamped ? "8" : "4"}"><title>${escapeHtml(country.nameJa)}</title></circle>`;
  }).join("");
}

function renderProgress() {
  renderPassport();
  const total = state.progress.totalAnswers;
  document.querySelector("#totalAnswers").textContent = total;
  document.querySelector("#overallAccuracy").textContent = total ? formatPercent(state.progress.correctAnswers, total) : "-";
  const mastered = countries.filter((country) => {
    const progress = state.progress.byCountry[country.iso3];
    const answered = (progress?.correct || 0) + (progress?.incorrect || 0);
    return answered >= 3 && progress.correct / answered >= 0.8;
  }).length;
  document.querySelector("#masteredCountries").textContent = mastered;
  document.querySelector("#bestStreak").textContent = state.progress.bestStreak;

  document.querySelector("#regionProgressList").innerHTML = Object.entries(REGION_LABELS).map(([region, label]) => {
    const regionCountries = countries.filter((country) => country.region === region);
    const answered = regionCountries.filter((country) => {
      const progress = state.progress.byCountry[country.iso3];
      return (progress?.correct || 0) + (progress?.incorrect || 0) > 0;
    }).length;
    const percent = regionCountries.length ? Math.round((answered / regionCountries.length) * 100) : 0;
    return `<div class="region-row"><div><strong>${label}</strong><span>${answered} / ${regionCountries.length}か国</span></div><div class="progress-track"><span style="width:${percent}%"></span></div><b>${percent}%</b></div>`;
  }).join("");

  const weak = getWeakCountries();
  document.querySelector("#weakCount").textContent = `${weak.length}か国`;
  document.querySelector("#weakCountryList").innerHTML = weak.length ? weak.slice(0, 10).map(({ country, progress, total: answered }) => `<button type="button" data-iso="${country.iso3}"><img src="${escapeHtml(getFlagSource(country))}" alt="" /><span><strong>${countryNameMarkup(country)}</strong><small>${answered ? formatPercent(progress.correct, answered) : "手動で追加"} / ${progress.incorrect}回不正解</small></span><b>復習</b></button>`).join("") : '<div class="empty-state"><strong>復習対象はありません</strong><span>クイズで間違えた国がここに表示されます。</span></div>';

  document.querySelector("#historyList").innerHTML = state.progress.sessions.length ? state.progress.sessions.slice(0, 20).map((session) => `<article><div><strong>${formatQuizType(session.type)}</strong><span>${formatDateTime(session.date)} / ${session.region === "all" ? "世界" : REGION_LABELS[session.region]}</span></div><b>${formatPercent(session.correct, session.total)}</b><span>${session.correct} / ${session.total}</span></article>`).join("") : '<div class="empty-state"><strong>記録はまだありません</strong><span>クイズを完了すると結果が残ります。</span></div>';
  renderQuizSetupSummary();
}

function updateSettingsSummary() {
  const badge = document.querySelector("#storageBadge");
  if (!badge) return;
  badge.textContent = `${persistenceMode} / 端末内`;
  document.querySelector("#backupAnswerCount").textContent = `${state.progress.totalAnswers}問`;
  document.querySelector("#lastSavedAt").textContent = formatDateTime(state.meta.updatedAt);
  document.querySelector("#masterCountryCount").textContent = `${countries.length}か国`;
  document.querySelector("#masterVersion").textContent = state.customCountries.length ? `${masterMetadata.masterVersion} + 追加${state.customCountries.length}` : masterMetadata.masterVersion;
}

function exportBackup() {
  downloadJson({ format: "world-country-quiz-backup", formatVersion: BACKUP_FORMAT_VERSION, exportedAt: new Date().toISOString(), data: state }, `world-country-quiz-backup-${todayKey()}.json`);
  showToast("バックアップを書き出しました。");
}

async function prepareRestore(file) {
  try {
    if (file.size > 20 * 1024 * 1024) throw new Error("20MB以下のファイルを選択してください。");
    const raw = JSON.parse(await file.text());
    const source = raw?.format === "world-country-quiz-backup" ? raw.data : raw;
    if (!source || typeof source !== "object" || !source.progress) throw new Error("世界の国クイズのバックアップではありません。");
    pendingRestoreState = normalizeState(source);
    document.querySelector("#restoreSummary").textContent = `${pendingRestoreState.progress.totalAnswers}問の回答記録が含まれています。`;
    restoreDialog.showModal();
  } catch (error) {
    pendingRestoreState = null;
    showToast(error.message || "バックアップを読み込めませんでした。", "error");
  } finally {
    document.querySelector("#restoreInput").value = "";
  }
}

async function restorePending(mode) {
  if (!pendingRestoreState) return;
  if (mode === "replace") state = pendingRestoreState;
  else state = mergeStates(state, pendingRestoreState);
  pendingRestoreState = null;
  rebuildCountryIndex();
  renderMapGeometry();
  selectCountry(selectedCountry);
  renderProgress();
  await persistState();
  showToast(mode === "replace" ? "バックアップで置き換えました。" : "バックアップを追加しました。");
}

function mergeStates(current, incoming) {
  const merged = normalizeState(current);
  merged.progress.totalAnswers = Math.max(current.progress.totalAnswers, incoming.progress.totalAnswers);
  merged.progress.correctAnswers = Math.max(current.progress.correctAnswers, incoming.progress.correctAnswers);
  merged.progress.bestStreak = Math.max(current.progress.bestStreak, incoming.progress.bestStreak);
  Object.entries(incoming.progress.byCountry).forEach(([iso3, value]) => {
    const existing = merged.progress.byCountry[iso3] || { correct: 0, incorrect: 0, lastAnswered: "", manualReview: false, passportStampedAt: "" };
    const passportDates = [existing.passportStampedAt, value.passportStampedAt].filter(Boolean).sort((a, b) => new Date(a) - new Date(b));
    merged.progress.byCountry[iso3] = {
      correct: Math.max(existing.correct, value.correct),
      incorrect: Math.max(existing.incorrect, value.incorrect),
      lastAnswered: new Date(existing.lastAnswered || 0) > new Date(value.lastAnswered || 0) ? existing.lastAnswered : value.lastAnswered,
      manualReview: existing.manualReview || value.manualReview,
      passportStampedAt: passportDates[0] || ""
    };
  });
  Object.entries(incoming.progress.daily).forEach(([date, value]) => {
    const existing = merged.progress.daily[date] || { answers: 0, correct: 0 };
    merged.progress.daily[date] = { answers: Math.max(existing.answers, value.answers), correct: Math.max(existing.correct, value.correct) };
  });
  const sessions = new Map([...current.progress.sessions, ...incoming.progress.sessions].map((session) => [session.id, session]));
  merged.progress.sessions = [...sessions.values()].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 50);
  const custom = new Map([...current.customCountries, ...incoming.customCountries].map((country) => [country.iso3, country]));
  merged.customCountries = [...custom.values()];
  return merged;
}

async function importMasterFile(file) {
  try {
    if (file.size > 8 * 1024 * 1024) throw new Error("8MB以下のファイルを選択してください。");
    const raw = JSON.parse(await file.text());
    const entries = Array.isArray(raw) ? raw : (Array.isArray(raw.countries) ? raw.countries : (Array.isArray(raw.entries) ? raw.entries : []));
    const normalized = entries.map(normalizeCustomCountry).filter(Boolean);
    if (!normalized.length) throw new Error("有効な国データがありません。");
    const merged = new Map(state.customCountries.map((country) => [country.iso3, country]));
    normalized.forEach((country) => merged.set(country.iso3, country));
    state.customCountries = [...merged.values()];
    rebuildCountryIndex();
    renderMapGeometry();
    selectCountry(selectedCountry);
    await persistState();
    showToast(`${normalized.length}か国のマスターを追加しました。`);
  } catch (error) {
    showToast(error.message || "国マスターを読み込めませんでした。", "error");
  } finally {
    document.querySelector("#masterInput").value = "";
  }
}

function exportMasterTemplate() {
  downloadJson({ schemaVersion: 1, masterVersion: "my-master-1", countries: [{ iso2: "XX", iso3: "XXX", nameJa: "国名", nameEn: "Country name", capital: "首都", region: "Asia", subregion: "Eastern Asia", latlng: [35, 139], area: 100000, languages: ["Language"], currencies: [{ code: "XXX", name: "Currency", symbol: "¤" }], flag: "🏳️", flagPath: "data:image/svg+xml;base64,...", feature: "国の特徴" }] }, "world-country-master-template.json");
}

function downloadJson(value, filename) {
  const blob = new Blob([JSON.stringify(value, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function shuffle(items) {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [result[index], result[randomIndex]] = [result[randomIndex], result[index]];
  }
  return result;
}

function formatArea(value) {
  const area = Math.round(Number(value || 0));
  return area ? `${area.toLocaleString("ja-JP")} km²` : "未設定";
}

function formatPercent(correct, total) {
  return total ? `${Math.round((correct / total) * 100)}%` : "-";
}

function formatDateTime(value) {
  const date = new Date(value || "");
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleString("ja-JP", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function formatQuizType(type) {
  return { flag: "国旗クイズ", map: "地図クイズ", capital: "首都クイズ", "flag-map": "国旗＋地図クイズ" }[type] || "クイズ";
}

function formatPassportDate(value) {
  const date = new Date(value || "");
  return Number.isNaN(date.getTime()) ? "" : `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}.${String(date.getDate()).padStart(2, "0")}`;
}

function todayKey() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[character]);
}

function showToast(message, type = "success") {
  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  document.querySelector("#toastRegion").appendChild(toast);
  window.setTimeout(() => toast.remove(), 4200);
}

document.querySelectorAll(".nav-item").forEach((button) => button.addEventListener("click", () => switchView(button.dataset.view)));
document.querySelector("#enableKidsMode").addEventListener("click", () => setExperienceMode(true));
document.querySelector("#enableDetailedMode").addEventListener("click", () => setExperienceMode(false));
document.querySelectorAll("[data-quick-length]").forEach((button) => button.addEventListener("click", () => startQuickQuiz(Number(button.dataset.quickLength))));

document.querySelector("#countrySearch").addEventListener("input", (event) => renderSearchResults(event.target.value));
document.querySelector("#searchResults").addEventListener("click", (event) => {
  const button = event.target.closest("button[data-iso]");
  if (!button) return;
  const country = countriesByIso.get(button.dataset.iso);
  selectCountry(country, { zoom: true });
  document.querySelector("#countrySearch").value = country.nameJa;
  document.querySelector("#searchResults").hidden = true;
});

document.addEventListener("click", (event) => {
  if (!event.target.closest(".search-control")) document.querySelector("#searchResults").hidden = true;
});

document.querySelector("#mapRegionFilter").addEventListener("change", (event) => {
  mapRegion = event.target.value;
  updateMapState();
  const count = countries.filter((country) => mapRegion === "all" || country.region === mapRegion).length;
  document.querySelector("#mapStatus").textContent = `${count}か国を表示中`;
});

function handleMapCountryActivation(event) {
  const target = event.target.closest("[data-iso]");
  if (!target) return;
  const country = countriesByIso.get(target.dataset.iso);
  if (country) selectCountry(country);
}

countryLayer.addEventListener("click", handleMapCountryActivation);
markerLayer.addEventListener("click", handleMapCountryActivation);
worldMap.addEventListener("keydown", (event) => {
  if ((event.key === "Enter" || event.key === " ") && event.target.matches("[data-iso]")) {
    event.preventDefault();
    selectCountry(countriesByIso.get(event.target.dataset.iso));
  }
});

document.querySelector("#zoomIn").addEventListener("click", () => zoomMap(0.72));
document.querySelector("#zoomOut").addEventListener("click", () => zoomMap(1.28));
document.querySelector("#zoomReset").addEventListener("click", resetMapZoom);
document.querySelector("#focusSelected").addEventListener("click", () => zoomToCountry(selectedCountry));

worldMap.addEventListener("wheel", (event) => {
  event.preventDefault();
  zoomMap(event.deltaY < 0 ? 0.86 : 1.16);
}, { passive: false });

worldMap.addEventListener("pointerdown", (event) => {
  if (event.target.closest("[data-iso]")) return;
  worldMap.setPointerCapture(event.pointerId);
  worldMap.classList.add("dragging");
  dragStart = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, box: { ...mapViewBox } };
});

worldMap.addEventListener("pointermove", (event) => {
  if (!dragStart || dragStart.pointerId !== event.pointerId) return;
  const rect = worldMap.getBoundingClientRect();
  const dx = ((event.clientX - dragStart.x) / rect.width) * dragStart.box.width;
  const dy = ((event.clientY - dragStart.y) / rect.height) * dragStart.box.height;
  mapViewBox = clampMapViewBox({ ...dragStart.box, x: dragStart.box.x - dx, y: dragStart.box.y - dy });
  applyMapViewBox();
});

function endMapDrag(event) {
  if (!dragStart || (event.pointerId && dragStart.pointerId !== event.pointerId)) return;
  dragStart = null;
  worldMap.classList.remove("dragging");
}

worldMap.addEventListener("pointerup", endMapDrag);
worldMap.addEventListener("pointercancel", endMapDrag);

document.querySelector("#quizSelected").addEventListener("click", () => {
  startQuiz({ seedCountry: selectedCountry, region: "all", type: quizType });
});

document.querySelector("#toggleReview").addEventListener("click", async () => {
  const progress = getCountryProgress(selectedCountry.iso3);
  progress.manualReview = !progress.manualReview;
  selectCountry(selectedCountry);
  await persistState();
  renderProgress();
});

document.querySelectorAll("#quizTypeControl .segment").forEach((button) => button.addEventListener("click", () => setQuizType(button.dataset.value)));
document.querySelector("#startQuiz").addEventListener("click", () => startQuiz());
document.querySelector("#startReviewQuiz").addEventListener("click", startReviewQuiz);
document.querySelector("#progressReviewQuiz").addEventListener("click", startReviewQuiz);
document.querySelector("#showHint").addEventListener("click", showHint);
document.querySelector("#nextQuestion").addEventListener("click", advanceQuestion);
document.querySelector("#quitQuiz").addEventListener("click", () => {
  if (window.confirm("現在のクイズを終了しますか？")) showQuizSetup();
});
document.querySelector("#backToSetup").addEventListener("click", showQuizSetup);
document.querySelector("#retryQuiz").addEventListener("click", () => startQuiz(lastQuizConfig || {}));
document.querySelector("#viewPassport").addEventListener("click", () => switchView("progress"));

document.querySelector("#choices").addEventListener("click", (event) => {
  const choice = event.target.closest(".choice");
  if (choice) answerQuestion(choice.dataset.iso);
});

window.addEventListener("keydown", (event) => {
  if (currentView !== "quiz" || !quizSession || quizSession.answered) return;
  const index = Number(event.key) - 1;
  if (index >= 0 && index < quizSession.options.length) answerQuestion(quizSession.options[index].iso3);
});

document.querySelector("#weakCountryList").addEventListener("click", (event) => {
  const button = event.target.closest("button[data-iso]");
  if (!button) return;
  const country = countriesByIso.get(button.dataset.iso);
  startQuiz({ pool: [country], region: "all", difficulty: "beginner", length: 1, type: state.preferences.quizType, review: true });
});

document.querySelector("#passportGrid").addEventListener("click", (event) => {
  const button = event.target.closest("button[data-iso]");
  if (!button) return;
  const country = countriesByIso.get(button.dataset.iso);
  if (!country) return;
  switchView("explore");
  selectCountry(country, { zoom: true });
});

function openCountryFromPassportMap(event) {
  const target = event.target.closest("[data-iso]");
  if (!target) return;
  const country = countriesByIso.get(target.dataset.iso);
  if (!country) return;
  switchView("explore");
  selectCountry(country, { zoom: true });
}

document.querySelector("#passportWorldMap").addEventListener("click", openCountryFromPassportMap);
document.querySelector("#passportWorldMap").addEventListener("keydown", (event) => {
  if ((event.key === "Enter" || event.key === " ") && event.target.matches("[data-iso]")) {
    event.preventDefault();
    openCountryFromPassportMap(event);
  }
});

document.querySelector("#exportBackup").addEventListener("click", exportBackup);
document.querySelector("#openRestore").addEventListener("click", () => document.querySelector("#restoreInput").click());
document.querySelector("#restoreInput").addEventListener("change", (event) => {
  const file = event.target.files?.[0];
  if (file) prepareRestore(file);
});
document.querySelector("#mergeRestore").addEventListener("click", () => restorePending("merge"));
document.querySelector("#replaceRestore").addEventListener("click", () => restorePending("replace"));
document.querySelector("#importMaster").addEventListener("click", () => document.querySelector("#masterInput").click());
document.querySelector("#masterInput").addEventListener("change", (event) => {
  const file = event.target.files?.[0];
  if (file) importMasterFile(file);
});
document.querySelector("#exportMasterTemplate").addEventListener("click", exportMasterTemplate);
document.querySelector("#resetProgress").addEventListener("click", async () => {
  if (!window.confirm("すべての学習記録を削除しますか？")) return;
  state.progress = createEmptyState().progress;
  await persistState();
  renderProgress();
  showToast("学習記録をリセットしました。");
});

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  deferredInstallPrompt = event;
  document.querySelector("#installApp").hidden = false;
});

document.querySelector("#installApp").addEventListener("click", async () => {
  if (!deferredInstallPrompt) return;
  deferredInstallPrompt.prompt();
  await deferredInstallPrompt.userChoice;
  deferredInstallPrompt = null;
  document.querySelector("#installApp").hidden = true;
});

window.addEventListener("online", () => showToast("オンラインに戻りました。"));
window.addEventListener("offline", () => showToast("オフラインで利用中です。"));

async function registerServiceWorker() {
  if (!("serviceWorker" in navigator) || !window.isSecureContext) return;
  try {
    const hadController = Boolean(navigator.serviceWorker.controller);
    const registration = await navigator.serviceWorker.register("./sw.js");
    registration?.update();
    let refreshing = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (refreshing || !hadController) return;
      refreshing = true;
      showToast("アプリを更新しました。次回表示から反映されます。");
    });
  } catch (error) {
    console.error(error);
    showToast("オフライン機能を有効にできませんでした。", "error");
  }
}

async function initialize() {
  document.querySelector("#mapStatus").textContent = "国データを読み込んでいます";
  await initializeStorage();
  await loadMasterData();
  quizType = state.preferences.kidsMode ? "flag-map" : state.preferences.adultQuizType || state.preferences.quizType;
  setQuizType(quizType);
  document.querySelector("#quizRegion").value = state.preferences.region;
  document.querySelector("#quizDifficulty").value = state.preferences.difficulty;
  document.querySelector("#quizLength").value = String(state.preferences.length);
  renderMapGeometry();
  selectCountry(selectedCountry);
  applyExperienceMode();
  renderProgress();
  updateSettingsSummary();
  applyMapViewBox();
  const requestedView = new URLSearchParams(window.location.search).get("view");
  if (["explore", "quiz", "progress", "settings"].includes(requestedView)) switchView(requestedView);
  await registerServiceWorker();
}

initialize().catch((error) => {
  console.error(error);
  document.querySelector("#mapStatus").textContent = "データを読み込めませんでした";
  showToast("アプリの初期化に失敗しました。再読み込みしてください。", "error");
});
