"use strict";

/* スピード（リアルタイム・2人） */
registerGame({
  id: "speed",
  title: "スピード",
  mark: "⚡",
  tone: "gold",
  tagline: "早い者勝ち！ となりの数字をどんどん重ねる",
  players: [2, 2],
  defaultPlayers: 2,
  options: [
    { key: "cpu", label: "CPUの速さ", choices: [[1600, "ゆっくり"], [1100, "ふつう"], [700, "はやい"]], default: 1100 },
  ],
  rules: `
    <p>2人で同時に遊ぶ、早い者勝ちのゲームです。順番はありません。</p>
    <ol>
      <li>黒（♠♣）と赤（♥♦）に分けて、それぞれ自分の山にします。</li>
      <li>自分の山から4枚を表にして手前に並べます（場札）。</li>
      <li>「せーの！」で、2人とも山から1枚を真ん中に出します（台札）。</li>
      <li>場札のうち、台札と<b>1つちがいの数字</b>（例: 5 なら 4 か 6。K と A もつながる）を、どちらかの台札にどんどん重ねます。タップするだけで出せます。</li>
      <li>場札が減ったら山から自動で補充されます。</li>
      <li>2人とも出せなくなったら、もう一度「せーの！」で台札を出し直します。</li>
      <li>先に山札と場札を全部なくした人の勝ち！</li>
    </ol>
    <p>2人とも人間のときは、上側の人は画面を向かい合わせにして遊べます（上半分が逆さまに表示されます）。</p>
  `,

  async play(s) {
    const P = s.players;
    const [A, B] = P;
    const full = makeDeck();
    A.deck = shuffle(full.filter((c) => !isRed(c)));
    B.deck = shuffle(full.filter((c) => isRed(c)));
    for (const p of P) {
      p.field = [null, null, null, null].map(() => p.deck.pop());
      p.hand = [];
    }
    const piles = [[], []];
    let winner = null;
    let started = false;
    let stuckSince = 0;
    let flash = null; // { player, slot } 出せなかったカード
    let banner = "";

    // 下側に表示する人（人間が1人ならその人）
    const bottom = s.humans.length === 1 ? s.humans[0] : A;
    const topP = bottom === A ? B : A;
    const rotateTop = topP.human;

    const adjacent = (a, b) => {
      const d = Math.abs(a.rank - b.rank);
      return d === 1 || d === 12;
    };
    const pileFor = (card) => {
      const order = Math.random() < 0.5 ? [0, 1] : [1, 0];
      return order.find((i) => piles[i].length && adjacent(card, piles[i][piles[i].length - 1]));
    };
    const remaining = (p) => p.deck.length + p.field.filter(Boolean).length;
    const hasMove = (p) => p.field.some((c) => c && pileFor(c) !== undefined);

    function checkWin(p) {
      if (!winner && remaining(p) === 0) {
        winner = p;
        s.answer(p);
      }
    }

    function tryPlay(p, slot) {
      if (!started || winner) return false;
      const card = p.field[slot];
      if (!card) return false;
      const target = pileFor(card);
      if (target === undefined) return false;
      piles[target].push(card);
      p.field[slot] = p.deck.pop() || null;
      stuckSince = 0;
      checkWin(p);
      render();
      return true;
    }

    function seiNo() {
      for (const [i, p] of [A, B].entries()) {
        let card = p.deck.pop();
        if (!card) {
          const slot = p.field.findIndex(Boolean);
          if (slot >= 0) {
            card = p.field[slot];
            p.field[slot] = null;
          }
        }
        if (card) piles[i].push(card);
      }
      banner = "せーの！";
      s.log("せーの！ 台札を出し直しました");
      checkWin(A);
      checkWin(B);
      render();
      setTimeout(() => {
        if (banner === "せーの！") {
          banner = "";
          s.render();
        }
      }, 700);
    }

    function side(p, pos) {
      const clickable = p.human && started && !winner;
      return h(
        "div",
        { class: `speed-side ${pos}${pos === "top" && rotateTop ? " rot" : ""}` },
        h(
          "div",
          { class: "speed-meta" },
          h("span", { class: "seat-name" }, h("span", { class: "seat-icon", text: p.human ? "人" : "C" }), p.name),
          h("span", { class: "pts", text: `山 ${p.deck.length}枚 / 残り ${remaining(p)}枚` }),
        ),
        h(
          "div",
          { class: "speed-field" },
          p.field.map((card, slot) => {
            if (!card) return h("div", { class: "card ghost lg" });
            const el = cardEl(card, {
              size: "lg",
              onClick: clickable
                ? () => {
                    if (!tryPlay(p, slot)) {
                      flash = { player: p, slot };
                      render();
                    }
                  }
                : null,
            });
            if (flash && flash.player === p && flash.slot === slot) {
              el.classList.add("shake");
              flash = null;
            }
            return el;
          }),
        ),
      );
    }

    function render() {
      const pileEl = (i) => {
        const pile = piles[i];
        return pile.length ? cardEl(pile[pile.length - 1], { size: "xl" }) : h("div", { class: "card ghost xl" });
      };
      const board = h(
        "div",
        { class: "speed-board" },
        side(topP, "top"),
        h("div", { class: "speed-center" }, pileEl(0), banner ? h("div", { class: "speed-banner", text: banner }) : null, pileEl(1)),
        side(bottom, "bottom"),
      );
      s.layout({ center: board });
    }
    s.renderFn = render;

    render();
    if (s.humans.length) {
      await s.choose([{ label: "スタート！", value: "go", primary: true }], "準備ができたらスタート。カードをタップすると台札に出せます");
    }
    for (const count of ["3", "2", "1"]) {
      banner = count;
      render();
      await s.sleep(600);
    }
    started = true;
    seiNo();
    s.note("となりの数字をタップ！");

    // CPU の手
    for (const p of P) {
      if (p.human) continue;
      const base = Math.max(40, s.options.cpu * Speed.factor);
      let next = Date.now() + base;
      s.interval(() => {
        if (winner || Date.now() < next) return;
        next = Date.now() + base * (0.7 + Math.random() * 0.6);
        const slots = p.field.map((c, i) => i).filter((i) => p.field[i] && pileFor(p.field[i]) !== undefined);
        if (slots.length) tryPlay(p, pickRandom(slots));
      }, 50);
    }
    // 2人とも出せないときは「せーの」
    s.interval(() => {
      if (winner) return;
      if (hasMove(A) || hasMove(B)) {
        stuckSince = 0;
        return;
      }
      if (!stuckSince) {
        stuckSince = Date.now();
        banner = "出せるカードなし";
        render();
        return;
      }
      if (Date.now() - stuckSince > Math.max(60, 1300 * Speed.factor)) {
        stuckSince = 0;
        seiNo();
      }
    }, 100);

    const champion = await s.ask();
    s.clearIntervals();
    started = false;
    banner = `${champion.name}の勝ち！`;
    render();
    await s.sleep(1200);
    const loser = champion === A ? B : A;
    return [
      { player: champion, note: "全部出し切った！" },
      { player: loser, note: `残り${remaining(loser)}枚` },
    ];
  },
});
