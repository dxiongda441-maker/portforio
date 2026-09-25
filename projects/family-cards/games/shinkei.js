"use strict";

/* 神経衰弱 */
registerGame({
  id: "shinkei",
  title: "神経衰弱",
  mark: "🧠",
  tone: "purple",
  tagline: "同じ数字のペアを覚えてめくる記憶ゲーム",
  players: [1, 6],
  defaultPlayers: 3,
  options: [
    { key: "size", label: "カードの枚数", choices: [[16, "16枚（小さい子向け）"], [24, "24枚"], [52, "52枚（全部）"]], default: 24 },
    { key: "memory", label: "CPUの記憶力", choices: [[0.3, "よわい"], [0.6, "ふつう"], [0.9, "つよい"]], default: 0.6 },
  ],
  rules: `
    <ol>
      <li>カードをすべて裏向きに並べます。</li>
      <li>自分の番では2枚めくります。<b>同じ数字</b>ならもらえて、もう一度めくれます。</li>
      <li>違う数字なら裏に戻して、次の人の番です。</li>
      <li>全部なくなったとき、ペアを一番多く取った人の勝ち。</li>
    </ol>
    <p>1人で遊ぶと、何回でクリアできたかを記録します。</p>
  `,

  async play(s) {
    const P = s.players;
    const pairs = s.options.size / 2;
    let cards;
    if (pairs === 26) {
      cards = makeDeck();
    } else {
      cards = [];
      const all = makeDeck();
      for (let rank = 1; rank <= pairs; rank += 1) {
        const [a, b] = shuffle(all.filter((c) => c.rank === rank));
        cards.push(a, b);
      }
    }
    shuffle(cards);
    const slots = cards.map((card) => ({ card, state: "down" }));
    for (const p of P) {
      p.taken = [];
      p.memory = new Map(); // slot index -> rank
    }
    let turnPlayer = null;
    let tries = 0;
    let open = [];

    const remember = (index) => {
      for (const p of P) {
        if (!p.human && Math.random() < s.options.memory) p.memory.set(index, slots[index].card.rank);
      }
    };
    const forget = (index) => {
      for (const p of P) p.memory.delete(index);
    };

    function render() {
      const grid = h("div", { class: `memory-grid size-${slots.length}` });
      const canPick = turnPlayer && turnPlayer.human && s.waiter;
      slots.forEach((slot, index) => {
        if (slot.state === "taken") {
          grid.append(h("div", { class: "card ghost", "aria-hidden": "true" }));
          return;
        }
        const up = slot.state === "up";
        grid.append(cardEl(slot.card, { faceDown: !up, onClick: canPick && !up ? () => s.answer(index) : null }));
      });
      const info = (p) => `<span class="pts">${p.taken.length / 2}組</span>`;
      s.layout({
        top: s.seats({ players: P, current: turnPlayer, info, count: () => null, faceUp: () => null }),
        center: grid,
      });
    }
    s.renderFn = render;

    async function flip(p) {
      if (p.human) {
        const pending = s.ask();
        render();
        return pending;
      }
      await s.sleep(650);
      const down = slots.map((slot, i) => i).filter((i) => slots[i].state === "down");
      const known = [...p.memory].filter(([i]) => slots[i].state === "down");
      if (open.length === 0) {
        const byRank = new Map();
        for (const [i, rank] of known) {
          if (byRank.has(rank)) return byRank.get(rank);
          byRank.set(rank, i);
        }
        const unknown = down.filter((i) => !p.memory.has(i));
        return pickRandom(unknown.length ? unknown : down);
      }
      const first = open[0];
      const match = known.find(([i, rank]) => i !== first && rank === slots[first].card.rank);
      if (match) return match[0];
      const unknown = down.filter((i) => i !== first && !p.memory.has(i));
      return pickRandom(unknown.length ? unknown : down.filter((i) => i !== first));
    }

    let idx = 0;
    s.say(`${P[0].name}から始めます`);
    while (slots.some((slot) => slot.state !== "taken")) {
      const p = P[idx];
      turnPlayer = p;
      open = [];
      s.note(`${p.name}の番: 1枚目をめくってください`);
      render();
      for (let k = 0; k < 2; k += 1) {
        const index = await flip(p);
        slots[index].state = "up";
        open.push(index);
        remember(index);
        if (k === 0) s.note(`${p.name}の番: 2枚目をめくってください`);
        render();
      }
      tries += 1;
      const [a, b] = open.map((i) => slots[i].card);
      if (a.rank === b.rank) {
        for (const i of open) {
          slots[i].state = "taken";
          forget(i);
        }
        p.taken.push(a, b);
        s.say(`${p.name}: ${cardName(a)} と ${cardName(b)} でペア！ もう一度`);
        await s.sleep(900);
        render();
      } else {
        s.note(`${p.name}: ざんねん（${cardName(a)} と ${cardName(b)}）`);
        await s.sleep(p.human ? 1500 : 1100);
        for (const i of open) slots[i].state = "down";
        idx = (idx + 1) % P.length;
        render();
      }
    }
    turnPlayer = null;
    render();
    if (P.length === 1) {
      return [{ player: P[0], note: `${tries}回でクリア！` }];
    }
    return [...P].sort((a, b) => b.taken.length - a.taken.length).map((p) => ({ player: p, note: `${p.taken.length / 2}組` }));
  },
});
