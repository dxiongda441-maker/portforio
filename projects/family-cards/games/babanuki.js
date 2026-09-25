"use strict";

/* ババ抜き / ジジ抜き */
registerGame({
  id: "babanuki",
  title: "ババ抜き",
  mark: "🃏",
  tone: "red",
  tagline: "ジョーカーを最後まで持っていた人の負け",
  players: [2, 6],
  defaultPlayers: 4,
  options: [
    {
      key: "mode",
      label: "ルール",
      choices: [
        ["baba", "ババ抜き"],
        ["jiji", "ジジ抜き"],
      ],
      default: "baba",
    },
  ],
  rules: `
    <p>ジョーカー1枚を入れた53枚を全員に配ります。</p>
    <ol>
      <li>最初に、同じ数字のペアをすべて捨てます（自動）。</li>
      <li>自分の番では、次の人の手札から裏向きのまま1枚引きます。</li>
      <li>引いたカードで同じ数字のペアができたら捨てます（自動）。</li>
      <li>手札がなくなった人から「あがり」。最後までジョーカーを持っていた人の負けです。</li>
    </ol>
    <p><b>ジジ抜き</b>: ジョーカーを入れず、52枚から誰にも見せずに1枚抜きます。抜いたカードと同じ数字の最後の1枚が「ジジ」になりますが、どれがジジかは最後まで分かりません。</p>
  `,

  async play(s) {
    const P = s.players;
    const jiji = s.options.mode === "jiji";
    const deck = shuffle(makeDeck({ jokers: jiji ? 0 : 1 }));
    const removed = jiji ? deck.pop() : null;
    deck.forEach((card, i) => P[i % P.length].hand.push(card));

    const finished = [];
    const fresh = new Set();
    let picking = null; // { player, target } 人間が選んでいる最中
    let turnPlayer = null;
    let lastPair = [];

    const inGame = (p) => p.hand.length > 0 && !finished.includes(p);
    const nextActive = (from) => {
      for (let step = 1; step <= P.length; step += 1) {
        const p = P[(from.id + step) % P.length];
        if (p !== from && inGame(p)) return p;
      }
      return null;
    };

    function discardPairs(p) {
      const pairs = [];
      const byRank = new Map();
      for (const card of p.hand) {
        if (card.joker) continue;
        if (!byRank.has(card.rank)) byRank.set(card.rank, []);
        byRank.get(card.rank).push(card);
      }
      for (const group of byRank.values()) {
        while (group.length >= 2) pairs.push(...group.splice(0, 2));
      }
      takeOut(p.hand, pairs);
      return pairs;
    }

    function render() {
      const info = (p) => {
        const place = finished.indexOf(p);
        return place >= 0 ? `<span class="badge gold">${place + 1}位あがり</span>` : "";
      };
      let center;
      if (picking) {
        const { target } = picking;
        center = h(
          "div",
          { class: "pick-area" },
          h("p", { class: "center-label", text: `${target.name}のカードから1枚えらんでください` }),
          h(
            "div",
            { class: "pick-row" },
            target.hand.map((card) => cardEl(card, { faceDown: true, size: "lg", onClick: () => s.answer(card) })),
          ),
        );
      } else {
        center = h(
          "div",
          { class: "center-info" },
          h("p", { class: "center-label", text: turnPlayer ? `${turnPlayer.name}の番` : "ペアを捨てています" }),
          lastPair.length ? h("div", { class: "pile-row" }, lastPair.map((c) => cardEl(c, { size: "sm" }))) : null,
          jiji ? h("p", { class: "muted small", text: "ジジ抜き: 1枚抜いてあります" }) : null,
        );
      }
      const viewerHand = s.viewer ? sortByRank(s.viewer.hand) : null;
      s.layout({
        top: s.seats({ current: turnPlayer, info, out: (p) => finished.includes(p) }),
        center,
        bottom: viewerHand ? s.hand(viewerHand, { fresh }) : null,
      });
    }
    s.renderFn = render;

    // 最初のペア捨て
    render();
    await s.sleep(500);
    for (const p of P) {
      const pairs = discardPairs(p);
      shuffle(p.hand);
      s.log(`${p.name}: ペアを${pairs.length / 2}組捨てた（残り${p.hand.length}枚）`);
    }
    for (const p of P) {
      if (p.hand.length === 0) {
        finished.push(p);
        s.say(`${p.name}はいきなりあがり！`);
      }
    }
    s.note("ペアを捨てました。ゲーム開始！");
    render();
    await s.sleep(900);

    let turn = pickRandom(P.filter(inGame));
    while (P.filter(inGame).length > 1) {
      if (!inGame(turn)) {
        turn = nextActive(turn);
        continue;
      }
      const p = turn;
      const target = nextActive(p);
      turnPlayer = p;
      lastPair = [];
      fresh.clear();
      let card;
      if (p.human) {
        await s.handoff(p);
        shuffle(target.hand);
        picking = { player: p, target };
        s.note(`${target.name}の手札から1枚引いてください`);
        render();
        s.actions([]);
        card = await s.ask();
        picking = null;
      } else {
        s.note(`${p.name}が${target.name}から引いています…`);
        render();
        await s.sleep(800);
        card = pickRandom(target.hand);
      }

      takeOut(target.hand, [card]);
      p.hand.push(card);
      fresh.add(card);
      if (s.isViewer(p)) s.say(`${target.name}から ${cardName(card)} を引いた`);
      else if (s.isViewer(target)) s.say(`${p.name}に ${cardName(card)} を引かれた`);
      else s.say(`${p.name}が${target.name}から1枚引いた`);
      render();
      await s.sleep(p.human ? 900 : 500);

      const pair = discardPairs(p);
      if (pair.length) {
        lastPair = pair;
        fresh.clear();
        s.say(`${p.name}: ${cardNames(pair)} のペアを捨てた！`);
      }
      shuffle(p.hand);
      render();
      await s.sleep(700);
      if (p.human) s.conceal();

      if (target.hand.length === 0 && !finished.includes(target)) {
        finished.push(target);
        s.say(`${target.name} あがり！（${finished.length}位）`);
        await s.sleep(700);
      }
      if (p.hand.length === 0 && !finished.includes(p)) {
        finished.push(p);
        s.say(`${p.name} あがり！（${finished.length}位）`);
        await s.sleep(700);
      }
      turn = nextActive(p) || p;
    }

    const loser = P.find(inGame);
    turnPlayer = null;
    render();
    const last = loser.hand[0];
    s.say(`${loser.name}の手に ${cardName(last)} が残りました`);
    await s.sleep(1200);
    const ranking = finished.map((p) => ({ player: p, note: "あがり" }));
    ranking.push({
      player: loser,
      note: jiji ? `ジジは ${cardName(last)}（抜いたのは ${cardName(removed)}）` : "ババを持っていた…",
    });
    return ranking;
  },
});
