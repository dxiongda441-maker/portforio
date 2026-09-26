"use strict";

/* =========================================================
   共通部品: カード / 進行管理（Session） / 画面部品
   各ゲーム（games/*.js）はここの関数だけを使って組み立てる。
   ========================================================= */

const SUITS = ["S", "H", "D", "C"];
const SUIT_MARK = { S: "♠", H: "♥", D: "♦", C: "♣" };
const SUIT_NAME = { S: "スペード", H: "ハート", D: "ダイヤ", C: "クラブ" };
const RANK_LABEL = ["", "A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];

let cardSerial = 0;

function makeDeck({ jokers = 0, decks = 1 } = {}) {
  const deck = [];
  for (let d = 0; d < decks; d += 1) {
    for (const suit of SUITS) {
      for (let rank = 1; rank <= 13; rank += 1) {
        deck.push({ id: (cardSerial += 1), suit, rank, joker: false });
      }
    }
  }
  for (let j = 0; j < jokers; j += 1) {
    deck.push({ id: (cardSerial += 1), suit: "X", rank: 0, joker: true });
  }
  return deck;
}

function shuffle(list) {
  for (let i = list.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list;
}

function pickRandom(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function isRed(card) {
  return card.suit === "H" || card.suit === "D";
}

function rankLabel(card) {
  return card.joker ? "JK" : RANK_LABEL[card.rank];
}

function cardName(card) {
  return card.joker ? "ジョーカー" : `${SUIT_MARK[card.suit]}${RANK_LABEL[card.rank]}`;
}

function cardNames(cards) {
  return cards.map(cardName).join(" ");
}

/** 手札から指定のカードを取り除く（配列をそのまま書き換える） */
function takeOut(hand, cards) {
  for (const card of cards) {
    const index = hand.indexOf(card);
    if (index >= 0) hand.splice(index, 1);
  }
}

function suitOrder(card) {
  return card.joker ? 9 : SUITS.indexOf(card.suit);
}

function sortByRank(cards, strength = (c) => c.rank) {
  return [...cards].sort((a, b) => strength(a) - strength(b) || suitOrder(a) - suitOrder(b));
}

/* ---------- DOM ヘルパー ---------- */

function h(tag, props, ...children) {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(props || {})) {
    if (value == null || value === false) continue;
    if (key === "class") el.className = value;
    else if (key === "text") el.textContent = value;
    else if (key === "html") el.innerHTML = value;
    else if (key.startsWith("on")) el.addEventListener(key.slice(2), value);
    else el.setAttribute(key, value === true ? "" : value);
  }
  for (const child of children.flat()) {
    if (child == null || child === false) continue;
    el.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return el;
}

function cardEl(card, opts = {}) {
  const clickable = typeof opts.onClick === "function";
  const el = h(clickable ? "button" : "div", { class: "card", type: clickable ? "button" : null });
  if (!card || opts.faceDown) {
    el.classList.add("back");
    el.setAttribute("aria-label", "裏向きのカード");
  } else {
    const mark = card.joker ? "★" : SUIT_MARK[card.suit];
    el.classList.add(card.joker ? "joker" : isRed(card) ? "red" : "black");
    el.append(
      h("span", { class: "c-rank", text: card.joker ? "JOKER" : rankLabel(card) }),
      h("span", { class: "c-suit", text: mark }),
    );
    el.setAttribute("aria-label", cardName(card));
  }
  if (opts.size) el.classList.add(opts.size);
  if (opts.selected) el.classList.add("selected");
  if (opts.hint) el.classList.add("hint");
  if (opts.dim) el.classList.add("dim");
  if (opts.fresh) el.classList.add("fresh");
  if (opts.pop) el.classList.add("pop");
  if (clickable && opts.selected !== undefined) el.setAttribute("aria-pressed", String(Boolean(opts.selected)));
  if (clickable) el.addEventListener("click", () => opts.onClick(card, el));
  return el;
}

/** 裏向きの小さな束（相手の枚数表示用） */
function miniFan(count) {
  const fan = h("div", { class: "mini-fan", "aria-label": `${count}枚` });
  const shown = Math.min(count, 10);
  for (let i = 0; i < shown; i += 1) fan.append(h("span", { class: "mini-back" }));
  fan.append(h("b", { text: `${count}枚` }));
  return fan;
}

/* ---------- 効果音（音声ファイルを使わず Web Audio で合成） ---------- */

const SFX = {
  card: [["noise", 0, 0.07, 2400, 0.35]],
  draw: [["noise", 0, 0.05, 3600, 0.25]],
  turn: [["sine", 660, 0, 0.12, 0.1], ["sine", 880, 0.1, 0.18, 0.1]],
  good: [["triangle", 523, 0, 0.1, 0.12], ["triangle", 659, 0.08, 0.1, 0.12], ["triangle", 784, 0.16, 0.18, 0.12]],
  bad: [["square", 220, 0, 0.14, 0.05], ["square", 165, 0.12, 0.22, 0.05]],
  error: [["square", 150, 0, 0.12, 0.05]],
  special: [["sawtooth", 392, 0, 0.08, 0.05], ["sawtooth", 523, 0.07, 0.08, 0.05], ["sawtooth", 659, 0.14, 0.08, 0.05], ["sawtooth", 1047, 0.21, 0.25, 0.05]],
  win: [["triangle", 523, 0, 0.14, 0.12], ["triangle", 659, 0.13, 0.14, 0.12], ["triangle", 784, 0.26, 0.14, 0.12], ["triangle", 1047, 0.39, 0.45, 0.14]],
};

const Sound = {
  enabled: true,
  ctx: null,
  play(name) {
    if (!this.enabled || !SFX[name]) return;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      if (!this.ctx) this.ctx = new AC();
      if (this.ctx.state === "suspended") this.ctx.resume();
      const t0 = this.ctx.currentTime + 0.01;
      for (const [kind, a, b, c, d] of SFX[name]) {
        if (kind === "noise") this.noise(t0 + a, b, c, d);
        else this.tone(kind, a, t0 + b, c, d);
      }
    } catch {
      /* 音が出せない環境でも遊べる */
    }
  },
  tone(type, freq, start, dur, vol) {
    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(vol, start + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    osc.connect(gain).connect(ctx.destination);
    osc.start(start);
    osc.stop(start + dur + 0.02);
  },
  noise(start, dur, freq, vol) {
    const ctx = this.ctx;
    const buffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * dur), ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    const src = ctx.createBufferSource();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();
    src.buffer = buffer;
    filter.type = "bandpass";
    filter.frequency.value = freq;
    gain.gain.value = vol;
    src.connect(filter).connect(gain).connect(ctx.destination);
    src.start(start);
  },
};

/** 直前に出たカードだけを弾ませるための判定（再描画のたびに跳ねないように） */
function isFresh(stamp, ms = 450) {
  return Boolean(stamp) && Date.now() - stamp < ms;
}

/* ---------- ゲーム登録 ---------- */

const GAMES = [];

function registerGame(game) {
  GAMES.push(game);
}

/* ---------- 進行管理 ---------- */

class Aborted extends Error {}

const Speed = { factor: 1 };

/**
 * 1回のゲームの進行を受け持つ。
 * sleep / ask はゲームを途中でやめたときに Aborted で打ち切られるので、
 * ゲーム側は async 関数を上から素直に書けばよい。
 */
class Session {
  constructor({ game, players, options, ui }) {
    this.game = game;
    this.players = players;
    this.options = options;
    this.ui = ui;
    this.alive = true;
    this.timers = new Set();
    this.intervals = new Set();
    this.waiter = null;
    this.humans = players.filter((p) => p.human);
    // 人間が1人なら常にその人の手札を表示。2人以上なら自分の番の間だけ表示する。
    this.viewer = this.humans.length === 1 ? this.humans[0] : null;
    this.renderFn = null;
  }

  get multi() {
    return this.humans.length > 1;
  }

  /** 観戦モード（全員CPU）なら全員の手札を表向きにする */
  get watching() {
    return this.humans.length === 0;
  }

  sleep(ms) {
    return new Promise((resolve, reject) => {
      if (!this.alive) {
        reject(new Aborted());
        return;
      }
      const entry = { reject };
      entry.timer = setTimeout(() => {
        this.timers.delete(entry);
        resolve();
      }, ms * Speed.factor);
      this.timers.add(entry);
    });
  }

  interval(fn, ms) {
    const id = setInterval(() => {
      if (this.alive) fn();
    }, ms);
    this.intervals.add(id);
    return id;
  }

  clearIntervals() {
    for (const id of this.intervals) clearInterval(id);
    this.intervals.clear();
  }

  /** 人間の操作を待つ。answer() で解決される */
  ask() {
    return new Promise((resolve, reject) => {
      if (!this.alive) {
        reject(new Aborted());
        return;
      }
      this.waiter = { resolve, reject };
      this.ui.waiting(true);
    });
  }

  answer(value) {
    const waiter = this.waiter;
    if (!waiter) return;
    this.waiter = null;
    this.ui.waiting(false);
    waiter.resolve(value);
  }

  sfx(name) {
    if (this.alive && Speed.factor > 0.05) Sound.play(name);
  }

  /** 人間の番が来たことを音と振動で知らせる */
  yourTurn(player) {
    if (!player || !player.human) return;
    this.sfx("turn");
    if (navigator.vibrate && Speed.factor > 0.05) {
      try {
        navigator.vibrate(25);
      } catch {
        /* 未対応 */
      }
    }
  }

  abort() {
    this.alive = false;
    for (const entry of this.timers) {
      clearTimeout(entry.timer);
      entry.reject(new Aborted());
    }
    this.timers.clear();
    this.clearIntervals();
    if (this.waiter) {
      this.waiter.reject(new Aborted());
      this.waiter = null;
    }
    this.ui.waiting(false);
  }

  render() {
    if (this.alive && this.renderFn) this.renderFn();
  }

  say(text) {
    this.ui.message(text);
    this.ui.log(text);
  }

  note(text) {
    this.ui.message(text);
  }

  log(text) {
    this.ui.log(text);
  }

  /** ボタンを並べる。押されると answer(value) が呼ばれる */
  actions(list) {
    this.ui.actions(list, (value) => this.answer(value));
  }

  async choose(list, text) {
    if (text) this.note(text);
    this.actions(list);
    const value = await this.ask();
    this.actions([]);
    return value;
  }

  /** 人間が2人以上いるとき、端末を渡してもらう画面を挟む */
  async handoff(player) {
    if (!this.multi || this.viewer === player) return;
    this.viewer = null;
    this.render();
    this.actions([]);
    this.ui.showCover(player.name);
    this.sfx("turn");
    try {
      await this.ask();
    } finally {
      this.ui.hideCover();
    }
    this.viewer = player;
    this.render();
  }

  /** 人間が2人以上いるとき、手番が終わったら手札を隠す */
  conceal() {
    if (!this.multi) return;
    this.viewer = null;
    this.render();
  }

  /**
   * 手番の人の目線で文章を作る。
   * 表示中の人（viewer）なら「あなた」ではなく名前のまま出す（家族で回すので名前の方が分かりやすい）。
   */
  isViewer(player) {
    return this.viewer === player;
  }

  /** 席の一覧（上段）。自分（viewer）は除いて並べる */
  seats(opts = {}) {
    const list = opts.players || this.players.filter((p) => p !== this.viewer || opts.includeViewer);
    const wrap = h("div", { class: "seats" });
    for (const p of list) {
      const seat = h("div", {
        class: [
          "seat",
          opts.current === p ? "turn" : "",
          opts.out && opts.out(p) ? "out" : "",
          opts.onPick && (!opts.pickable || opts.pickable(p)) ? "pickable" : "",
        ].join(" "),
      });
      seat.append(h("div", { class: "seat-name" }, h("span", { class: "seat-icon", text: p.human ? "人" : "C" }), p.name));
      const info = opts.info ? opts.info(p) : null;
      if (info) seat.append(h("div", { class: "seat-info", html: info }));
      const faceUp = opts.faceUp ? opts.faceUp(p) : this.watching ? p.hand : null;
      if (faceUp && faceUp.length) {
        seat.append(h("div", { class: "seat-cards" }, faceUp.map((c) => cardEl(c, { size: "xs" }))));
      } else {
        const count = opts.count ? opts.count(p) : p.hand ? p.hand.length : null;
        if (count != null && count > 0) seat.append(miniFan(count));
      }
      if (opts.onPick && (!opts.pickable || opts.pickable(p))) {
        seat.setAttribute("role", "button");
        seat.tabIndex = 0;
        seat.addEventListener("click", () => opts.onPick(p));
      }
      wrap.append(seat);
    }
    return wrap;
  }

  /** 手札（下段） */
  hand(cards, opts = {}) {
    const row = h("div", { class: "hand" });
    for (const card of cards) {
      const playable = opts.playable ? opts.playable(card) : true;
      row.append(
        cardEl(card, {
          onClick: opts.onClick && playable ? opts.onClick : null,
          selected: opts.selected ? opts.selected.has(card) : undefined,
          hint: opts.hint ? opts.hint.has(card) : false,
          dim: opts.playable ? !playable : false,
          fresh: opts.fresh ? opts.fresh.has(card) : false,
        }),
      );
    }
    if (!cards.length) row.append(h("p", { class: "empty-hand", text: opts.emptyText || "手札はありません" }));
    return row;
  }

  /** 卓全体を上段・中央・下段で組み立てる */
  layout({ top, center, bottom, bottomTitle }) {
    const table = this.ui.table;
    table.replaceChildren();
    if (top) table.append(h("div", { class: "zone zone-top" }, top));
    table.append(h("div", { class: "zone zone-center" }, center || ""));
    if (bottom !== undefined) {
      const title = bottomTitle !== undefined ? bottomTitle : this.viewer ? `${this.viewer.name}の手札` : "";
      table.append(
        h(
          "div",
          { class: "zone zone-bottom" },
          title ? h("p", { class: "zone-title", text: title }) : null,
          bottom || h("p", { class: "empty-hand", text: this.multi ? "手札は自分の番のときだけ表示されます" : "" }),
        ),
      );
    }
  }
}

/** 順位表示用の文字列 */
function placeLabel(index) {
  return `${index + 1}位`;
}
