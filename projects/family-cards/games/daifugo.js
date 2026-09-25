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

  function isSpade3(cards) {
    return cards.length === 1 && !cards[0].joker && cards[0].suit === "S" && cards[0].rank === 3;
  }

  function canBeat(info, cards, field, rev) {
    if (!info) return false;
    if (!field) return true;
    const f = field.info;
    if (info.type !== f.type || info.count !== f.count) return false;
    if (f.allJoker && f.count === 1 && isSpade3(cards)) return true; // スペ3返し
    if (f.allJoker) return false;
    return power(info, rev) > power(f, rev);
  }

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
  function candidates(hand, field, rev, allowSeq) {
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
      if (info && canBeat(info, cards, field, rev)) out.push({ cards, info });
    };
    const need = field ? field.info : null;

    if (!need || need.type === "set") {
      for (const group of byRank.values()) {
        const counts = need ? [need.count] : [...new Set([1, group.length])];
        for (const k of counts) {
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

  /** CPUの判断。出すカード配列か "pass" を返す */
  function cpuChoose(hand, field, rev, allowSeq) {
    const list = candidates(hand, field, rev, allowSeq);
    if (!list.length) return "pass";
    const groupSize = (rank) => hand.filter((c) => !c.joker && c.rank === rank).length;
    const avg = hand.filter((c) => !c.joker).reduce((sum, c) => sum + str(c), 0) / Math.max(1, hand.length);
    let best = null;
    for (const cand of list) {
      const { cards, info } = cand;
      if (cards.length === hand.length) return cards; // これで上がれる
      const jokerUsed = cards.filter((c) => c.joker).length;
      let score = power(info, rev) + (info.allJoker ? 30 : 0);
      score += jokerUsed * (hand.length <= cards.length + 2 ? 2 : 25);
      if (info.type === "set" && info.rank && groupSize(info.rank) > cards.length - jokerUsed) score += 4; // 組を崩す
      if (!field) score -= cards.length * 2.5; // 親のときはたくさん出したい
      const makesRev = (info.type === "set" && info.count >= 4 && !info.allJoker) || (info.type === "seq" && info.count >= 5);
      if (makesRev) score += (rev ? avg > 9 : avg < 9) ? -12 : 30;
      score += Math.random() * 1.5;
      if (!best || score < best.score) best = { cards, info, score };
    }
    // 強いカードしか出せないときは、まだ手札が多ければ温存することがある
    if (field && hand.length > 4) {
      const strong = best.info.allJoker || (!rev && best.info.type === "set" && best.info.value >= 14);
      if (strong && Math.random() < 0.45) return "pass";
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
    options: [
      { key: "rounds", label: "回戦数", choices: [[1, "1回戦"], [3, "3回戦"], [5, "5回戦"]], default: 3 },
      { key: "jokers", label: "ジョーカー", choices: [[0, "なし"], [1, "1枚"], [2, "2枚"]], default: 2 },
      { key: "eight", label: "8切り", choices: [[true, "あり"], [false, "なし"]], default: true },
      { key: "seq", label: "階段（同じマークの連番）", choices: [[true, "あり"], [false, "なし"]], default: true },
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
      <p>2回戦目からは最初にカード交換があります。大貧民は一番強いカード2枚を大富豪へ、貧民は1枚を富豪へ渡し、受け取った側は好きなカードを同じ枚数返します。</p>
      <p>順位ごとにポイント（1位が最多）が入り、全回戦の合計で最終順位を決めます。</p>
    `,

    async play(s) {
      const P = s.players;
      const n = P.length;
      const opt = s.options;
      const titles = titlesFor(n);
      const allowSeq = opt.seq;
      for (const p of P) {
        p.total = 0;
        p.title = "";
      }

      let field = null;
      let rev = false;
      let finished = [];
      let passes = new Set();
      let turnPlayer = null;
      let sel = new Set();
      let hint = new Set();
      let selectingFor = null; // 人間が手札を選んでいる相手（出す or 交換）
      let exchangeNeed = 0;
      let flash = "";
      let prevOrder = null;

      const inGame = (p) => p.hand.length > 0 && !finished.includes(p);
      const nextActive = (from) => {
        for (let step = 1; step <= n; step += 1) {
          const p = P[(from.id + step) % n];
          if (inGame(p)) return p;
        }
        return null;
      };
      const sortHand = (p) => sortByRank(p.hand, str);

      function render() {
        const info = (p) => {
          const parts = [];
          if (p.title) parts.push(`<span class="badge">${p.title}</span>`);
          const place = finished.indexOf(p);
          if (place >= 0) parts.push(`<span class="badge gold">${place + 1}位あがり</span>`);
          else if (passes.has(p)) parts.push(`<span class="badge muted-badge">パス</span>`);
          parts.push(`<span class="pts">${p.total}pt</span>`);
          return parts.join(" ");
        };
        const center = h(
          "div",
          { class: "center-info" },
          h(
            "div",
            { class: "field-head" },
            rev ? h("span", { class: "badge red", text: "革命中" }) : null,
            h("span", { class: "center-label", text: field ? `場: ${describe(field.info)}（${field.by.name}）` : flash || "場は空です" }),
          ),
          h("div", { class: "pile-row" }, field ? field.cards.map((c) => cardEl(c, { size: "lg" })) : null),
        );
        const me = s.viewer;
        let bottom = null;
        if (me) {
          const selecting = selectingFor === me;
          bottom = s.hand(sortHand(me), {
            selected: sel,
            hint,
            onClick: selecting
              ? (card) => {
                  if (sel.has(card)) sel.delete(card);
                  else sel.add(card);
                  hint = new Set();
                  render();
                  refreshButtons();
                }
              : null,
          });
        }
        s.layout({
          top: s.seats({ current: turnPlayer, info, out: (p) => finished.includes(p) }),
          center,
          bottom,
          bottomTitle: me ? `${me.name}の手札${me.title ? `（${me.title}）` : ""}` : undefined,
        });
      }
      s.renderFn = render;

      let refreshButtons = () => {};

      async function humanPlay(p) {
        await s.handoff(p);
        sel = new Set();
        hint = new Set();
        selectingFor = p;
        refreshButtons = () => {
          const cards = [...sel];
          const info = analyze(cards, allowSeq);
          const ok = canBeat(info, cards, field, rev);
          s.actions([
            { label: sel.size ? `出す（${sel.size}枚）` : "出す", value: "play", primary: true, disabled: !ok },
            { label: "パス", value: "pass", disabled: !field },
            { label: "ヒント", value: "hint" },
          ]);
        };
        s.note(field ? `${describe(field.info)} より強いカードを選んでください` : "好きなカードを出せます（親）");
        render();
        try {
          for (;;) {
            refreshButtons();
            const v = await s.ask();
            if (v === "play") return [...sel];
            if (v === "pass") return "pass";
            const choice = cpuChoose(p.hand, field, rev, allowSeq);
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
          render();
          await s.sleep(900);
        }
      }

      for (let round = 1; round <= opt.rounds; round += 1) {
        for (const p of P) p.hand = [];
        const deck = shuffle(makeDeck({ jokers: opt.jokers }));
        const offset = Math.floor(Math.random() * n);
        deck.forEach((card, i) => P[(i + offset) % n].hand.push(card));
        field = null;
        rev = false;
        finished = [];
        passes = new Set();
        turnPlayer = null;
        flash = "";
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
            move = cpuChoose(p.hand, field, rev, allowSeq);
          }

          let cut = false;
          if (move === "pass") {
            passes.add(p);
            s.say(`${p.name}: パス`);
          } else {
            const info = analyze(move, allowSeq);
            const spade3 = field && field.info.allJoker && isSpade3(move);
            takeOut(p.hand, move);
            field = { cards: move, info, by: p };
            lastPlayer = p;
            passes = new Set();
            flash = "";
            s.say(`${p.name}: ${cardNames(move)}（${describe(info)}）`);
            const makesRev = (info.type === "set" && info.count >= 4 && !info.allJoker) || (info.type === "seq" && info.count >= 5);
            if (makesRev) {
              rev = !rev;
              s.say(rev ? "革命！ 強さが逆転しました" : "革命返し！ 強さが元に戻りました");
            }
            if (spade3) {
              s.say("スペ3返し！ 場が流れます");
              cut = true;
            } else if (opt.eight && ((info.type === "set" && info.rank === 8) || (info.type === "seq" && info.hasEight))) {
              s.say("8切り！ 場が流れます");
              cut = true;
            }
            if (p.hand.length === 0) {
              finished.push(p);
              s.say(`${p.name} あがり！（${finished.length}位）`);
            }
          }
          render();
          await s.sleep(p.human ? 400 : 650);
          if (p.human) s.conceal();

          if (P.filter(inGame).length <= 1) break;

          if (cut) {
            field = null;
            passes = new Set();
            flash = "場が流れました";
            turn = inGame(p) ? p : nextActive(p);
            await s.sleep(500);
            continue;
          }
          const others = P.filter((q) => inGame(q) && q !== lastPlayer);
          if (lastPlayer && others.every((q) => passes.has(q))) {
            field = null;
            passes = new Set();
            flash = "場が流れました";
            s.log("場が流れました");
            turn = inGame(lastPlayer) ? lastPlayer : nextActive(lastPlayer);
            lastPlayer = null;
            render();
            await s.sleep(600);
            continue;
          }
          turn = nextActive(p);
        }

        const last = P.find(inGame) || P.find((p) => !finished.includes(p));
        finished.push(last);
        const order = [...finished];
        order.forEach((p, i) => {
          p.title = titles[i];
          p.total += n - 1 - i;
        });
        turnPlayer = null;
        field = null;
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
