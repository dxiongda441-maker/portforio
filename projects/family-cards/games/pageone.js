"use strict";

/* ページワン */
registerGame({
  id: "pageone",
  title: "ページワン",
  mark: "1",
  tone: "green",
  tagline: "同じマークか同じ数字を出していく",
  players: [2, 6],
  defaultPlayers: 4,
  options: [
    { key: "special", label: "特殊カード（2・8・J）", choices: [[true, "あり"], [false, "なし"]], default: true },
  ],
  rules: `
    <ol>
      <li>1人7枚（5人以上なら5枚）配り、山札の1枚を表にして始めます。</li>
      <li>場のカードと<b>同じマーク</b>か<b>同じ数字</b>のカードを1枚出します。</li>
      <li>出せないとき（出したくないとき）は山札から1枚引きます。引いたカードが出せればそのまま出せます。</li>
      <li>残り1枚になったら「ページワン！」（この画面では自動で宣言します）。</li>
      <li>最初に手札をなくした人の勝ち。残りの人は手札が少ない順です。</li>
    </ol>
    <p><b>特殊カード（ありの場合）</b></p>
    <ul>
      <li><b>8</b>: いつでも出せて、次のマークを好きに決められる。</li>
      <li><b>J</b>: 次の人をとばす。</li>
      <li><b>2</b>: 次の人は2枚引く。2を出せば、さらに次の人へ押しつけられる（枚数は重なる）。</li>
    </ul>
  `,

  async play(s) {
    const P = s.players;
    const special = s.options.special;
    let deck = shuffle(makeDeck());
    const perPlayer = P.length >= 5 ? 5 : 7;
    for (let k = 0; k < perPlayer; k += 1) for (const p of P) p.hand.push(deck.pop());
    const discard = [deck.pop()];
    let suit = discard[0].suit;
    let pendingDraw = 0;
    let turnPlayer = null;
    let winner = null;
    let fresh = new Set();

    const top = () => discard[discard.length - 1];
    const canPlay = (card) => {
      if (pendingDraw > 0) return card.rank === 2;
      if (special && card.rank === 8) return true;
      return card.suit === suit || card.rank === top().rank;
    };
    const sortHand = (p) => [...p.hand].sort((a, b) => SUITS.indexOf(a.suit) - SUITS.indexOf(b.suit) || a.rank - b.rank);

    function drawOne() {
      if (!deck.length) {
        const keep = discard.pop();
        deck = shuffle(discard.splice(0));
        discard.push(keep);
        if (deck.length) s.log("捨て札を混ぜて山札にしました");
      }
      return deck.pop() || null;
    }

    function render() {
      const info = (p) => (p === winner ? `<span class="badge gold">あがり</span>` : p.hand.length === 1 ? `<span class="badge red">ページワン</span>` : "");
      const center = h(
        "div",
        { class: "center-info" },
        h(
          "div",
          { class: "pile-row" },
          h("div", { class: "pile-stack" }, cardEl(null, { size: "lg" }), h("b", { text: `山札 ${deck.length}` })),
          cardEl(top(), { size: "lg" }),
        ),
        h(
          "p",
          { class: "center-label" },
          "いまのマーク ",
          h("b", { class: suit === "H" || suit === "D" ? "suit-red" : "", text: `${SUIT_MARK[suit]} ${SUIT_NAME[suit]}` }),
          pendingDraw ? h("span", { class: "badge red", text: `次の人 ${pendingDraw}枚ドロー` }) : null,
        ),
      );
      const me = s.viewer;
      const myTurn = me && turnPlayer === me && s.waiter;
      s.layout({
        top: s.seats({ current: turnPlayer, info }),
        center,
        bottom: me
          ? s.hand(sortHand(me), {
              playable: turnPlayer === me ? canPlay : null,
              onClick: myTurn ? (card) => s.answer(card) : null,
              fresh,
            })
          : null,
      });
    }
    s.renderFn = render;

    function cpuPick(p) {
      const options = p.hand.filter(canPlay);
      if (!options.length) return null;
      const count = (st) => p.hand.filter((c) => c.suit === st).length;
      const next = P[(p.id + 1) % P.length];
      let best = null;
      for (const card of options) {
        let score = count(card.suit) + Math.random();
        if (special && card.rank === 8) score -= 6; // 切り札は温存
        if (special && (card.rank === 2 || card.rank === 11) && next.hand.length <= 2) score += 5;
        if (!best || score > best.score) best = { card, score };
      }
      return best.card;
    }

    async function chooseSuit(p) {
      if (p.human) {
        return s.choose(
          SUITS.map((st) => ({ label: `${SUIT_MARK[st]} ${SUIT_NAME[st]}`, value: st })),
          "次のマークを選んでください",
        );
      }
      const counts = SUITS.map((st) => [st, p.hand.filter((c) => c.suit === st).length]);
      counts.sort((a, b) => b[1] - a[1]);
      return counts[0][0];
    }

    async function playCard(p, card) {
      takeOut(p.hand, [card]);
      discard.push(card);
      suit = card.suit;
      let msg = `${p.name}: ${cardName(card)}`;
      let skip = false;
      if (special && card.rank === 8) {
        render();
        suit = await chooseSuit(p);
        msg += `（マークを${SUIT_MARK[suit]}に変更）`;
      } else if (special && card.rank === 2) {
        pendingDraw += 2;
        msg += `（次の人は${pendingDraw}枚引く）`;
      } else if (special && card.rank === 11) {
        skip = true;
        msg += "（次の人はお休み）";
      }
      s.say(msg);
      if (p.hand.length === 1) s.say(`${p.name}「ページワン！」`);
      if (p.hand.length === 0) winner = p;
      return skip;
    }

    let idx = Math.floor(Math.random() * P.length);
    s.say(`最初のカードは ${cardName(top())}。${P[idx].name}から始めます`);
    let guard = 0;
    while (!winner && guard < 2000) {
      guard += 1;
      const p = P[idx];
      turnPlayer = p;
      fresh = new Set();
      let skip = false;
      if (p.human) await s.handoff(p);

      if (pendingDraw > 0 && !p.hand.some(canPlay)) {
        const got = [];
        for (let k = 0; k < pendingDraw; k += 1) {
          const c = drawOne();
          if (c) got.push(c);
        }
        p.hand.push(...got);
        fresh = new Set(got);
        s.say(`${p.name}: ${got.length}枚引いた`);
        pendingDraw = 0;
        render();
        await s.sleep(p.human ? 1100 : 700);
      } else {
        let card;
        if (p.human) {
          const list = pendingDraw > 0 ? [{ label: `${pendingDraw}枚引く`, value: "take" }] : [{ label: "1枚引く", value: "draw" }];
          s.note(pendingDraw > 0 ? `2を出して押しつけるか、${pendingDraw}枚引きます` : "出すカードをタップ。出せないときは1枚引きます");
          s.actions(list);
          const pending = s.ask();
          render();
          const v = await pending;
          s.actions([]);
          card = v;
        } else {
          render();
          s.note(`${p.name}が考えています…`);
          await s.sleep(700);
          card = cpuPick(p) || (pendingDraw > 0 ? "take" : "draw");
        }

        if (card === "take") {
          const got = [];
          for (let k = 0; k < pendingDraw; k += 1) {
            const c = drawOne();
            if (c) got.push(c);
          }
          p.hand.push(...got);
          fresh = new Set(got);
          s.say(`${p.name}: ${got.length}枚引いた`);
          pendingDraw = 0;
        } else if (card === "draw") {
          const c = drawOne();
          if (!c) {
            s.say(`${p.name}: 山札がないのでパス`);
          } else {
            p.hand.push(c);
            fresh = new Set([c]);
            s.say(`${p.name}: 1枚引いた${s.isViewer(p) ? `（${cardName(c)}）` : ""}`);
            render();
            if (canPlay(c)) {
              let play;
              if (p.human) {
                play = await s.choose(
                  [
                    { label: `${cardName(c)} を出す`, value: true, primary: true },
                    { label: "出さずにパス", value: false },
                  ],
                  "引いたカードが出せます",
                );
              } else {
                await s.sleep(500);
                play = !(special && c.rank === 8 && p.hand.length > 3);
              }
              if (play) skip = await playCard(p, c);
              else s.log(`${p.name}: パス`);
            } else {
              await s.sleep(p.human ? 700 : 300);
              s.log(`${p.name}: 出せないのでパス`);
            }
          }
        } else {
          skip = await playCard(p, card);
        }
        render();
        await s.sleep(p.human ? 500 : 450);
      }
      if (p.human) s.conceal();
      idx = (idx + (skip ? 2 : 1)) % P.length;
    }

    turnPlayer = null;
    render();
    await s.sleep(800);
    const rest = P.filter((p) => p !== winner).sort((a, b) => a.hand.length - b.hand.length);
    if (!winner) {
      return [...P].sort((a, b) => a.hand.length - b.hand.length).map((p) => ({ player: p, note: `残り${p.hand.length}枚` }));
    }
    return [{ player: winner, note: "あがり" }, ...rest.map((p) => ({ player: p, note: `残り${p.hand.length}枚` }))];
  },
});
