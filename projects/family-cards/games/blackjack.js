"use strict";

/* ブラックジャック（ディーラーはコンピューター） */
(() => {
  function total(cards) {
    let sum = 0;
    let aces = 0;
    for (const c of cards) {
      if (c.rank === 1) aces += 1;
      sum += Math.min(c.rank, 10);
    }
    const soft = aces > 0 && sum + 10 <= 21;
    return { value: soft ? sum + 10 : sum, soft };
  }
  const isBJ = (cards) => cards.length === 2 && total(cards).value === 21;

  registerGame({
    id: "blackjack",
    title: "ブラックジャック",
    mark: "21",
    tone: "navy",
    tagline: "21をこえないように、ディーラーより大きく",
    players: [1, 6],
    defaultPlayers: 3,
    options: [
      { key: "rounds", label: "ラウンド数", choices: [[5, "5回"], [10, "10回"], [15, "15回"]], default: 5 },
      { key: "chips", label: "最初のチップ", choices: [[100, "100枚"], [200, "200枚"]], default: 100 },
    ],
    rules: `
      <p>みんなでディーラー（コンピューター）と勝負します。カードの合計を21に近づけましょう。</p>
      <ul>
        <li>2〜10はそのままの数、J・Q・K は10、A は1か11の都合のいい方。</li>
        <li>最初の2枚で21（A と10点札）は <b>ブラックジャック</b>。賭けの1.5倍もらえます。</li>
      </ul>
      <ol>
        <li>最初にチップを賭けて、2枚ずつ配ります。ディーラーは1枚だけ表向き。</li>
        <li><b>ヒット</b>: もう1枚引く。<b>スタンド</b>: 今の合計で止める。<b>ダブル</b>: 最初の2枚のときだけ、賭けを2倍にして1枚だけ引く。</li>
        <li>21をこえたらバーストで負け。</li>
        <li>ディーラーは17以上になるまで引きます。ディーラーがバーストするか、ディーラーより大きければ勝ち（賭けと同額をもらえる）。同じなら引き分け。</li>
      </ol>
      <p>全ラウンド終了時に、チップを一番多く持っている人の勝ちです。</p>
    `,

    async play(s) {
      const P = s.players;
      const dealer = { name: "ディーラー", hand: [] };
      let shoe = shuffle(makeDeck({ decks: 4 }));
      let reveal = false;
      let turnPlayer = null;
      let round = 0;
      for (const p of P) {
        p.chips = s.options.chips;
        p.bet = 0;
        p.result = "";
      }
      const draw = () => {
        if (shoe.length < 15) {
          shoe = shuffle(makeDeck({ decks: 4 }));
          s.log("カードを混ぜ直しました");
        }
        return shoe.pop();
      };

      function render() {
        const dealerTotal = total(dealer.hand).value;
        const dealerBox = h(
          "div",
          { class: "bj-dealer" },
          h("p", { class: "center-label", text: reveal ? `ディーラー: ${dealerTotal}` : `ディーラー（第${round}ラウンド）` }),
          h(
            "div",
            { class: "pile-row" },
            dealer.hand.map((c, i) => cardEl(c, { faceDown: i === 1 && !reveal })),
          ),
        );
        const table = h("div", { class: "bj-players" });
        for (const p of P) {
          const t = total(p.hand);
          table.append(
            h(
              "div",
              { class: `bj-seat${turnPlayer === p ? " turn" : ""}${p.chips <= 0 && !p.bet ? " out" : ""}` },
              h(
                "div",
                { class: "seat-name" },
                h("span", { class: "seat-icon", text: p.human ? "人" : "C" }),
                p.name,
                h("span", { class: "pts", text: `🪙${p.chips}` }),
              ),
              h("div", { class: "pile-row" }, p.hand.map((c) => cardEl(c, { size: "sm" }))),
              h(
                "div",
                { class: "seat-info" },
                p.hand.length ? h("span", { class: "badge", text: `${t.soft ? "ソフト" : ""}${t.value}` }) : null,
                p.bet ? h("span", { class: "badge", text: `賭け ${p.bet}` }) : null,
                p.result ? h("span", { class: `badge ${p.result.includes("勝") || p.result.includes("BJ") ? "gold" : p.result.includes("負") || p.result.includes("バースト") ? "red" : "muted-badge"}`, text: p.result }) : null,
              ),
            ),
          );
        }
        s.layout({ center: h("div", { class: "bj-table" }, dealerBox, table) });
      }
      s.renderFn = render;

      for (round = 1; round <= s.options.rounds; round += 1) {
        const seated = P.filter((p) => p.chips > 0);
        if (!seated.length) break;
        dealer.hand = [];
        reveal = false;
        for (const p of P) {
          p.hand = [];
          p.bet = 0;
          p.result = "";
        }
        s.say(`――― 第${round}ラウンド ―――`);
        render();

        // 賭け
        for (const p of seated) {
          turnPlayer = p;
          render();
          let bet;
          if (p.human) {
            const choices = [10, 20, 50].filter((v) => v <= p.chips);
            const list = choices.map((v, i) => ({ label: `${v}枚`, value: v, primary: i === 0 }));
            if (!choices.includes(p.chips)) list.push({ label: `全部（${p.chips}）`, value: p.chips });
            bet = await s.choose(list, `${p.name}: いくら賭けますか？（持ち ${p.chips}枚）`);
          } else {
            await s.sleep(300);
            bet = Math.min(p.chips, pickRandom([10, 10, 20, 20, 30]));
          }
          p.chips -= bet;
          p.bet = bet;
          s.log(`${p.name}: ${bet}枚賭けた`);
        }
        turnPlayer = null;

        // 配る
        for (let k = 0; k < 2; k += 1) {
          for (const p of seated) {
            p.hand.push(draw());
            render();
            await s.sleep(160);
          }
          dealer.hand.push(draw());
          render();
          await s.sleep(160);
        }

        const dealerBJ = isBJ(dealer.hand);
        if (dealerBJ) {
          reveal = true;
          s.say("ディーラーがブラックジャック！");
          render();
          await s.sleep(900);
        } else {
          for (const p of seated) {
            turnPlayer = p;
            if (isBJ(p.hand)) {
              p.result = "BJ!";
              s.say(`${p.name}: ブラックジャック！`);
              render();
              await s.sleep(700);
              continue;
            }
            for (;;) {
              const t = total(p.hand);
              render();
              if (t.value >= 21) break;
              const canDouble = p.hand.length === 2 && p.chips >= p.bet;
              let action;
              if (p.human) {
                const list = [
                  { label: "ヒット", value: "hit", primary: true },
                  { label: "スタンド", value: "stand" },
                ];
                if (canDouble) list.push({ label: `ダブル（+${p.bet}）`, value: "double" });
                action = await s.choose(list, `${p.name}: いま ${t.value}。どうする？`);
              } else {
                s.note(`${p.name}が考えています…`);
                await s.sleep(600);
                const upVal = dealer.hand[0].rank === 1 ? 11 : Math.min(dealer.hand[0].rank, 10);
                if (canDouble && !t.soft && (t.value === 11 || (t.value === 10 && upVal <= 9))) action = "double";
                else if (t.soft) action = t.value <= 17 ? "hit" : "stand";
                else if (t.value <= 11) action = "hit";
                else if (t.value <= 16) action = upVal >= 7 ? "hit" : t.value === 12 && upVal <= 3 ? "hit" : "stand";
                else action = "stand";
              }
              if (action === "stand") {
                s.log(`${p.name}: スタンド（${t.value}）`);
                break;
              }
              if (action === "double") {
                p.chips -= p.bet;
                p.bet *= 2;
                const c = draw();
                p.hand.push(c);
                s.say(`${p.name}: ダブル！ ${cardName(c)} を引いて ${total(p.hand).value}`);
                render();
                await s.sleep(500);
                break;
              }
              const c = draw();
              p.hand.push(c);
              s.say(`${p.name}: ヒット → ${cardName(c)}（${total(p.hand).value}）`);
            }
            if (total(p.hand).value > 21) {
              p.result = "バースト";
              s.say(`${p.name}: バースト…`);
            }
            render();
            await s.sleep(500);
          }
          turnPlayer = null;

          // ディーラー
          reveal = true;
          s.note(`ディーラーの伏せ札は ${cardName(dealer.hand[1])}`);
          render();
          await s.sleep(900);
          const anyAlive = seated.some((p) => total(p.hand).value <= 21 && !isBJ(p.hand));
          while (anyAlive && total(dealer.hand).value < 17) {
            const c = draw();
            dealer.hand.push(c);
            s.note(`ディーラー: ${cardName(c)} を引いて ${total(dealer.hand).value}`);
            render();
            await s.sleep(800);
          }
        }

        // 精算
        const d = total(dealer.hand).value;
        for (const p of seated) {
          const t = total(p.hand).value;
          const bj = isBJ(p.hand);
          if (dealerBJ) {
            if (bj) {
              p.chips += p.bet;
              p.result = "引き分け";
            } else p.result = "負け";
          } else if (bj) {
            p.chips += p.bet + Math.floor(p.bet * 1.5);
            p.result = `BJ 勝ち +${Math.floor(p.bet * 1.5)}`;
          } else if (t > 21) {
            p.result = "バースト 負け";
          } else if (d > 21 || t > d) {
            p.chips += p.bet * 2;
            p.result = `勝ち +${p.bet}`;
          } else if (t === d) {
            p.chips += p.bet;
            p.result = "引き分け";
          } else {
            p.result = "負け";
          }
        }
        s.say(`ディーラー ${d > 21 ? "バースト" : d}。${seated.map((p) => `${p.name} ${p.result}`).join(" / ")}`);
        for (const p of P) p.bet = 0;
        render();
        if (s.humans.length) {
          await s.choose([{ label: round < s.options.rounds ? "次のラウンドへ" : "結果を見る", value: "next", primary: true }]);
        } else {
          await s.sleep(1400);
        }
      }

      return [...P].sort((a, b) => b.chips - a.chips).map((p) => ({ player: p, note: `チップ ${p.chips}枚` }));
    },
  });
})();
