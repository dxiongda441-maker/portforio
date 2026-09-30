"use strict";

/* 大富豪（大貧民） */
(() => {
  // 強さ: 3 < 4 < … < K < A < 2 < ジョーカー
  const str = (card) => (card.joker ? 16 : card.rank === 1 ? 14 : card.rank === 2 ? 15 : card.rank);
  const strLabel = (v) => ({ 11: "J", 12: "Q", 13: "K", 14: "A", 15: "2", 16: "JOKER" })[v] || String(v);

  /** 出そうとしているカードの組み合わせを判定する。出せない形なら null */
  function analyze(cards, allowSeq) {
    const n = cards.length;
    if (!n) return null;
    const nat = cards.filter((c) => !c.joker);
    if (!nat.length) return { type: "set", count: n, value: 16, allJoker: true };
    if (nat.every((c) => c.rank === nat[0].rank)) {
      return { type: "set", count: n, value: str(nat[0]), rank: nat[0].rank };
    }
    if (!allowSeq || n < 3) return null;
    if (!nat.every((c) => c.suit === nat[0].suit)) return null;
    const vals = nat.map(str).sort((a, b) => a - b);
    if (new Set(vals).size !== vals.length) return null;
    const lo = vals[0];
    const hi = vals[vals.length - 1];
    const minStart = Math.max(3, hi - n + 1);
    const maxStart = Math.min(lo, 15 - n + 1);
    if (minStart > maxStart) return null;
    return { type: "seq", count: n, minStart, maxStart, suit: nat[0].suit, hasEight: nat.some((c) => c.rank === 8) };
  }

  /** 大きいほど強い値（革命中は逆転。ジョーカーだけの組は常に最強） */
  function power(info, rev) {
    if (info.allJoker) return 100;
    if (info.type === "set") return rev ? -info.value : info.value;
    return rev ? -info.minStart : info.maxStart;
  }

  /** 革命と11バックを合わせた「いま逆転しているか」 */
  const flipped = (st) => st.rev !== st.back;

  function isSpade3(cards) {
    return cards.length === 1 && !cards[0].joker && cards[0].suit === "S" && cards[0].rank === 3;
  }

  /** マーク並び（ジョーカー以外）。縛りの判定に使う */
  const suitSig = (cards) =>
    cards
      .filter((c) => !c.joker)
      .map((c) => c.suit)
      .sort()
      .join("");

  /** 縛られたマークに合っているか（ジョーカーはどのマークにもなれる） */
  function fitsLock(cards, lock) {
    const rest = lock.split("");
    for (const c of cards) {
      if (c.joker) continue;
      const i = rest.indexOf(c.suit);
      if (i < 0) return false;
      rest.splice(i, 1);
    }
    return true;
  }

  /**
   * st: { field, rev, back, lock }
   *   field … 場の { cards, info, by } / null
   *   rev   … 革命中か
   *   back  … 11バック中か（場が流れると戻る）
   *   lock  … 縛られたマーク並び（例 "H", "DS"）/ ""
   */
  function canBeat(info, cards, st) {
    if (!info) return false;
    const field = st.field;
    if (!field) return true;
    const f = field.info;
    if (info.type !== f.type || info.count !== f.count) return false;
    if (f.allJoker && f.count === 1 && isSpade3(cards)) return true; // スペ3返し
    if (f.allJoker) return false;
    if (st.lock && !fitsLock(cards, st.lock)) return false;
    return power(info, flipped(st)) > power(f, flipped(st));
  }

  const makesRevolution = (info) => (info.type === "set" && info.count >= 4 && !info.allJoker) || (info.type === "seq" && info.count >= 5);
  const hasRank = (info, cards, rank) => (info.type === "set" ? info.rank === rank : cards.some((c) => !c.joker && c.rank === rank));

  function describe(info) {
    if (info.allJoker) return info.count === 1 ? "ジョーカー" : `ジョーカー×${info.count}`;
    if (info.type === "seq") return `${SUIT_MARK[info.suit]}の階段（${info.count}枚）`;
    const names = { 1: "", 2: "ペア", 3: "3枚", 4: "4枚", 5: "5枚" };
    return `${strLabel(info.value)}${names[info.count] ? ` の${names[info.count]}` : ""}`;
  }

  function titlesFor(n) {
    if (n === 2) return ["大富豪", "大貧民"];
    if (n === 3) return ["大富豪", "平民", "大貧民"];
    const list = ["大富豪", "富豪"];
    while (list.length < n - 2) list.push("平民");
    return [...list, "貧民", "大貧民"];
  }

  /** 出せる候補をすべて挙げる */
  function candidates(hand, st, allowSeq) {
    const jokers = hand.filter((c) => c.joker);
    const nat = hand.filter((c) => !c.joker);
    const byRank = new Map();
    for (const c of nat) {
      if (!byRank.has(c.rank)) byRank.set(c.rank, []);
      byRank.get(c.rank).push(c);
    }
    const out = [];
    const push = (cards) => {
      const info = analyze(cards, allowSeq);
      if (info && canBeat(info, cards, st)) out.push({ cards, info });
    };
    const need = st.field ? st.field.info : null;

    if (!need || need.type === "set") {
      for (const group of byRank.values()) {
        // 親のときは 1枚・その数字全部・（ジョーカーを足して4枚＝革命）を候補にする
        const counts = need ? [need.count] : [...new Set([1, group.length, ...(group.length === 3 && jokers.length ? [4] : [])])];
        for (const k of counts) {
          if (st.lock) {
            // 縛り中は、縛られたマークの組み合わせを優先して選ぶ
            const fit = [];
            const rest = st.lock.split("");
            for (const c of group) {
              const i = rest.indexOf(c.suit);
              if (i >= 0 && fit.length < k) {
                fit.push(c);
                rest.splice(i, 1);
              }
            }
            const jk = k - fit.length;
            if (jk <= jokers.length && k >= 1) push([...fit, ...jokers.slice(0, jk)]);
            continue;
          }
          const use = group.slice(0, Math.min(k, group.length));
          const jk = k - use.length;
          if (jk > jokers.length || k < 1) continue;
          push([...use, ...jokers.slice(0, jk)]);
        }
      }
      for (let k = 1; k <= jokers.length; k += 1) {
        if (!need || need.count === k) push(jokers.slice(0, k));
      }
    }
    if (allowSeq && (!need || need.type === "seq")) {
      const lengths = need ? [need.count] : [3, 4, 5];
      for (const suit of SUITS) {
        const bySuit = new Map(nat.filter((c) => c.suit === suit).map((c) => [str(c), c]));
        for (const len of lengths) {
          for (let start = 3; start + len - 1 <= 15; start += 1) {
            const cards = [];
            let missing = 0;
            for (let v = start; v < start + len; v += 1) {
              if (bySuit.has(v)) cards.push(bySuit.get(v));
              else missing += 1;
            }
            if (missing > jokers.length || missing === len) continue;
            push([...cards, ...jokers.slice(0, missing)]);
          }
        }
      }
    }
    return out;
  }

  /**
   * まだ見えていないカード（unseen）の中に、この組に勝てる組が残っていないか。
   * 「つよい」CPUが、主導権を確実に取れる札かどうかを判断するのに使う。
   */
  function unbeatable(cand, st, unseen) {
    const { info } = cand;
    if (info.type !== "set") return false;
    const jokers = unseen.filter((c) => c.joker).length;
    if (info.allJoker) return !(info.count === 1 && unseen.some((c) => c.suit === "S" && c.rank === 3));
    if (jokers >= info.count) return false;
    const eff = flipped({ ...st, rev: st.rev !== makesRevolution(info) });
    const counts = new Map();
    for (const c of unseen) if (!c.joker) counts.set(str(c), (counts.get(str(c)) || 0) + 1);
    for (const [v, cnt] of counts) {
      const stronger = eff ? v < info.value : v > info.value;
      if (stronger && cnt + jokers >= info.count) return false;
    }
    return true;
  }

  /**
   * CPUの判断。出すカード配列か "pass" を返す
   * ctx: { level: "easy"|"normal"|"hard", unseen: まだ見えていないカード, minOpp: 相手の最少手札枚数 }
   */
  function cpuChoose(hand, st, allowSeq, ctx = {}) {
    const level = ctx.level || "normal";
    const list = candidates(hand, st, allowSeq);
    if (!list.length) return "pass";
    const finishing = list.find((c) => c.cards.length === hand.length);
    if (finishing) return finishing.cards; // これで上がれる

    if (level === "easy") {
      if (st.field && Math.random() < 0.35) return "pass";
      if (Math.random() < 0.5) return pickRandom(list).cards;
    }

    const eff = flipped(st);
    const groupSize = (rank) => hand.filter((c) => !c.joker && c.rank === rank).length;
    const nat = hand.filter((c) => !c.joker);
    const minOpp = ctx.minOpp ?? 99;

    if (level === "hard" && ctx.unseen) {
      const groups = new Set(nat.map((c) => c.rank)).size;
      // 残りが少ないときは「確実に勝てる組」で主導権を取ってから出し切る
      if (!st.field && groups <= 2) {
        const sure = list.filter((c) => unbeatable(c, st, ctx.unseen));
        if (sure.length) return sure.sort((a, b) => power(a.info, eff) - power(b.info, eff))[0].cards;
      }
      // 相手があと少しで上がりそうなら、確実に勝てる組の中で一番安いもので止めにいく
      if (st.field && minOpp <= 2) {
        const sure = list.filter((c) => unbeatable(c, st, ctx.unseen));
        if (sure.length) return sure.sort((a, b) => power(a.info, eff) - power(b.info, eff))[0].cards;
      }
    }

    let best = null;
    for (const cand of list) {
      const { cards, info } = cand;
      const jokerUsed = cards.filter((c) => c.joker).length;
      let score = power(info, eff) + (info.allJoker ? 30 : 0);
      score += jokerUsed * (hand.length <= cards.length + 2 ? 2 : 25);
      if (info.type === "set" && info.rank && groupSize(info.rank) > cards.length - jokerUsed) score += 4; // 組を崩す
      if (!st.field) score -= cards.length * 2.5; // 親のときはたくさん出したい
      if (makesRevolution(info)) {
        // 革命後に得をするか: 残る手札に弱い札（7以下）と強い札（Q以上）のどちらが多いか
        const rest = nat.filter((c) => !cards.includes(c));
        const weak = rest.filter((c) => str(c) <= 7).length;
        const strong = rest.filter((c) => str(c) >= 12).length;
        score += (st.rev ? strong >= weak : weak >= strong) ? -14 : 30;
      }
      if (level === "hard" && st.field && hasRank(info, cards, 8) && ctx.eight && hand.length <= 6) score -= 8; // 8切りで親を取る
      score += Math.random() * 1.5;
      if (!best || score < best.score) best = { cards, info, score };
    }
    // 強いカードしか出せないときは、まだ手札が多ければ温存することがある
    if (st.field && hand.length > 4 && !(level === "hard" && minOpp <= 3)) {
      const v = best.info.value;
      const strong = best.info.allJoker || (best.info.type === "set" && (eff ? v <= 4 : v >= 14));
      const keep = level === "hard" ? (hand.length > 6 ? 0.85 : 0.6) : 0.45;
      if (strong && Math.random() < keep) return "pass";
    }
    return best.cards;
  }

  registerGame({
    id: "daifugo",
    title: "大富豪",
    mark: "👑",
    tone: "gold",
    tagline: "強いカードで場を制し、いち早く手札をなくす",
    players: [3, 6],
    defaultPlayers: 4,
    levels: true,
    logic: { analyze, canBeat, candidates, cpuChoose, unbeatable, fitsLock },
    options: [
      { key: "rounds", label: "回戦数", choices: [[1, "1回戦"], [3, "3回戦"], [5, "5回戦"]], default: 3 },
      { key: "jokers", label: "ジョーカー", choices: [[0, "なし"], [1, "1枚"], [2, "2枚"]], default: 2 },
      { key: "eight", label: "8切り", choices: [[true, "あり"], [false, "なし"]], default: true },
      { key: "seq", label: "階段（同じマークの連番）", choices: [[true, "あり"], [false, "なし"]], default: true },
      { key: "shibari", label: "縛り（同じマークが続くと固定）", choices: [[true, "あり"], [false, "なし"]], default: false },
      { key: "jback", label: "11バック（Jで一時的に逆転）", choices: [[true, "あり"], [false, "なし"]], default: false },
      { key: "miyako", label: "都落ち（4人以上）", choices: [[true, "あり"], [false, "なし"]], default: false },
    ],
    rules: `
      <p>カードの強さは <b>3 &lt; 4 &lt; … &lt; K &lt; A &lt; 2 &lt; ジョーカー</b>。手札を早くなくした順に順位が決まります。</p>
      <ol>
        <li>最初の回は ♦3 を持っている人から始めます。</li>
        <li>場と<b>同じ枚数・同じ形</b>で、より強いカードを出します。出せない・出したくないときはパス。</li>
        <li>全員がパスして一周したら場が流れ、最後に出した人が好きなカードから出せます。</li>
        <li><b>ペア・3枚・4枚</b>: 同じ数字をまとめて出せます。</li>
        <li><b>階段</b>: 同じマークで3枚以上の連番（例 ♠5-6-7）。</li>
        <li><b>ジョーカー</b>: 1枚出しでは最強。組に混ぜると好きなカードの代わりになります。</li>
        <li><b>スペ3返し</b>: ジョーカー1枚には ♠3 だけが勝てます。</li>
        <li><b>8切り</b>: 8を含むカードを出すと場が流れ、もう一度出せます。</li>
        <li><b>革命</b>: 同じ数字を4枚以上（または5枚以上の階段）出すと、強さが逆転します。</li>
      </ol>
      <p><b>追加ルール（設定でオン）</b></p>
      <ul>
        <li><b>縛り</b>: 同じマークの組み合わせが2回続けて出ると、場が流れるまでそのマークしか出せません（ジョーカーは代わりに使えます）。</li>
        <li><b>11バック</b>: J を含むカードを出すと、場が流れるまで強さが逆転します。</li>
        <li><b>都落ち</b>: 2回戦目以降、前回の大富豪より先にだれかが上がると、大富豪はその場で大貧民に転落します。</li>
      </ul>
      <p>2回戦目からは最初にカード交換があります。大貧民は一番強いカード2枚を大富豪へ、貧民は1枚を富豪へ渡し、受け取った側は好きなカードを同じ枚数返します。</p>
      <p>順位ごとにポイント（1位が最多）が入り、全回戦の合計で最終順位を決めます。</p>
      <p>困ったら「ヒント」でおすすめの出し方が選ばれます。</p>
    `,

    async play(s) {
      const P = s.players;
      const n = P.length;
      const opt = s.options;
      const level = opt.level || "normal";
      const titles = titlesFor(n);
      const allowSeq = opt.seq;
      for (const p of P) {
        p.total = 0;
        p.title = "";
      }

      const st = { field: null, rev: false, back: false, lock: "" };
      let finished = [];
      let fallen = null;
      let passes = new Set();
      let turnPlayer = null;
      let sel = new Set();
      let hint = new Set();
      let selectingFor = null; // 人間が手札を選んでいる相手（出す or 交換）
      let flash = "";
      let prevOrder = null;
      let roundCards = [];
      let played = new Set();

      const inGame = (p) => p.hand.length > 0 && !finished.includes(p) && p !== fallen;
      const nextActive = (from) => {
        for (let step = 1; step <= n; step += 1) {
          const p = P[(from.id + step) % n];
          if (inGame(p)) return p;
        }
        return null;
      };
      const sortHand = (p) => sortByRank(p.hand, str);
      const cpuCtx = (p) => ({
        level,
        eight: opt.eight,
        unseen: roundCards.filter((c) => !played.has(c) && !p.hand.includes(c)),
        minOpp: Math.min(...P.filter((q) => q !== p && inGame(q)).map((q) => q.hand.length)),
      });
      const clearField = (text) => {
        st.field = null;
        st.back = false;
        st.lock = "";
        passes = new Set();
        flash = text;
      };

      function render() {
        const info = (p) => {
          const parts = [];
          if (p.title) parts.push(`<span class="badge">${p.title}</span>`);
          const place = finished.indexOf(p);
          if (place >= 0) parts.push(`<span class="badge gold">${place + 1}位あがり</span>`);
          else if (p === fallen) parts.push(`<span class="badge red">都落ち</span>`);
          else if (passes.has(p)) parts.push(`<span class="badge muted-badge">パス</span>`);
          parts.push(`<span class="pts">${p.total}pt</span>`);
          return parts.join(" ");
        };
        const field = st.field;
        const center = h(
          "div",
          { class: "center-info" },
          h(
            "div",
            { class: "field-head" },
            st.rev ? h("span", { class: "badge red", text: "革命中" }) : null,
            st.back ? h("span", { class: "badge red", text: "11バック" }) : null,
            st.lock ? h("span", { class: "badge gold", text: `縛り ${[...new Set(st.lock)].map((x) => SUIT_MARK[x]).join("")}` }) : null,
          ),
          h("p", { class: "center-label", text: field ? `場: ${describe(field.info)}（${field.by.name}）` : flash || "場は空です" }),
          h("div", { class: "pile-row" }, field ? field.cards.map((c) => cardEl(c, { size: "lg", pop: isFresh(field.at) })) : h("div", { class: "card ghost lg" })),
        );
        const me = s.viewer;
        let bottom = null;
        if (me) {
          const selecting = selectingFor === me;
          bottom = s.hand(sortHand(me), {
            selected: selecting ? sel : null,
            hint,
            onClick: selecting
              ? (card) => {
                  if (sel.has(card)) sel.delete(card);
                  else sel.add(card);
                  hint = new Set();
                  s.sfx("draw");
                  render();
                  refreshButtons();
                }
              : null,
          });
        }
        s.layout({
          top: s.seats({ current: turnPlayer, info, out: (p) => finished.includes(p) || p === fallen }),
          center,
          bottom,
          bottomTitle: me ? `${me.name}の手札${me.title ? `（${me.title}）` : ""}` : undefined,
        });
      }
      s.renderFn = render;

      let refreshButtons = () => {};

      async function humanPlay(p) {
        await s.handoff(p);
        s.yourTurn(p);
        sel = new Set();
        hint = new Set();
        selectingFor = p;
        refreshButtons = () => {
          const cards = [...sel];
          const info = analyze(cards, allowSeq);
          const ok = canBeat(info, cards, st);
          s.actions([
            { label: sel.size ? `出す（${sel.size}枚）` : "出す", value: "play", primary: true, disabled: !ok },
            { label: "パス", value: "pass", disabled: !st.field },
            { label: "ヒント", value: "hint" },
          ]);
        };
        const lockText = st.lock ? `（縛り: ${[...new Set(st.lock)].map((x) => SUIT_MARK[x]).join("")}）` : "";
        s.note(st.field ? `${describe(st.field.info)} より強いカードを選んでください${lockText}` : "好きなカードを出せます（親）");
        render();
        try {
          for (;;) {
            refreshButtons();
            const v = await s.ask();
            if (v === "play") return [...sel];
            if (v === "pass") return "pass";
            const choice = cpuChoose(p.hand, st, allowSeq, { ...cpuCtx(p), level: "hard" });
            if (choice === "pass") {
              s.note("出せる組み合わせがありません。パスしましょう");
              sel = new Set();
              hint = new Set();
            } else {
              sel = new Set(choice);
              hint = new Set(choice);
              s.note(`おすすめ: ${cardNames(choice)}`);
            }
            render();
          }
        } finally {
          selectingFor = null;
          s.actions([]);
        }
      }

      async function humanGive(p, count, partner) {
        await s.handoff(p);
        s.yourTurn(p);
        sel = new Set();
        hint = new Set();
        selectingFor = p;
        refreshButtons = () => {
          s.actions([{ label: `${partner.name}に渡す（${sel.size}/${count}枚）`, value: "give", primary: true, disabled: sel.size !== count }]);
        };
        s.note(`${partner.name}に渡すカードを${count}枚選んでください`);
        render();
        try {
          for (;;) {
            refreshButtons();
            await s.ask();
            if (sel.size === count) return [...sel];
          }
        } finally {
          selectingFor = null;
          s.actions([]);
        }
      }

      async function exchange(order) {
        const pairs = [[order[0], order[n - 1], 2]];
        if (n >= 4) pairs.push([order[1], order[n - 2], 1]);
        for (const [rich, poor, count] of pairs) {
          const strongest = sortByRank(poor.hand, str).slice(-count);
          takeOut(poor.hand, strongest);
          rich.hand.push(...strongest);
          const seen = s.isViewer(rich) || s.isViewer(poor) || s.watching;
          s.say(`${poor.name}（${poor.title}）→ ${rich.name}（${rich.title}）へ${count}枚: ${seen ? cardNames(strongest) : "？"}`);
          s.sfx("draw");
          render();
          await s.sleep(900);
          let back;
          if (rich.human) {
            back = await humanGive(rich, count, poor);
            s.conceal();
          } else {
            back = sortByRank(rich.hand.filter((c) => !c.joker), str).slice(0, count);
          }
          takeOut(rich.hand, back);
          poor.hand.push(...back);
          const seenBack = s.isViewer(rich) || s.isViewer(poor) || s.watching;
          s.say(`${rich.name} → ${poor.name}へ${count}枚返した: ${seenBack ? cardNames(back) : "？"}`);
          s.sfx("draw");
          render();
          await s.sleep(900);
        }
      }

      for (let round = 1; round <= opt.rounds; round += 1) {
        for (const p of P) p.hand = [];
        const deck = shuffle(makeDeck({ jokers: opt.jokers }));
        roundCards = [...deck];
        played = new Set();
        const offset = Math.floor(Math.random() * n);
        deck.forEach((card, i) => P[(i + offset) % n].hand.push(card));
        st.rev = false;
        clearField("");
        finished = [];
        fallen = null;
        turnPlayer = null;
        s.say(`――― ${round}回戦 ―――`);
        render();
        await s.sleep(700);

        if (prevOrder) await exchange(prevOrder);

        let turn;
        if (prevOrder) {
          turn = prevOrder[n - 1];
          s.say(`前回の大貧民 ${turn.name} から始めます`);
        } else {
          turn = P.find((p) => p.hand.some((c) => c.suit === "D" && c.rank === 3)) || P[0];
          s.say(`♦3を持っている ${turn.name} から始めます`);
        }
        let lastPlayer = null;
        await s.sleep(600);

        while (P.filter(inGame).length > 1) {
          const p = turn;
          turnPlayer = p;
          render();
          let move;
          if (p.human) {
            move = await humanPlay(p);
          } else {
            s.note(`${p.name}が考えています…`);
            await s.sleep(750);
            move = cpuChoose(p.hand, st, allowSeq, cpuCtx(p));
          }

          let cut = false;
          if (move === "pass") {
            passes.add(p);
            s.say(`${p.name}: パス`);
          } else {
            const info = analyze(move, allowSeq);
            const prev = st.field;
            const spade3 = prev && prev.info.allJoker && isSpade3(move);
            takeOut(p.hand, move);
            for (const c of move) played.add(c);
            st.field = { cards: move, info, by: p, at: Date.now() };
            lastPlayer = p;
            passes = new Set();
            flash = "";
            s.say(`${p.name}: ${cardNames(move)}（${describe(info)}）`);
            s.sfx("card");
            if (makesRevolution(info)) {
              st.rev = !st.rev;
              s.say(st.rev ? "革命！ 強さが逆転しました" : "革命返し！ 強さが元に戻りました");
              s.sfx("special");
            }
            if (opt.shibari && prev && !st.lock) {
              const sig = suitSig(move);
              if (sig && sig === suitSig(prev.cards) && !move.some((c) => c.joker) && !prev.cards.some((c) => c.joker)) {
                st.lock = sig;
                s.say(`縛り！ 場が流れるまで ${[...new Set(sig)].map((x) => SUIT_MARK[x]).join("")} しか出せません`);
                s.sfx("special");
              }
            }
            if (opt.jback && !st.back && hasRank(info, move, 11)) {
              st.back = true;
              s.say("11バック！ 場が流れるまで強さが逆転します");
              s.sfx("special");
            }
            if (spade3) {
              s.say("スペ3返し！ 場が流れます");
              s.sfx("special");
              cut = true;
            } else if (opt.eight && hasRank(info, move, 8)) {
              s.say("8切り！ 場が流れます");
              s.sfx("special");
              cut = true;
            }
            if (p.hand.length === 0) {
              finished.push(p);
              s.say(`${p.name} あがり！（${finished.length}位）`);
              s.sfx("good");
              const king = prevOrder && prevOrder[0];
              if (opt.miyako && n >= 4 && finished.length === 1 && king && king !== p && inGame(king)) {
                fallen = king;
                king.hand = [];
                s.say(`都落ち！ 前回の大富豪 ${king.name} は大貧民に転落`);
                s.sfx("bad");
              }
            }
          }
          render();
          await s.sleep(p.human ? 400 : 650);
          if (p.human) s.conceal();

          if (P.filter(inGame).length <= 1) break;

          if (cut) {
            clearField("場が流れました");
            turn = inGame(p) ? p : nextActive(p);
            render();
            await s.sleep(500);
            continue;
          }
          const others = P.filter((q) => inGame(q) && q !== lastPlayer);
          if (lastPlayer && others.every((q) => passes.has(q))) {
            clearField("場が流れました");
            s.log("場が流れました");
            turn = inGame(lastPlayer) ? lastPlayer : nextActive(lastPlayer);
            lastPlayer = null;
            render();
            await s.sleep(600);
            continue;
          }
          turn = nextActive(p);
        }

        const last = P.find(inGame) || P.find((p) => !finished.includes(p) && p !== fallen);
        const order = [...finished, last, fallen].filter(Boolean);
        order.forEach((p, i) => {
          p.title = titles[i];
          p.total += n - 1 - i;
        });
        turnPlayer = null;
        st.field = null;
        render();
        s.say(`${round}回戦の結果: ${order.map((p, i) => `${i + 1}位 ${p.name}（${titles[i]}）`).join(" / ")}`);
        prevOrder = order;
        if (round < opt.rounds) {
          if (s.humans.length) {
            await s.choose([{ label: "次の回戦へ", value: "next", primary: true }], `${round}回戦終了。${order[0].name}が大富豪です`);
          } else {
            await s.sleep(1500);
          }
        } else {
          await s.sleep(1200);
        }
      }

      const lastRank = new Map(prevOrder.map((p, i) => [p, i]));
      return [...P]
        .sort((a, b) => b.total - a.total || lastRank.get(a) - lastRank.get(b))
        .map((p) => ({ player: p, note: `${p.total}pt（最終回: ${p.title}）` }));
    },
  });
})();
