"use strict";

/* ダウト */
registerGame({
  id: "doubt",
  title: "ダウト",
  mark: "？",
  tone: "red",
  tagline: "ウソを見抜け！ A→2→3…の順に出していく",
  players: [3, 6],
  defaultPlayers: 4,
  options: [],
  rules: `
    <ol>
      <li>カードを全員に配ります。</li>
      <li>順番に、A → 2 → 3 → … → K → A … の数字を「言いながら」、カードを<b>裏向きで</b>1〜4枚出します。</li>
      <li>本当はその数字でなくても出してかまいません（ウソをついてOK）。</li>
      <li>ほかの人は「ウソだ」と思ったら <b>ダウト！</b> と言います。</li>
      <li>ダウトされたらカードをめくります。
        <ul>
          <li>ウソだった → 出した人が、場のカードを全部引き取る。</li>
          <li>本当だった → ダウトと言った人が、場のカードを全部引き取る。</li>
        </ul>
      </li>
      <li>最初に手札をなくした人の勝ち。残りの人は手札が少ない順です。</li>
    </ol>
    <p>この画面では、カードが出されたあとに人間の参加者に「ダウト！」ボタンが出ます。人間がだれも言わなかったときは CPU が判断します。</p>
  `,

  async play(s) {
    const P = s.players;
    const deck = shuffle(makeDeck());
    const offset = Math.floor(Math.random() * P.length);
    deck.forEach((card, i) => P[(i + offset) % P.length].hand.push(card));

    let pile = [];
    let rank = 1;
    let turnPlayer = null;
    let lastPlay = null; // { player, count, rank }
    let revealed = null; // めくったカード
    let sel = new Set();
    let selecting = false;
    let winner = null;
    let refresh = () => {};

    const sortHand = (p) => sortByRank(p.hand);

    function render() {
      const info = (p) => (p === winner ? `<span class="badge gold">あがり</span>` : "");
      const center = h(
        "div",
        { class: "center-info" },
        h("div", { class: "doubt-now" }, h("span", { text: "いまの数字" }), h("strong", { text: RANK_LABEL[rank] })),
        h(
          "div",
          { class: "doubt-pile" },
          revealed
            ? h("div", { class: "pile-row" }, revealed.map((c) => cardEl(c, { size: "lg" })))
            : h("div", { class: "pile-stack" }, pile.length ? cardEl(null, { size: "lg" }) : h("div", { class: "card ghost lg" }), h("b", { text: `場 ${pile.length}枚` })),
        ),
        lastPlay ? h("p", { class: "center-label", text: `${lastPlay.player.name}:「${RANK_LABEL[lastPlay.rank]}」を${lastPlay.count}枚` }) : null,
      );
      const me = s.viewer;
      s.layout({
        top: s.seats({ current: turnPlayer, info }),
        center,
        bottom: me
          ? s.hand(sortHand(me), {
              selected: sel,
              onClick: selecting
                ? (card) => {
                    if (sel.has(card)) sel.delete(card);
                    else if (sel.size < 4) sel.add(card);
                    render();
                    refresh();
                  }
                : null,
            })
          : null,
      });
    }
    s.renderFn = render;

    function cpuPlay(p) {
      const truth = p.hand.filter((c) => c.rank === rank);
      if (truth.length) {
        const out = [...truth];
        const others = p.hand.filter((c) => c.rank !== rank);
        if (others.length > 3 && out.length < 3 && Math.random() < 0.2) out.push(farthest(others));
        return out;
      }
      const out = [farthest(p.hand)];
      if (p.hand.length > 6 && Math.random() < 0.15) out.push(farthest(p.hand.filter((c) => c !== out[0])));
      return out;
    }
    // 次に必要になるまで一番遠い数字（＝当分出番がないカード）
    function farthest(cards) {
      const dist = (c) => (c.rank - rank + 13) % 13;
      return [...cards].sort((a, b) => dist(b) - dist(a))[0];
    }

    function cpuDoubts(q, play) {
      const held = q.hand.filter((c) => c.rank === play.rank).length;
      if (held + play.count > 4) return true;
      let chance = 0.07 + 0.12 * (play.count - 1) + held * 0.1;
      if (play.player.hand.length === 0) chance += 0.5;
      if (pile.length > 12) chance -= 0.05;
      return Math.random() < chance;
    }

    let idx = Math.floor(Math.random() * P.length);
    s.say(`${P[idx].name}から始めます。最初の数字は A`);
    while (!winner) {
      const p = P[idx];
      turnPlayer = p;
      revealed = null;
      let cards;
      if (p.human) {
        await s.handoff(p);
        sel = new Set();
        selecting = true;
        refresh = () =>
          s.actions([
            { label: sel.size ? `「${RANK_LABEL[rank]}」として${sel.size}枚出す` : "カードを選んでください", value: "play", primary: true, disabled: !sel.size },
            { label: "本当のカードを選ぶ", value: "hint" },
          ]);
        s.note(`「${RANK_LABEL[rank]}」として出すカードを1〜4枚選んでください（ウソでもOK）`);
        render();
        for (;;) {
          refresh();
          const v = await s.ask();
          if (v === "play" && sel.size) break;
          if (v === "hint") {
            const truth = p.hand.filter((c) => c.rank === rank).slice(0, 4);
            sel = new Set(truth);
            s.note(truth.length ? `本当の「${RANK_LABEL[rank]}」は${truth.length}枚あります` : `「${RANK_LABEL[rank]}」は持っていません。ウソをつくしかない！`);
            render();
          }
        }
        selecting = false;
        s.actions([]);
        cards = [...sel];
        sel = new Set();
      } else {
        s.note(`${p.name}が考えています…`);
        render();
        await s.sleep(750);
        cards = cpuPlay(p);
      }
      takeOut(p.hand, cards);
      pile.push(...cards);
      lastPlay = { player: p, count: cards.length, rank, cards };
      s.say(`${p.name}:「${RANK_LABEL[rank]}」を${cards.length}枚出した（残り${p.hand.length}枚）`);
      if (p.human) s.conceal();
      render();

      // ダウトするか
      let doubter = null;
      const humanJudges = P.filter((q) => q.human && q !== p);
      if (humanJudges.length) {
        const list = humanJudges.map((q) => ({ label: humanJudges.length > 1 || s.multi ? `${q.name}がダウト！` : "ダウト！", value: q.id, danger: true }));
        list.push({ label: "スルー", value: "none", primary: true });
        const v = await s.choose(list, `${p.name}は「${RANK_LABEL[rank]}」を${cards.length}枚と言っています。ダウトする？`);
        if (v !== "none") doubter = P[v];
      } else {
        await s.sleep(500);
      }
      if (!doubter) {
        for (let step = 1; step < P.length && !doubter; step += 1) {
          const q = P[(p.id + step) % P.length];
          if (!q.human && cpuDoubts(q, lastPlay)) doubter = q;
        }
      }

      if (doubter) {
        const lie = cards.some((c) => c.rank !== rank);
        revealed = cards;
        s.say(`${doubter.name}「ダウト！」`);
        render();
        await s.sleep(1100);
        const taker = lie ? p : doubter;
        taker.hand.push(...pile);
        s.say(lie ? `ウソでした！ ${p.name}が場の${pile.length}枚を引き取ります` : `本当でした！ ${doubter.name}が場の${pile.length}枚を引き取ります`);
        pile = [];
        await s.sleep(1500);
        revealed = null;
      }
      if (p.hand.length === 0) {
        winner = p;
        s.say(`${p.name} あがり！`);
      }
      render();
      await s.sleep(400);
      rank = (rank % 13) + 1;
      idx = (idx + 1) % P.length;
    }
    turnPlayer = null;
    render();
    await s.sleep(800);
    const rest = P.filter((p) => p !== winner).sort((a, b) => a.hand.length - b.hand.length);
    return [{ player: winner, note: "あがり" }, ...rest.map((p) => ({ player: p, note: `残り${p.hand.length}枚` }))];
  },
});
