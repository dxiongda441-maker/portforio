"use strict";

/* =========================================================
   画面の切り替え・メニュー・参加者設定・結果・成績の保存
   ========================================================= */

const STORE_KEY = "family-cards:v1";
const CPU_NAMES = ["タロウ", "ハナコ", "ジロウ", "サクラ", "ゴロウ", "モモ"];
const SPEEDS = [
  { value: 1.6, label: "ゆっくり" },
  { value: 1, label: "ふつう" },
  { value: 0.5, label: "はやい" },
];

function loadStore() {
  try {
    const data = JSON.parse(localStorage.getItem(STORE_KEY) || "{}");
    return { names: [], stats: {}, speed: 1, options: {}, ...data };
  } catch {
    return { names: [], stats: {}, speed: 1, options: {} };
  }
}

function saveStore() {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(store));
  } catch {
    /* 保存できなくても遊べる */
  }
}

const store = loadStore();
const params = new URLSearchParams(location.search);
// ?speed=0 は動作確認用（CPUの待ち時間をほぼ無くす）
Speed.factor = params.has("speed") ? Number(params.get("speed")) : store.speed;

const $ = (sel) => document.querySelector(sel);

const ui = {
  table: $("#table"),
  message(text) {
    $("#message").textContent = text;
  },
  log(text) {
    const list = $("#log");
    list.prepend(h("li", { text }));
    while (list.children.length > 80) list.lastChild.remove();
  },
  actions(list, onPick) {
    const bar = $("#actions");
    bar.replaceChildren();
    for (const item of list) {
      bar.append(
        h(
          "button",
          {
            type: "button",
            class: `btn${item.primary ? " primary" : ""}${item.danger ? " danger" : ""}`,
            disabled: item.disabled || null,
            onclick: () => onPick(item.value),
          },
          item.label,
        ),
      );
    }
  },
  showCover(name) {
    $("#cover-name").textContent = name;
    $("#cover").hidden = false;
    $("#cover-btn").focus();
  },
  hideCover() {
    $("#cover").hidden = true;
  },
};

let current = null; // 実行中の Session
let setupState = null;

function showScreen(id) {
  for (const el of document.querySelectorAll(".screen")) el.hidden = el.id !== id;
  window.scrollTo(0, 0);
}

/* ---------- メニュー ---------- */

function renderMenu() {
  const list = $("#game-list");
  list.replaceChildren();
  for (const game of GAMES) {
    list.append(
      h(
        "button",
        { type: "button", class: `game-tile tone-${game.tone || "red"}`, onclick: () => openSetup(game) },
        h("span", { class: "tile-mark", "aria-hidden": "true", text: game.mark }),
        h("span", { class: "tile-body" }, h("strong", { text: game.title }), h("small", { text: game.tagline })),
        h("span", { class: "tile-players", text: playersLabel(game) }),
      ),
    );
  }
  renderStats();
  renderSpeed();
}

function playersLabel(game) {
  const [min, max] = game.players;
  return min === max ? `${min}人` : `${min}〜${max}人`;
}

function renderStats() {
  const box = $("#stats");
  const rows = Object.entries(store.stats).sort((a, b) => b[1].points - a[1].points || b[1].wins - a[1].wins);
  box.replaceChildren();
  if (!rows.length) {
    box.append(h("p", { class: "muted", text: "まだ記録がありません。ゲームを遊ぶと、人間の参加者の成績がここにたまります。" }));
    $("#stats-reset").hidden = true;
    return;
  }
  $("#stats-reset").hidden = false;
  const table = h("table", { class: "stats-table" });
  table.append(h("tr", {}, h("th", { text: "" }), h("th", { text: "名前" }), h("th", { text: "ポイント" }), h("th", { text: "1位" }), h("th", { text: "遊んだ回数" })));
  rows.forEach(([name, st], i) => {
    table.append(
      h(
        "tr",
        {},
        h("td", { class: "stat-rank", text: i === 0 ? "👑" : String(i + 1) }),
        h("td", { text: name }),
        h("td", { text: `${st.points}pt` }),
        h("td", { text: `${st.wins}回` }),
        h("td", { text: `${st.plays}回` }),
      ),
    );
  });
  box.append(table);
}

function renderSpeed() {
  const box = $("#speed");
  box.replaceChildren();
  for (const sp of SPEEDS) {
    box.append(
      h(
        "button",
        {
          type: "button",
          class: `seg${store.speed === sp.value ? " on" : ""}`,
          "aria-pressed": String(store.speed === sp.value),
          onclick: () => {
            store.speed = sp.value;
            if (!params.has("speed")) Speed.factor = sp.value;
            saveStore();
            renderSpeed();
          },
        },
        sp.label,
      ),
    );
  }
}

/* ---------- 参加者設定 ---------- */

function openSetup(game) {
  const [min, max] = game.players;
  const count = Math.min(max, Math.max(min, game.defaultPlayers || min));
  const saved = store.options[game.id] || {};
  const options = {};
  for (const opt of game.options || []) {
    const valid = opt.choices.some(([v]) => v === saved[opt.key]);
    options[opt.key] = valid ? saved[opt.key] : opt.default;
  }
  setupState = { game, count, seats: buildSeats(max), options };
  $("#setup-title").textContent = game.title;
  $("#setup-lead").textContent = game.tagline;
  renderSetup();
  showScreen("screen-setup");
}

function buildSeats(max) {
  const seats = [];
  for (let i = 0; i < max; i += 1) {
    seats.push({
      name: store.names[i] || (i === 0 ? "あなた" : CPU_NAMES[(i - 1) % CPU_NAMES.length]),
      human: i === 0,
    });
  }
  return seats;
}

function unusedCpuName(index) {
  const taken = new Set(setupState.seats.filter((_, i) => i !== index).map((seat) => seat.name));
  return CPU_NAMES.find((name) => !taken.has(name)) || `CPU${index + 1}`;
}

function renderSetup() {
  const { game, seats, options } = setupState;
  const [min, max] = game.players;

  const countBox = $("#setup-count");
  countBox.replaceChildren();
  if (min === max) {
    countBox.append(h("p", { class: "muted", text: `${min}人で遊ぶゲームです` }));
  } else {
    for (let n = min; n <= max; n += 1) {
      countBox.append(
        h(
          "button",
          {
            type: "button",
            class: `seg${setupState.count === n ? " on" : ""}`,
            "aria-pressed": String(setupState.count === n),
            onclick: () => {
              setupState.count = n;
              renderSetup();
            },
          },
          `${n}人`,
        ),
      );
    }
  }

  const seatBox = $("#setup-seats");
  seatBox.replaceChildren();
  for (let i = 0; i < setupState.count; i += 1) {
    const seat = seats[i];
    const input = h("input", { type: "text", value: seat.name, maxlength: "8", "aria-label": `${i + 1}人目の名前` });
    input.addEventListener("input", () => {
      seat.name = input.value;
    });
    seatBox.append(
      h(
        "div",
        { class: "seat-row" },
        h("span", { class: "seat-no", text: `${i + 1}` }),
        input,
        h(
          "button",
          {
            type: "button",
            class: `seg who${seat.human ? " on" : ""}`,
            "aria-pressed": String(seat.human),
            onclick: () => {
              seat.human = !seat.human;
              if (!seat.human && /^(あなた|プレイヤー\d)$/.test(seat.name)) seat.name = unusedCpuName(i);
              if (seat.human && (CPU_NAMES.includes(seat.name) || /^CPU\d$/.test(seat.name))) seat.name = `プレイヤー${i + 1}`;
              renderSetup();
            },
          },
          seat.human ? "人が遊ぶ" : "CPU",
        ),
      ),
    );
  }
  const humans = seats.slice(0, setupState.count).filter((s) => s.human).length;
  $("#setup-note").textContent =
    humans === 0
      ? "全員CPUの観戦モードです。"
      : humans > 1
        ? "人が2人以上のときは、自分の番の前に「端末を渡す」画面が出ます。手札は自分の番のときだけ表示されます。"
        : "";

  const optBox = $("#setup-options");
  optBox.replaceChildren();
  for (const opt of game.options || []) {
    const row = h("div", { class: "opt-row" }, h("p", { class: "opt-label", text: opt.label }));
    const segs = h("div", { class: "segs" });
    for (const [value, label] of opt.choices) {
      segs.append(
        h(
          "button",
          {
            type: "button",
            class: `seg${options[opt.key] === value ? " on" : ""}`,
            "aria-pressed": String(options[opt.key] === value),
            onclick: () => {
              options[opt.key] = value;
              renderSetup();
            },
          },
          label,
        ),
      );
    }
    row.append(segs);
    optBox.append(row);
  }
  $("#setup-options-wrap").hidden = !(game.options || []).length;
}

function startFromSetup() {
  const { game, seats, count, options } = setupState;
  const used = seats.slice(0, count).map((seat, i) => ({
    name: seat.name.trim() || (seat.human ? `プレイヤー${i + 1}` : CPU_NAMES[i % CPU_NAMES.length]),
    human: seat.human,
  }));
  // 同じ名前が並ぶと成績が混ざるので番号を付ける
  const seen = new Map();
  for (const p of used) {
    const n = (seen.get(p.name) || 0) + 1;
    seen.set(p.name, n);
    if (n > 1) p.name = `${p.name}${n}`;
  }
  store.names = seats.map((s) => s.name);
  store.options[game.id] = options;
  saveStore();
  startGame(game, used, options);
}

/* ---------- ゲーム実行 ---------- */

async function startGame(game, seatList, options) {
  if (current) current.abort();
  const players = seatList.map((seat, id) => ({ id, name: seat.name, human: seat.human, hand: [] }));
  const session = new Session({ game, players, options, ui });
  current = session;
  $("#game-title").textContent = game.title;
  $("#log").replaceChildren();
  ui.message("");
  ui.actions([], () => {});
  ui.table.replaceChildren();
  ui.table.className = `table game-${game.id}`;
  showScreen("screen-game");
  try {
    const ranking = await game.play(session);
    if (!session.alive) return;
    session.alive = false;
    session.clearIntervals();
    recordResult(ranking, players.length);
    showResult(game, ranking, seatList, options);
  } catch (error) {
    if (error instanceof Aborted) return;
    console.error(error);
    ui.message(`エラーが起きました: ${error.message}`);
    ui.actions([{ label: "メニューへ戻る", value: "menu", primary: true }], backToMenu);
  }
}

function recordResult(ranking, total) {
  ranking.forEach((entry, index) => {
    if (!entry.player.human) return;
    const st = store.stats[entry.player.name] || { points: 0, wins: 0, plays: 0 };
    st.plays += 1;
    st.points += total - 1 - index;
    if (index === 0) st.wins += 1;
    store.stats[entry.player.name] = st;
  });
  saveStore();
}

function showResult(game, ranking, seatList, options) {
  const box = $("#result-list");
  box.replaceChildren();
  ranking.forEach((entry, index) => {
    box.append(
      h(
        "li",
        { class: index === 0 ? "first" : "" },
        h("span", { class: "place", text: index === 0 ? "👑 1位" : placeLabel(index) }),
        h("strong", { text: entry.player.name }),
        entry.note ? h("small", { text: entry.note }) : null,
      ),
    );
  });
  $("#result-title").textContent = `${game.title} 結果`;
  const winner = ranking[0];
  $("#result-lead").textContent = winner ? `${winner.player.name}の勝ち！` : "";
  $("#result").hidden = false;
  $("#result-again").onclick = () => {
    $("#result").hidden = true;
    startGame(game, seatList, options);
  };
  $("#result-menu").onclick = () => {
    $("#result").hidden = true;
    backToMenu();
  };
  $("#result-again").focus();
}

function backToMenu() {
  if (current) current.abort();
  current = null;
  ui.hideCover();
  $("#result").hidden = true;
  renderMenu();
  showScreen("screen-menu");
}

function openRules(game) {
  $("#rules-title").textContent = `${game.title} のルール`;
  $("#rules-body").innerHTML = game.rules;
  const dialog = $("#rules-dialog");
  if (typeof dialog.showModal === "function") dialog.showModal();
  else dialog.setAttribute("open", "");
}

/* ---------- イベント ---------- */

$("#setup-back").addEventListener("click", backToMenu);
$("#setup-start").addEventListener("click", startFromSetup);
$("#setup-rules").addEventListener("click", () => openRules(setupState.game));
$("#quit-btn").addEventListener("click", () => {
  if (current && current.alive && !confirm("ゲームをやめてメニューに戻りますか？")) return;
  backToMenu();
});
$("#rules-btn").addEventListener("click", () => current && openRules(current.game));
$("#rules-close").addEventListener("click", () => {
  const dialog = $("#rules-dialog");
  if (typeof dialog.close === "function") dialog.close();
  else dialog.removeAttribute("open");
});
$("#cover-btn").addEventListener("click", () => current && current.answer("ready"));
$("#stats-reset").addEventListener("click", () => {
  if (!confirm("家族ランキングの記録をすべて消しますか？")) return;
  store.stats = {};
  saveStore();
  renderStats();
});

renderMenu();
showScreen("screen-menu");
