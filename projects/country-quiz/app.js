const countries = [
  {
    id: "japan",
    isoA3: "JPN",
    name: "日本",
    capital: "東京",
    region: "アジア",
    flagSvg: `<svg viewBox="0 0 120 80" role="img" aria-label="日本の国旗"><rect width="120" height="80" fill="#fff"/><circle cx="60" cy="40" r="22" fill="#bc002d"/></svg>`,
    feature: "島国で、伝統文化と先端技術の両方で知られています。",
    hint: "赤い丸は太陽を表しています。",
    label: [812, 219],
    path: "M795 193l20 15 17 28-10 35-25 20-18-22 9-35-12-22z"
  },
  {
    id: "brazil",
    isoA3: "BRA",
    name: "ブラジル",
    capital: "ブラジリア",
    region: "南アメリカ",
    flagSvg: `<svg viewBox="0 0 120 80" role="img" aria-label="ブラジルの国旗"><rect width="120" height="80" fill="#229e45"/><path d="M60 10 108 40 60 70 12 40z" fill="#f8df00"/><circle cx="60" cy="40" r="18" fill="#002776"/><path d="M43 36c12-5 25-3 36 6" fill="none" stroke="#fff" stroke-width="4"/></svg>`,
    feature: "アマゾン熱帯雨林とサッカー文化で有名な、南米最大の国です。",
    hint: "緑地に黄色いひし形、中央に青い円があります。",
    label: [232, 363],
    path: "M208 294l48 14 31 49-14 78-54 51-36-55-18-76z"
  },
  {
    id: "canada",
    isoA3: "CAN",
    name: "カナダ",
    capital: "オタワ",
    region: "北アメリカ",
    flagSvg: `<svg viewBox="0 0 120 80" role="img" aria-label="カナダの国旗"><rect width="120" height="80" fill="#fff"/><rect width="30" height="80" fill="#d52b1e"/><rect x="90" width="30" height="80" fill="#d52b1e"/><path d="M60 15l6 14 12-5-5 13 12 4-13 6 5 13-12-5-5 14-5-14-12 5 5-13-13-6 12-4-5-13 12 5z" fill="#d52b1e"/></svg>`,
    feature: "広大な自然、湖、メープルリーフの国旗で知られています。",
    hint: "中央に赤いカエデの葉があります。",
    label: [176, 124],
    path: "M62 82l83-31 92 8 72 38-21 65-82 48-100-18-57-61z"
  },
  {
    id: "usa",
    isoA3: "USA",
    name: "アメリカ合衆国",
    capital: "ワシントンD.C.",
    region: "北アメリカ",
    flagSvg: `<svg viewBox="0 0 120 80" role="img" aria-label="アメリカ合衆国の国旗"><rect width="120" height="80" fill="#b22234"/><g fill="#fff"><rect y="6" width="120" height="6"/><rect y="18" width="120" height="6"/><rect y="30" width="120" height="6"/><rect y="42" width="120" height="6"/><rect y="54" width="120" height="6"/><rect y="66" width="120" height="6"/></g><rect width="52" height="43" fill="#3c3b6e"/><g fill="#fff"><circle cx="8" cy="7" r="2"/><circle cx="20" cy="7" r="2"/><circle cx="32" cy="7" r="2"/><circle cx="44" cy="7" r="2"/><circle cx="14" cy="18" r="2"/><circle cx="26" cy="18" r="2"/><circle cx="38" cy="18" r="2"/><circle cx="8" cy="29" r="2"/><circle cx="20" cy="29" r="2"/><circle cx="32" cy="29" r="2"/><circle cx="44" cy="29" r="2"/></g></svg>`,
    feature: "多様な州と文化を持ち、世界的な経済・文化の発信地です。",
    hint: "星と赤白のしま模様が特徴です。",
    label: [180, 218],
    path: "M83 175l95-16 85 9 56 35-44 52-118 22-98-47z"
  },
  {
    id: "france",
    isoA3: "FRA",
    name: "フランス",
    capital: "パリ",
    region: "ヨーロッパ",
    flagSvg: `<svg viewBox="0 0 120 80" role="img" aria-label="フランスの国旗"><rect width="40" height="80" fill="#0055a4"/><rect x="40" width="40" height="80" fill="#fff"/><rect x="80" width="40" height="80" fill="#ef4135"/></svg>`,
    feature: "芸術、料理、ファッション、歴史的建築で知られています。",
    hint: "青・白・赤の縦三色旗です。",
    label: [475, 183],
    path: "M455 151l32-13 30 19-4 38-26 31-33-25-10-27z"
  },
  {
    id: "uk",
    isoA3: "GBR",
    name: "イギリス",
    capital: "ロンドン",
    region: "ヨーロッパ",
    flagSvg: `<svg viewBox="0 0 120 80" role="img" aria-label="イギリスの国旗"><rect width="120" height="80" fill="#012169"/><path d="M0 0l120 80M120 0L0 80" stroke="#fff" stroke-width="16"/><path d="M0 0l120 80M120 0L0 80" stroke="#c8102e" stroke-width="8"/><path d="M60 0v80M0 40h120" stroke="#fff" stroke-width="26"/><path d="M60 0v80M0 40h120" stroke="#c8102e" stroke-width="14"/></svg>`,
    feature: "議会政治や産業革命の歴史、英語文化で世界に大きな影響を与えました。",
    hint: "赤・白・青のユニオンジャックです。",
    label: [441, 143],
    path: "M424 116l24 8 12 27-15 32-27-18-9-27z"
  },
  {
    id: "germany",
    isoA3: "DEU",
    name: "ドイツ",
    capital: "ベルリン",
    region: "ヨーロッパ",
    flagSvg: `<svg viewBox="0 0 120 80" role="img" aria-label="ドイツの国旗"><rect width="120" height="27" fill="#000"/><rect y="27" width="120" height="26" fill="#dd0000"/><rect y="53" width="120" height="27" fill="#ffce00"/></svg>`,
    feature: "工業、音楽、哲学、サッカーで知られるヨーロッパ中央部の国です。",
    hint: "黒・赤・金の横三色旗です。",
    label: [516, 156],
    path: "M498 128l35 4 22 27-13 34-29 19-30-26-5-32z"
  },
  {
    id: "russia",
    isoA3: "RUS",
    name: "ロシア",
    capital: "モスクワ",
    region: "ヨーロッパ・アジア",
    flagSvg: `<svg viewBox="0 0 120 80" role="img" aria-label="ロシアの国旗"><rect width="120" height="27" fill="#fff"/><rect y="27" width="120" height="26" fill="#0039a6"/><rect y="53" width="120" height="27" fill="#d52b1e"/></svg>`,
    feature: "世界最大の面積を持ち、ヨーロッパからアジアまで広がっています。",
    hint: "白・青・赤の横三色旗です。",
    label: [649, 122],
    path: "M562 81l111-30 168 18 104 58-45 75-155 37-143-28-67-67z"
  },
  {
    id: "egypt",
    isoA3: "EGY",
    name: "エジプト",
    capital: "カイロ",
    region: "アフリカ",
    flagSvg: `<svg viewBox="0 0 120 80" role="img" aria-label="エジプトの国旗"><rect width="120" height="27" fill="#ce1126"/><rect y="27" width="120" height="26" fill="#fff"/><rect y="53" width="120" height="27" fill="#000"/><path d="M60 31l5 9-5 9-5-9z" fill="#c09300"/></svg>`,
    feature: "ナイル川とピラミッドなど、古代文明の遺産で有名です。",
    hint: "赤・白・黒の横三色旗です。",
    label: [538, 258],
    path: "M504 223l61-2 44 23 8 53-47 42-59-34-14-46z"
  },
  {
    id: "india",
    isoA3: "IND",
    name: "インド",
    capital: "ニューデリー",
    region: "アジア",
    flagSvg: `<svg viewBox="0 0 120 80" role="img" aria-label="インドの国旗"><rect width="120" height="27" fill="#ff9933"/><rect y="27" width="120" height="26" fill="#fff"/><rect y="53" width="120" height="27" fill="#138808"/><circle cx="60" cy="40" r="10" fill="none" stroke="#000080" stroke-width="2"/><g stroke="#000080" stroke-width="1"><path d="M60 30v20M50 40h20M53 33l14 14M67 33L53 47"/></g></svg>`,
    feature: "多言語・多宗教の文化と、香辛料を使った料理で知られています。",
    hint: "オレンジ・白・緑の横三色と青い輪が特徴です。",
    label: [670, 292],
    path: "M640 237l52 14 40 39-10 57-42 58-35-64-22-52z"
  },
  {
    id: "china",
    isoA3: "CHN",
    name: "中国",
    capital: "北京",
    region: "アジア",
    flagSvg: `<svg viewBox="0 0 120 80" role="img" aria-label="中国の国旗"><rect width="120" height="80" fill="#de2910"/><path d="M25 13l4 12 13 .1-10 7 4 12-11-7-10 7 4-12-10-7 13-.1z" fill="#ffde00"/><g fill="#ffde00"><circle cx="52" cy="17" r="4"/><circle cx="62" cy="29" r="4"/><circle cx="62" cy="45" r="4"/><circle cx="50" cy="56" r="4"/></g></svg>`,
    feature: "長い歴史と多様な地域を持ち、世界有数の人口と経済規模を持つ国です。",
    hint: "赤地に黄色い星が配置されています。",
    label: [736, 218],
    path: "M671 167l91-13 88 36 10 65-68 64-92-7-57-58z"
  },
  {
    id: "southAfrica",
    isoA3: "ZAF",
    name: "南アフリカ",
    capital: "プレトリア",
    region: "アフリカ",
    flagSvg: `<svg viewBox="0 0 120 80" role="img" aria-label="南アフリカの国旗"><rect width="120" height="80" fill="#002395"/><rect y="40" width="120" height="40" fill="#de3831"/><path d="M0 0l58 40L0 80z" fill="#000"/><path d="M0 0l65 40L0 80" fill="none" stroke="#fff" stroke-width="18"/><path d="M0 0l65 40L0 80" fill="none" stroke="#ffb612" stroke-width="10"/><path d="M0 0l65 40L0 80" fill="none" stroke="#007a4d" stroke-width="18"/><path d="M62 40H120" stroke="#fff" stroke-width="18"/><path d="M62 40H120" stroke="#007a4d" stroke-width="10"/></svg>`,
    feature: "多様な民族・言語・自然環境を持ち、ケープタウンなどの都市で知られています。",
    hint: "緑のY字形が目立つ多色の国旗です。",
    label: [550, 426],
    path: "M500 381l72-8 58 35-28 72-67 20-49-47z"
  },
  {
    id: "mexico",
    isoA3: "MEX",
    name: "メキシコ",
    capital: "メキシコシティ",
    region: "北アメリカ",
    flagSvg: `<svg viewBox="0 0 120 80" role="img" aria-label="メキシコの国旗"><rect width="40" height="80" fill="#006847"/><rect x="40" width="40" height="80" fill="#fff"/><rect x="80" width="40" height="80" fill="#ce1126"/><circle cx="60" cy="40" r="8" fill="#8c6b32"/></svg>`,
    feature: "古代文明の遺跡、豊かな食文化、スペイン語圏の文化で知られています。",
    hint: "緑・白・赤の縦三色旗です。",
    label: [150, 286],
    path: "M101 249l74 12 47 42 11 49-58-21-55-46z"
  },
  {
    id: "argentina",
    isoA3: "ARG",
    name: "アルゼンチン",
    capital: "ブエノスアイレス",
    region: "南アメリカ",
    flagSvg: `<svg viewBox="0 0 120 80" role="img" aria-label="アルゼンチンの国旗"><rect width="120" height="27" fill="#74acdf"/><rect y="27" width="120" height="26" fill="#fff"/><rect y="53" width="120" height="27" fill="#74acdf"/><circle cx="60" cy="40" r="8" fill="#f6b40e"/></svg>`,
    feature: "タンゴ、サッカー、パンパの大草原、アンデス山脈で知られています。",
    hint: "水色と白の横じま、中央の太陽が特徴です。",
    label: [213, 444],
    path: "M196 382l40 18 20 54-24 65-39-15-18-76z"
  },
  {
    id: "australia",
    isoA3: "AUS",
    name: "オーストラリア",
    capital: "キャンベラ",
    region: "オセアニア",
    flagSvg: `<svg viewBox="0 0 120 80" role="img" aria-label="オーストラリアの国旗"><rect width="120" height="80" fill="#012169"/><path d="M0 0h54v38H0z" fill="#012169"/><path d="M0 0l54 38M54 0L0 38" stroke="#fff" stroke-width="8"/><path d="M0 0l54 38M54 0L0 38" stroke="#c8102e" stroke-width="4"/><path d="M27 0v38M0 19h54" stroke="#fff" stroke-width="11"/><path d="M27 0v38M0 19h54" stroke="#c8102e" stroke-width="6"/><g fill="#fff"><path d="M77 20l3 7 7-3-3 7 7 3-7 3 3 7-7-3-3 7-3-7-7 3 3-7-7-3 7-3-3-7 7 3z"/><circle cx="100" cy="52" r="5"/><circle cx="88" cy="62" r="4"/><circle cx="103" cy="30" r="4"/></g></svg>`,
    feature: "大陸そのものが一つの国で、独自の自然と都市文化があります。",
    hint: "南半球の星座を表す星が入っています。",
    label: [842, 402],
    path: "M782 354l82-23 73 32 24 58-57 57-95-10-63-52z"
  }
];

const state = {
  selected: countries[0],
  currentQuestion: null,
  answered: false,
  score: 0,
  total: 0,
  geoFeatures: [],
  mapViewBox: { x: 0, y: 0, width: 1000, height: 520 }
};

const countryLayer = document.querySelector("#countryLayer");
const countryFlag = document.querySelector("#countryFlag");
const countryName = document.querySelector("#countryName");
const countryRegion = document.querySelector("#countryRegion");
const countryCapital = document.querySelector("#countryCapital");
const countryFeature = document.querySelector("#countryFeature");
const quizFlag = document.querySelector("#quizFlag");
const choices = document.querySelector("#choices");
const feedback = document.querySelector("#feedback");
const scoreText = document.querySelector("#scoreText");
const hintTitle = document.querySelector("#hintTitle");
const hintText = document.querySelector("#hintText");
const worldMap = document.querySelector(".world-map");
const countriesByIso = new Map(countries.map((country) => [country.isoA3, country]));

const defaultViewBox = { x: 0, y: 0, width: 1000, height: 520 };
const minViewBoxWidth = 360;
const maxViewBoxWidth = 1000;

function projectPoint([lon, lat]) {
  return [
    20 + ((lon + 180) / 360) * 960,
    24 + ((90 - lat) / 180) * 472
  ];
}

function ringToPath(ring) {
  return ring.map((point, index) => {
    const [x, y] = projectPoint(point);
    return `${index === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
  }).join(" ") + " Z";
}

function geometryToPath(geometry) {
  if (!geometry) return "";
  if (geometry.type === "Polygon") {
    return geometry.coordinates.map(ringToPath).join(" ");
  }
  if (geometry.type === "MultiPolygon") {
    return geometry.coordinates.flatMap((polygon) => polygon.map(ringToPath)).join(" ");
  }
  return "";
}

function applyMapViewBox() {
  const box = state.mapViewBox;
  worldMap.setAttribute("viewBox", `${box.x} ${box.y} ${box.width} ${box.height}`);
}

function clampMapViewBox(box) {
  const width = Math.min(maxViewBoxWidth, Math.max(minViewBoxWidth, box.width));
  const height = width * (defaultViewBox.height / defaultViewBox.width);
  const maxX = defaultViewBox.width - width;
  const maxY = defaultViewBox.height - height;
  return {
    x: Math.min(maxX, Math.max(defaultViewBox.x, box.x)),
    y: Math.min(maxY, Math.max(defaultViewBox.y, box.y)),
    width,
    height
  };
}

function zoomMap(scale) {
  const current = state.mapViewBox;
  const centerX = current.x + current.width / 2;
  const centerY = current.y + current.height / 2;
  const nextWidth = current.width * scale;
  const nextHeight = nextWidth * (defaultViewBox.height / defaultViewBox.width);
  state.mapViewBox = clampMapViewBox({
    x: centerX - nextWidth / 2,
    y: centerY - nextHeight / 2,
    width: nextWidth,
    height: nextHeight
  });
  applyMapViewBox();
}

function resetMapZoom() {
  state.mapViewBox = { ...defaultViewBox };
  applyMapViewBox();
}

function renderCountries() {
  if (state.geoFeatures.length) {
    countryLayer.innerHTML = state.geoFeatures.map((feature) => {
      const iso = feature.properties.ISO_A3;
      const country = countriesByIso.get(iso);
      const path = geometryToPath(feature.geometry);
      if (!path) return "";

      if (!country) {
        return `<path class="map-country" d="${path}"><title>${feature.properties.NAME_JA || feature.properties.NAME || ""}</title></path>`;
      }

      const active = country.id === state.selected.id ? " active" : "";
      const [labelX, labelY] = projectPoint([feature.properties.LABEL_X, feature.properties.LABEL_Y]);
      return `<path class="country-shape${active}" data-country="${country.id}" d="${path}">
        <title>${country.name}</title>
      </path>
      <text class="country-label" x="${labelX.toFixed(1)}" y="${labelY.toFixed(1)}">${country.name}</text>`;
    }).join("");
    return;
  }

  countryLayer.innerHTML = countries.map((country) => (
    `<path class="country-shape${country.id === state.selected.id ? " active" : ""}" data-country="${country.id}" d="${country.path}">
      <title>${country.name}</title>
    </path>
    <text class="country-label" x="${country.label[0]}" y="${country.label[1]}">${country.name}</text>`
  )).join("");
}

function selectCountry(country) {
  state.selected = country;
  countryFlag.innerHTML = country.flagSvg;
  countryName.textContent = country.name;
  countryRegion.textContent = country.region;
  countryCapital.textContent = country.capital;
  countryFeature.textContent = country.feature;
  renderCountries();
}

function shuffle(items) {
  return [...items].sort(() => Math.random() - 0.5);
}

function makeQuestion(preferredCountry) {
  const answer = preferredCountry || countries[Math.floor(Math.random() * countries.length)];
  const wrongChoices = shuffle(countries.filter((country) => country.id !== answer.id)).slice(0, 3);
  state.currentQuestion = answer;
  state.answered = false;
  quizFlag.innerHTML = answer.flagSvg;
  feedback.textContent = "";
  hintTitle.textContent = `${answer.region}の国`;
  hintText.textContent = answer.hint;
  choices.innerHTML = shuffle([answer, ...wrongChoices]).map((country) => (
    `<button class="choice" type="button" data-answer="${country.id}">${country.name}</button>`
  )).join("");
}

function answerQuestion(countryId) {
  if (state.answered) return;
  state.answered = true;
  state.total += 1;

  const isCorrect = countryId === state.currentQuestion.id;
  if (isCorrect) state.score += 1;

  document.querySelectorAll(".choice").forEach((button) => {
    const buttonCountryId = button.dataset.answer;
    if (buttonCountryId === state.currentQuestion.id) button.classList.add("correct");
    if (buttonCountryId === countryId && !isCorrect) button.classList.add("wrong");
  });

  feedback.textContent = isCorrect
    ? `正解です。${state.currentQuestion.name}の首都は${state.currentQuestion.capital}です。`
    : `答えは${state.currentQuestion.name}です。${state.currentQuestion.feature}`;
  scoreText.textContent = `${state.score} / ${state.total}`;
}

document.addEventListener("click", (event) => {
  const tab = event.target.closest(".tab");
  if (tab) {
    document.querySelectorAll(".tab").forEach((button) => button.classList.remove("active"));
    document.querySelectorAll(".view").forEach((view) => view.classList.remove("active"));
    tab.classList.add("active");
    document.querySelector(`#${tab.dataset.view}`).classList.add("active");
  }

  const countryShape = event.target.closest(".country-shape");
  if (countryShape) {
    const country = countries.find((item) => item.id === countryShape.dataset.country);
    selectCountry(country);
  }

  const choice = event.target.closest(".choice");
  if (choice) answerQuestion(choice.dataset.answer);
});

document.querySelector("#nextQuestion").addEventListener("click", () => makeQuestion());

document.querySelector("#resetQuiz").addEventListener("click", () => {
  state.score = 0;
  state.total = 0;
  scoreText.textContent = "0 / 0";
  makeQuestion();
});

document.querySelector("#startFromCountry").addEventListener("click", () => {
  document.querySelector('[data-view="flagView"]').click();
  makeQuestion(state.selected);
});

document.querySelector("#zoomIn").addEventListener("click", () => zoomMap(0.72));
document.querySelector("#zoomOut").addEventListener("click", () => zoomMap(1.28));
document.querySelector("#zoomReset").addEventListener("click", resetMapZoom);

worldMap.addEventListener("wheel", (event) => {
  event.preventDefault();
  zoomMap(event.deltaY < 0 ? 0.86 : 1.16);
}, { passive: false });

let dragStart = null;

worldMap.addEventListener("pointerdown", (event) => {
  if (event.target.closest(".country-shape")) return;
  worldMap.setPointerCapture(event.pointerId);
  worldMap.classList.add("dragging");
  dragStart = {
    pointerId: event.pointerId,
    x: event.clientX,
    y: event.clientY,
    box: { ...state.mapViewBox }
  };
});

worldMap.addEventListener("pointermove", (event) => {
  if (!dragStart || dragStart.pointerId !== event.pointerId) return;
  const rect = worldMap.getBoundingClientRect();
  const dx = ((event.clientX - dragStart.x) / rect.width) * dragStart.box.width;
  const dy = ((event.clientY - dragStart.y) / rect.height) * dragStart.box.height;
  state.mapViewBox = clampMapViewBox({
    ...dragStart.box,
    x: dragStart.box.x - dx,
    y: dragStart.box.y - dy
  });
  applyMapViewBox();
});

worldMap.addEventListener("pointerup", (event) => {
  if (dragStart?.pointerId === event.pointerId) {
    dragStart = null;
    worldMap.classList.remove("dragging");
  }
});

worldMap.addEventListener("pointercancel", () => {
  dragStart = null;
  worldMap.classList.remove("dragging");
});

async function loadOnlineWorldMap() {
  const source = "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_admin_0_countries.geojson";
  try {
    const response = await fetch(source);
    if (!response.ok) throw new Error(`map load failed: ${response.status}`);
    const geoJson = await response.json();
    state.geoFeatures = geoJson.features.filter((feature) => feature.properties.ISO_A3 !== "ATA");
    document.querySelector(".continent-layer").style.display = "none";
    renderCountries();
  } catch (error) {
    console.warn("Online world map could not be loaded. Using local fallback map.", error);
  }
}

selectCountry(countries[0]);
makeQuestion();
applyMapViewBox();
loadOnlineWorldMap();
