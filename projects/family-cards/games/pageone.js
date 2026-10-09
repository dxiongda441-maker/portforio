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
  levels: true,
  options: [
    { key: "hand", label: "最初に配る枚数", choices: [[0, "おまかせ"], [5, "5枚"], [7, "7枚"]], default: 0 },
    { key: "two", group: "local", label: "2（ドロー2）", help: "次の人は2枚引く。", choices: [[true, "あり"], [false, "なし"]], default: true },
    { key: "stack", group: "local", label: "2の重ね", help: "2を出されたら、2を重ねて次の人へ押しつけられる（枚数は増えていく）。", choices: [[true, "あり"], [false, "なし"]], default: true },
    { key: "eight", group: "local", label: "8（ワイルド）", help: "いつでも出せて、次のマークを好きに決められる。", choices: [[true, "あり"], [false, "なし"]], default: true },
    { key: "jack", group: "local", label: "J（スキップ）", help: "次の人をとばす。", choices: [[true, "あり"], [false, "なし"]], default: true },
    { key: "noSpecialFinish", group: "local", label: "特殊カードで上がれない", help: "最後の1枚が 2・8・J のときは出せず、山札から引く。", choices: [[true, "あり"], [false, "なし"]], default: false },
  ],
  rules: `
    <ol>
      <li>1人7枚（5人以上なら5枚。設定で変更可）配り、山札の1枚を表にして始めます。</li>
      <li>場のカードと<b>同じマーク</b>か<b>同じ数字</b>のカードを1枚出します。</li>
      <li>出せないとき（出したくないとき）は山札から1枚引きます。引いたカードが出せればそのまま出せます。</li>
      <li>残り1枚になったら「ページワン！」（この画面では自動で宣言します）。</li>
      <li>最初に手札をなくした人の勝ち。残りの人は手札が少ない順です。</li>
    </ol>
    <p><b>特殊カード</b>（地域で違うので、設定画面で1枚ずつオン/オフできます）</p>
    <ul>
      <li><b>8</b>: いつでも出せて、次のマークを好きに決められる。</li>
      <li><b>J</b>: 次の人をとばす。</li>
      <li><b>2</b>: 次の人は2枚引く。<b>2の重ね</b>がありなら、2を出してさらに次の人へ押しつけられる（枚数は重なる）。</li>
      <li><b>特殊カードで上がれない</b>（ありの場合）: 最後の1枚が特殊カードだと出せず、山札から引きます。</li>
    </ul>
  `,

  async play(s) {
    const P = s.players;
    const R = {
      two: s.options.two !== false,
      stack: s.options.stack !== false,
      eight: s.options.eight !== false,
      jack: s.options.jack !== false,
      noSpecialFinish: Boolean(s.options.noSpecialFinish),
    };
    const isSpecial = (c) => (R.two && c.rank === 2) || (R.eight && c.rank === 8) || (R.jack && c.rank === 11);
    let deck = shuffle(makeDeck());
    const perPlayer = s.options.hand || (P.length >= 5 ? 5 : 7);
    for (let k = 0; k < perPlayer; k += 1) for (const p of P) p.hand.push(deck.pop());
    const discard = [deck.pop()];
    let suit = discard[0].suit;
    let pendingDraw = 0;
    let turnPlayer = null;
    let winner = null;
    let fresh = new Set();
    let topAt = 0;

    const top = () => discard[discard.length - 1];
    const canPlay = (card) => {
      // 特殊カードで上がれないルール: 最後の1枚が特殊カードなら出せない
      if (R.noSpecialFinish && turnPlayer && turnPlayer.hand.length === 1 && isSpecial(card)) return false;
      if (pendingDraw > 0) return R.stack && card.rank === 2;
      if (R.eight && card.rank === 8) return true;
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
          cardEl(top(), { size: "lg", pop: isFresh(topAt) }),
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
      const level = s.options.level || "normal";
      if (level === "easy") return pickRandom(options);
      const count = (st) => p.hand.filter((c) => c.suit === st).length;
      const next = P[(p.id + 1) % P.length];
      const danger = Math.min(...P.filter((q) => q !== p).map((q) => q.hand.length));
      let best = null;
      for (const card of options) {
        let score = count(card.suit) + Math.random();
        if (R.eight && card.rank === 8) score -= level === "hard" && p.hand.length <= 2 ? -3 : 6; // 切り札は温存（最後は切る）
        if (((R.two && card.rank === 2) || (R.jack && card.rank === 11)) && next.hand.length <= 2) score += 5;
        // 特殊カードで上がれないなら、特殊カードは早めに使う
        if (R.noSpecialFinish && isSpecial(card) && p.hand.length <= 3) score += 4;
        if (level === "hard") {
          // 同じ数字の別マークを持っていれば、マークを変えて逃げ道を作れる
          if (p.hand.some((c) => c !== card && c.rank === card.rank)) score += 1.5;
          // だれかがページワン目前なら、攻撃札を優先
          if (danger <= 2 && ((R.two && card.rank === 2) || (R.jack && card.rank === 11))) score += 3;
        }
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
      topAt = Date.now();
      s.sfx("card");
      suit = card.suit;
      let msg = `${p.name}: ${cardName(card)}`;
      let skip = false;
      if (R.eight && card.rank === 8) {
        render();
        suit = await chooseSuit(p);
        msg += `（マークを${SUIT_MARK[suit]}に変更）`;
      } else if (R.two && card.rank === 2) {
        pendingDraw += 2;
        msg += `（次の人は${pendingDraw}枚引く）`;
      } else if (R.jack && card.rank === 11) {
        skip = true;
        msg += "（次の人はお休み）";
      }
      s.say(msg);
      if (isSpecial(card)) s.sfx("special");
      if (p.hand.length === 1) s.say(`${p.name}「ページワン！」`);
      if (p.hand.length === 0) {
        winner = p;
        s.sfx("good");
      }
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
      if (p.human) {
        await s.handoff(p);
        s.yourTurn(p);
      }

      if (pendingDraw > 0 && !p.hand.some(canPlay)) {
        const got = [];
        for (let k = 0; k < pendingDraw; k += 1) {
          const c = drawOne();
          if (c) got.push(c);
        }
        p.hand.push(...got);
        fresh = new Set(got);
        s.say(`${p.name}: ${got.length}枚引いた`);
        s.sfx("draw");
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
            s.sfx("draw");
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
                play = !(R.eight && c.rank === 8 && p.hand.length > 3);
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
      return [...P].sort((a, b) => a.hand.length - b.hand.length).map((p) => ({ player: p, note: `残り${p.hand.length}枚`, key: p.hand.length }));
    }
    return [{ player: winner, note: "あがり" }, ...rest.map((p) => ({ player: p, note: `残り${p.hand.length}枚`, key: p.hand.length }))];
  },
});
