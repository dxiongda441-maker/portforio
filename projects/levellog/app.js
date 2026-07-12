const categories = {
  study: { label: "学習", color: "#2772b8", valueType: "future" },
  work: { label: "仕事・副業", color: "#0f8b8d", valueType: "future" },
  health: { label: "健康", color: "#2f9e44", valueType: "future" },
  life: { label: "生活", color: "#d89b2b", valueType: "neutral" },
  waste: { label: "見直し候補", color: "#d9480f", valueType: "waste" },
};

const calendarSamples = [
  { title: "英語学習", minutes: 60, category: "study", difficulty: 1.3, time: "19:00 - 20:00" },
  { title: "筋トレ", minutes: 35, category: "health", difficulty: 1.3, time: "20:20 - 20:55" },
  { title: "SNS・動画", minutes: 45, category: "waste", difficulty: 1, time: "22:00 - 22:45" },
];

const initialQuests = [
  { id: crypto.randomUUID(), title: "資格勉強", minutes: 45, category: "study", difficulty: 1.3, done: false },
  { id: crypto.randomUUID(), title: "ポートフォリオ作成", minutes: 60, category: "work", difficulty: 1.6, done: false },
  { id: crypto.randomUUID(), title: "スマホを見すぎた時間", minutes: 30, category: "waste", difficulty: 1, done: true },
];

const savedState = loadState();
let quests = savedState?.quests || initialQuests;
let activeFilter = "all";

const yen = new Intl.NumberFormat("ja-JP", {
  style: "currency",
  currency: "JPY",
  maximumFractionDigits: 0,
});

const els = {
  navItems: document.querySelectorAll(".nav-item"),
  views: document.querySelectorAll(".view"),
  addQuestBtn: document.querySelector("#addQuestBtn"),
  questDialog: document.querySelector("#questDialog"),
  questForm: document.querySelector("#questForm"),
  questList: document.querySelector("#questList"),
  calendarList: document.querySelector("#calendarList"),
  importCalendarBtn: document.querySelector("#importCalendarBtn"),
  hourlyRate: document.querySelector("#hourlyRate"),
  futureRate: document.querySelector("#futureRate"),
  statusGrid: document.querySelector("#statusGrid"),
  weeklyInsight: document.querySelector("#weeklyInsight"),
};

function calculateExp(quest) {
  const base = quest.minutes;
  const difficulty = Number(quest.difficulty);
  const categoryBonus = quest.category === "waste" ? 0.4 : 1;
  return Math.round(base * difficulty * categoryBonus);
}

function getRates() {
  return {
    hourly: Number(els.hourlyRate.value || 0),
    future: Number(els.futureRate.value || 0),
  };
}

function getSummary() {
  const doneQuests = quests.filter((quest) => quest.done);
  const totalExp = doneQuests.reduce((sum, quest) => sum + calculateExp(quest), 0);
  const level = Math.floor(totalExp / 100) + 1;
  const currentLevelExp = totalExp % 100;
  const todayExp = doneQuests.reduce((sum, quest) => sum + calculateExp(quest), 0);
  const investedMinutes = doneQuests
    .filter((quest) => categories[quest.category].valueType === "future")
    .reduce((sum, quest) => sum + quest.minutes, 0);
  const wasteMinutes = doneQuests
    .filter((quest) => categories[quest.category].valueType === "waste")
    .reduce((sum, quest) => sum + quest.minutes, 0);

  return { totalExp, level, currentLevelExp, todayExp, investedMinutes, wasteMinutes };
}

function setText(id, value) {
  document.querySelector(id).textContent = value;
}

function renderHero() {
  const { totalExp, level, currentLevelExp, todayExp, investedMinutes, wasteMinutes } = getSummary();
  const { hourly, future } = getRates();
  const rank = level >= 10 ? "習慣化マスター" : level >= 5 ? "成長中の勇者" : "駆け出し冒険者";

  setText("#level", level);
  setText("#rankName", rank);
  setText("#progressText", `次のレベルまであと ${100 - currentLevelExp} EXP`);
  setText("#todayExp", todayExp);
  setText("#investedTime", `${(investedMinutes / 60).toFixed(1)}h`);
  setText("#recoverableValue", yen.format((wasteMinutes / 60) * hourly));
  document.querySelector("#progressFill").style.width = `${currentLevelExp}%`;

  setText("#weekExp", totalExp);
  setText("#futureValue", yen.format((investedMinutes / 60) * future));
  setText("#wastedValue", yen.format((wasteMinutes / 60) * hourly));
}

function renderQuests() {
  const filtered = quests.filter((quest) => {
    if (activeFilter === "done") return quest.done;
    if (activeFilter === "open") return !quest.done;
    return true;
  });

  els.questList.innerHTML = "";

  if (filtered.length === 0) {
    els.questList.innerHTML = `<article class="quest-card"><div>表示できるクエストがありません。</div></article>`;
    return;
  }

  filtered.forEach((quest) => {
    const category = categories[quest.category];
    const card = document.createElement("article");
    card.className = "quest-card";
    card.innerHTML = `
      <div>
        <div class="quest-title">
          <span class="category-dot" style="background:${category.color}"></span>
          <strong>${escapeHtml(quest.title)}</strong>
        </div>
        <div class="quest-meta">
          <span class="chip">${category.label}</span>
          <span class="chip">${quest.minutes}分</span>
          <span class="chip">${calculateExp(quest)} EXP</span>
          <span class="chip">${quest.done ? "完了" : "未完了"}</span>
        </div>
      </div>
      <div class="quest-actions">
        <button class="small-button ${quest.done ? "done" : ""}" data-action="toggle" data-id="${quest.id}">
          ${quest.done ? "完了済み" : "完了"}
        </button>
        <button class="small-button delete" data-action="delete" data-id="${quest.id}">削除</button>
      </div>
    `;
    els.questList.appendChild(card);
  });
}

function renderCalendar() {
  els.calendarList.innerHTML = "";
  calendarSamples.forEach((item, index) => {
    const category = categories[item.category];
    const card = document.createElement("article");
    card.className = "calendar-card";
    card.innerHTML = `
      <div>
        <div class="quest-title">
          <span class="category-dot" style="background:${category.color}"></span>
          <strong>${escapeHtml(item.title)}</strong>
        </div>
        <div class="quest-meta">
          <span class="chip">${item.time}</span>
          <span class="chip">${item.minutes}分</span>
          <span class="chip">${category.label}</span>
        </div>
      </div>
      <button class="small-button" data-action="import" data-index="${index}">クエスト化</button>
    `;
    els.calendarList.appendChild(card);
  });
}

function renderStatus() {
  const maxExp = Math.max(
    100,
    ...Object.keys(categories).map((key) =>
      quests
        .filter((quest) => quest.done && quest.category === key)
        .reduce((sum, quest) => sum + calculateExp(quest), 0)
    )
  );

  els.statusGrid.innerHTML = "";
  Object.entries(categories).forEach(([key, category]) => {
    const exp = quests
      .filter((quest) => quest.done && quest.category === key)
      .reduce((sum, quest) => sum + calculateExp(quest), 0);
    const card = document.createElement("article");
    card.className = "stat-card";
    card.innerHTML = `
      <span>${category.label}</span>
      <strong>${exp} EXP</strong>
      <div class="stat-bar"><div style="width:${Math.min(100, (exp / maxExp) * 100)}%; background:${category.color}"></div></div>
    `;
    els.statusGrid.appendChild(card);
  });
}

function renderReview() {
  const { investedMinutes, wasteMinutes, totalExp } = getSummary();
  const { hourly, future } = getRates();
  const investment = yen.format((investedMinutes / 60) * future);
  const waste = yen.format((wasteMinutes / 60) * hourly);

  els.weeklyInsight.textContent =
    totalExp === 0
      ? "まずは1つだけ完了して、行動ログを作りましょう。小さな記録でもEXPになります。"
      : `今週は${(investedMinutes / 60).toFixed(1)}時間を未来への投資に使いました。目標時給で見ると${investment}相当です。見直し候補は${waste}分あるので、次はこの時間を1つだけクエストに変えるのがおすすめです。`;
}

function renderAll() {
  renderHero();
  renderQuests();
  renderCalendar();
  renderStatus();
  renderReview();
  saveState();
}

function addQuest({ title, minutes, category, difficulty, done = false }) {
  quests.unshift({
    id: crypto.randomUUID(),
    title,
    minutes: Number(minutes),
    category,
    difficulty: Number(difficulty),
    done,
  });
  renderAll();
}

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (char) => {
    const entities = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" };
    return entities[char];
  });
}

function loadState() {
  try {
    const raw = localStorage.getItem("level-log-state");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveState() {
  localStorage.setItem(
    "level-log-state",
    JSON.stringify({
      quests,
      hourlyRate: els.hourlyRate.value,
      futureRate: els.futureRate.value,
    })
  );
}

if (savedState?.hourlyRate) {
  els.hourlyRate.value = savedState.hourlyRate;
}

if (savedState?.futureRate) {
  els.futureRate.value = savedState.futureRate;
}

els.navItems.forEach((item) => {
  item.addEventListener("click", () => {
    els.navItems.forEach((nav) => nav.classList.remove("active"));
    els.views.forEach((view) => view.classList.remove("active"));
    item.classList.add("active");
    document.querySelector(`#${item.dataset.view}View`).classList.add("active");
  });
});

document.querySelectorAll(".segment").forEach((segment) => {
  segment.addEventListener("click", () => {
    document.querySelectorAll(".segment").forEach((item) => item.classList.remove("active"));
    segment.classList.add("active");
    activeFilter = segment.dataset.filter;
    renderQuests();
  });
});

els.addQuestBtn.addEventListener("click", () => {
  els.questDialog.showModal();
});

els.questForm.addEventListener("submit", (event) => {
  event.preventDefault();
  addQuest({
    title: document.querySelector("#questTitle").value.trim(),
    minutes: document.querySelector("#questMinutes").value,
    difficulty: document.querySelector("#questDifficulty").value,
    category: document.querySelector("#questCategory").value,
  });
  els.questForm.reset();
  document.querySelector("#questMinutes").value = 30;
  els.questDialog.close();
});

els.questList.addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button) return;
  const quest = quests.find((item) => item.id === button.dataset.id);
  if (!quest) return;

  if (button.dataset.action === "toggle") {
    quest.done = !quest.done;
  }

  if (button.dataset.action === "delete") {
    quests = quests.filter((item) => item.id !== quest.id);
  }

  renderAll();
});

els.calendarList.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-action='import']");
  if (!button) return;
  const sample = calendarSamples[Number(button.dataset.index)];
  addQuest({ ...sample, done: false });
});

els.importCalendarBtn.addEventListener("click", () => {
  calendarSamples.forEach((sample) => addQuest({ ...sample, done: false }));
});

[els.hourlyRate, els.futureRate].forEach((input) => input.addEventListener("input", renderAll));

if ("serviceWorker" in navigator && location.protocol !== "file:") {
  navigator.serviceWorker.register("./service-worker.js");
}

renderAll();
