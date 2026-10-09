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
  levels: true,
  options: [
    { key: "maxCards", label: "1回に出せる枚数", choices: [[4, "4枚まで"], [2, "2枚まで"], [1, "1枚だけ"]], default: 4 },
    {
      key: "jokers",
      group: "local",
      label: "ジョーカー",
      help: "ジョーカーはどの数字としても「本当」になる。",
      choices: [[0, "なし"], [1, "1枚"], [2, "2枚"]],
      default: 0,
    },
  ],
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
    <p>設定で、1回に出せる枚数（4枚まで／2枚まで／1枚だけ）と、ジョーカー（どの数字としても本当になる）を変えられます。</p>
    <p>この画面では、カードが出されたあとに人間の参加者に「ダウト！」ボタンが出ます。人間がだれも言わなかったときは CPU が判断します。</p>
  `,

  async play(s) {
    const P = s.players;
    const maxCards = s.options.maxCards || 4;
    const jokerCount = s.options.jokers || 0;
    const deck = shuffle(makeDeck({ jokers: jokerCount }));
    const honest = (c) => c.joker || c.rank === rank;
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
    let pileAt = 0;
    // ダウトでめくられて公開されたカードが、いまだれの手札にあるか（「つよい」CPUが覚える）
    const known = new Map();

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
            : h("div", { class: "pile-stack" }, pile.length ? cardEl(null, { size: "lg", pop: isFresh(pileAt) }) : h("div", { class: "card ghost lg" }), h("b", { text: `場 ${pile.length}枚` })),
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
                    else if (sel.size < maxCards) sel.add(card);
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
      // ジョーカーは本当の札として扱えるが、なるべく本物の数字を先に使う
      const truth = [...p.hand.filter((c) => !c.joker && c.rank === rank), ...p.hand.filter((c) => c.joker)];
      const naturals = truth.filter((c) => !c.joker).length;
      if (naturals || (truth.length && p.hand.length === truth.length)) {
        const out = truth.slice(0, Math.max(1, Math.min(maxCards, naturals || truth.length)));
        const others = p.hand.filter((c) => !honest(c));
        if (others.length > 3 && out.length < Math.min(3, maxCards) && Math.random() < 0.2) out.push(farthest(others));
        return out;
      }
      const lies = p.hand.filter((c) => !c.joker);
      if (!lies.length) return truth.slice(0, 1);
      const out = [farthest(lies)];
      if (maxCards > 1 && lies.length > 6 && Math.random() < 0.15) out.push(farthest(lies.filter((c) => c !== out[0])));
      return out;
    }
    // 次に必要になるまで一番遠い数字（＝当分出番がないカード）
    function farthest(cards) {
      const dist = (c) => (c.rank - rank + 13) % 13;
      return [...cards].sort((a, b) => dist(b) - dist(a))[0];
    }

    function cpuDoubts(q, play) {
      const level = s.options.level || "normal";
      const held = q.hand.filter((c) => c.rank === play.rank).length;
      let elsewhere = 0;
      if (level === "hard") {
        for (const [card, holder] of known) {
          if (card.rank === play.rank && holder !== q && holder !== play.player && holder.hand.includes(card)) elsewhere += 1;
        }
      }
      if (held + elsewhere + play.count > 4 + jokerCount) return true; // 数が合わない＝確実にウソ
      let chance = 0.07 + 0.12 * (play.count - 1) + held * 0.1;
      if (play.player.hand.length === 0) chance += level === "hard" ? 0.7 : 0.5;
      else if (level === "hard" && play.player.hand.length <= 2) chance += 0.15;
      if (pile.length > 12) chance -= 0.05;
      if (level === "easy") chance *= 0.5;
      // CPUが何人いても「卓のだれかがダウトする確率」が chance 程度になるよう、1人あたりに割り戻す
      const judges = P.filter((x) => !x.human && x !== play.player).length;
      const each = 1 - Math.pow(1 - Math.min(Math.max(chance, 0), 0.95), 1 / Math.max(1, judges));
      return Math.random() < each;
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
        s.yourTurn(p);
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
            const truth = p.hand.filter(honest).slice(0, maxCards);
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
      pileAt = Date.now();
      s.sfx("card");
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
        const lie = cards.some((c) => !honest(c));
        revealed = cards;
        s.say(`${doubter.name}「ダウト！」`);
        s.sfx("special");
        render();
        await s.sleep(1100);
        const taker = lie ? p : doubter;
        taker.hand.push(...pile);
        for (const c of cards) known.set(c, taker);
        s.sfx(taker.human ? "bad" : "good");
        s.say(lie ? `ウソでした！ ${p.name}が場の${pile.length}枚を引き取ります` : `本当でした！ ${doubter.name}が場の${pile.length}枚を引き取ります`);
        pile = [];
        await s.sleep(1500);
        revealed = null;
      }
      if (p.hand.length === 0) {
        winner = p;
        s.say(`${p.name} あがり！`);
        s.sfx("good");
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
    return [{ player: winner, note: "あがり" }, ...rest.map((p) => ({ player: p, note: `残り${p.hand.length}枚`, key: p.hand.length }))];
  },
});
