"use strict";

/* 七並べ */
registerGame({
  id: "shichinarabe",
  title: "七並べ",
  mark: "7",
  tone: "green",
  tagline: "7から順番に並べる。パスは3回まで",
  players: [2, 6],
  defaultPlayers: 4,
  levels: true,
  options: [
    { key: "passes", label: "パスできる回数", choices: [[1, "1回"], [3, "3回"], [5, "5回"], [99, "無制限"]], default: 3 },
    {
      key: "tunnel",
      group: "local",
      label: "トンネル（A と K がつながる）",
      help: "A まで並んだら K から、K まで並んだら A から続けて出せる。",
      choices: [[true, "あり"], [false, "なし"]],
      default: false,
    },
  ],
  rules: `
    <ol>
      <li>カードを全員に配り、7のカードはすべて最初に場に並べます。</li>
      <li>♦7を持っていた人から順番に、場のカードの<b>となりの数字</b>（同じマーク）を1枚ずつ出します。7から外側へ、6→5→…→A、8→9→…→K と伸びていきます。</li>
      <li>出せるカードがないとき、または出したくないときはパス。パスは決められた回数までです。</li>
      <li>パスの回数を超えると<b>ドボン（脱落）</b>。持っていたカードはすべて場に置かれます。</li>
      <li>手札を早くなくした人から順位が決まります。脱落した人は最下位グループです。</li>
    </ol>
    <p><b>トンネル（設定でオン）</b>: A まで並んだら、そのマークの K の側から続けて出せます（K まで並んだら A から）。</p>
    <p>作戦: 自分がたくさん持っているマークの方向は早めに開けて、ほかの人が持っていそうな所は止めておくと有利です。</p>
  `,

  async play(s) {
    const P = s.players;
    const limit = s.options.passes;
    const placed = { S: new Set([7]), H: new Set([7]), D: new Set([7]), C: new Set([7]) };
    const deck = shuffle(makeDeck());
    const offset = Math.floor(Math.random() * P.length);
    deck.forEach((card, i) => P[(i + offset) % P.length].hand.push(card));
    const firstPlayer = P.find((p) => p.hand.some((c) => c.suit === "D" && c.rank === 7)) || P[0];
    for (const p of P) {
      p.passes = 0;
      p.hand = p.hand.filter((c) => c.rank !== 7);
    }

    const finished = [];
    const busted = [];
    let turnPlayer = null;
    let lastCard = null;
    let lastAt = 0;

    const inGame = (p) => !finished.includes(p) && !busted.includes(p);
    const tunnel = Boolean(s.options.tunnel);
    const wrap = (r) => (!tunnel ? r : r === 0 ? 13 : r === 14 ? 1 : r);
    /** 7からつながっている数字（トンネルありなら A と K もつながる） */
    const connected = (suit) => {
      const seen = new Set([7]);
      const stack = [7];
      while (stack.length) {
        const r = stack.pop();
        for (const nb of [wrap(r - 1), wrap(r + 1)]) {
          if (nb >= 1 && nb <= 13 && placed[suit].has(nb) && !seen.has(nb)) {
            seen.add(nb);
            stack.push(nb);
          }
        }
      }
      return seen;
    };
    const playable = (card) => {
      if (placed[card.suit].has(card.rank)) return false;
      const conn = connected(card.suit);
      return conn.has(wrap(card.rank - 1)) || conn.has(wrap(card.rank + 1));
    };
    const sortHand = (p) => [...p.hand].sort((a, b) => SUITS.indexOf(a.suit) - SUITS.indexOf(b.suit) || a.rank - b.rank);

    function cpuPick(p) {
      const options = p.hand.filter(playable);
      if (!options.length) return null;
      const level = s.options.level || "normal";
      if (level === "easy") return pickRandom(options);
      let best = null;
      for (const card of options) {
        const down = card.rank < 7;
        const beyond = (c) => c.suit === card.suit && (down ? c.rank < card.rank : c.rank > card.rank);
        const mine = p.hand.filter(beyond).length;
        // 自分が先のカードを持っているほど、その方向を開けたい
        let score = mine * 2 + (mine ? 1 : 0) - (down ? card.rank : 14 - card.rank) * 0.15 + Math.random();
        if (level === "hard") {
          // その先を持っているのが他の人だけなら、開けると相手が得をする
          const others = (down ? card.rank - 1 : 13 - card.rank) - mine;
          score -= others * 0.35;
        }
        if (!best || score > best.score) best = { card, score };
      }
      const spare = limit < 99 ? limit - p.passes : 0;
      if (level === "hard") {
        // パスに余裕があり、どれを出しても相手を助けるだけなら止める
        if (best.score < 0.5 && spare >= 2 && p.hand.length > 3 && Math.random() < 0.5) return null;
      } else if (best.score < 1 && p.passes === 0 && p.hand.length > 4 && spare > 0 && Math.random() < 0.15) {
        return null; // たまにわざとパスして止める
      }
      return best.card;
    }

    function render() {
      const board = h("div", { class: "board7" });
      for (const suit of SUITS) {
        const row = h("div", { class: "board7-row" }, h("span", { class: `b7-suit ${suit === "H" || suit === "D" ? "red" : ""}`, text: SUIT_MARK[suit] }));
        for (let rank = 1; rank <= 13; rank += 1) {
          const on = placed[suit].has(rank);
          const isLast = lastCard && lastCard.suit === suit && lastCard.rank === rank;
          row.append(
            h("span", {
              class: `b7-cell${on ? " on" : ""}${on && (suit === "H" || suit === "D") ? " red" : ""}${isLast ? " last" : ""}${isLast && isFresh(lastAt) ? " fresh" : ""}`,
              text: on ? RANK_LABEL[rank] : "",
              "aria-label": on ? `${SUIT_MARK[suit]}${RANK_LABEL[rank]}` : null,
            }),
          );
        }
        board.append(row);
      }
      const info = (p) => {
        if (finished.includes(p)) return `<span class="badge gold">${finished.indexOf(p) + 1}位あがり</span>`;
        if (busted.includes(p)) return `<span class="badge red">ドボン</span>`;
        return `<span class="pts">パス ${p.passes}/${limit >= 99 ? "∞" : limit}</span>`;
      };
      const me = s.viewer;
      const myTurn = me && turnPlayer === me && me.human && s.waiter;
      s.layout({
        top: s.seats({ current: turnPlayer, info, out: (p) => !inGame(p) }),
        center: board,
        bottom: me
          ? s.hand(sortHand(me), {
              playable: turnPlayer === me ? playable : null,
              onClick: myTurn ? (card) => s.answer(card) : null,
            })
          : null,
      });
    }
    s.renderFn = render;

    s.say(`7を並べました。${firstPlayer.name}（♦7を持っていた人）から始めます`);
    render();
    await s.sleep(900);

    let idx = firstPlayer.id;
    while (P.filter(inGame).length > 1) {
      const p = P[idx];
      idx = (idx + 1) % P.length;
      if (!inGame(p)) continue;
      turnPlayer = p;
      let card;
      if (p.human) {
        await s.handoff(p);
        s.yourTurn(p);
        const can = p.hand.some(playable);
        const left = limit >= 99 ? "" : `（残り${limit - p.passes}回）`;
        s.note(can ? "出すカードをタップしてください" : `出せるカードがありません。パスしてください${left}`);
        const willBust = limit < 99 && p.passes >= limit;
        s.actions([{ label: willBust ? "パス（ドボン）" : `パス${left}`, value: "pass", danger: willBust }]);
        const pending = s.ask();
        render();
        const v = await pending;
        s.actions([]);
        card = v === "pass" ? null : v;
      } else {
        render();
        s.note(`${p.name}が考えています…`);
        await s.sleep(650);
        card = cpuPick(p);
      }

      if (card) {
        takeOut(p.hand, [card]);
        placed[card.suit].add(card.rank);
        lastCard = card;
        lastAt = Date.now();
        s.say(`${p.name}: ${cardName(card)}`);
        s.sfx("card");
        if (!p.hand.length) {
          finished.push(p);
          s.say(`${p.name} あがり！（${finished.length}位）`);
          s.sfx("good");
        }
      } else if (limit < 99 && p.passes >= limit) {
        busted.push(p);
        for (const c of p.hand) placed[c.suit].add(c.rank);
        s.say(`${p.name}: パスの回数を超えてドボン！ 手札を場に置きます`);
        s.sfx("bad");
        p.hand = [];
      } else {
        p.passes += 1;
        s.say(`${p.name}: パス（${p.passes}回目）`);
      }
      render();
      await s.sleep(p.human ? 400 : 450);
      if (p.human) s.conceal();
    }

    turnPlayer = null;
    const last = P.filter(inGame);
    render();
    await s.sleep(800);
    return [
      ...finished.map((p) => ({ player: p, note: "あがり" })),
      ...last.map((p) => ({ player: p, note: `残り${p.hand.length}枚` })),
      ...[...busted].reverse().map((p) => ({ player: p, note: "ドボン" })),
    ];
  },
});
