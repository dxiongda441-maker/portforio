"use strict";

/* ハイ＆ロー */
registerGame({
  id: "highlow",
  title: "ハイ＆ロー",
  mark: "↕",
  tone: "purple",
  tagline: "次のカードは大きい？小さい？ 小さい子もすぐ遊べる",
  players: [1, 6],
  defaultPlayers: 3,
  options: [
    { key: "goal", label: "目標ポイント", choices: [[5, "5点"], [10, "10点"], [15, "15点"]], default: 10 },
  ],
  rules: `
    <ol>
      <li>表になっているカードを見て、次のカードが<b>ハイ（大きい）</b>か<b>ロー（小さい）</b>かを当てます。A が一番小さく、K が一番大きい数字です。</li>
      <li>当たると連続記録が1つ増え、続けて挑戦できます。</li>
      <li>好きなところで <b>ストップ</b> すると、連続記録がそのままポイントになります。</li>
      <li>はずれると、その番の連続記録は0になって次の人へ。同じ数字が出たときはセーフで、もう一度予想できます。</li>
      <li>先に目標ポイントに届いた人の勝ち（その周の最後まで遊んで決着）。</li>
    </ol>
  `,

  async play(s) {
    const P = s.players;
    const goal = s.options.goal;
    let deck = shuffle(makeDeck());
    let currentCard = deck.pop();
    let nextCard = null;
    let turnPlayer = null;
    let streak = 0;
    for (const p of P) p.score = 0;

    const draw = () => {
      if (!deck.length) {
        deck = shuffle(makeDeck());
        s.log("カードを混ぜ直しました");
      }
      return deck.pop();
    };

    function render() {
      const info = (p) => `<span class="pts">${p.score}点</span>${p === turnPlayer && streak ? ` <span class="badge gold">連続 ${streak}</span>` : ""}`;
      const center = h(
        "div",
        { class: "center-info" },
        h(
          "div",
          { class: "pile-row hl-row" },
          cardEl(currentCard, { size: "xl" }),
          h("span", { class: "hl-arrow", text: "→" }),
          nextCard ? cardEl(nextCard, { size: "xl", fresh: true }) : cardEl(null, { size: "xl" }),
        ),
        h("p", { class: "center-label", text: `目標 ${goal}点 ／ いまの連続: ${streak}` }),
      );
      s.layout({ top: s.seats({ players: P, current: turnPlayer, info, count: () => null, faceUp: () => null }), center });
    }
    s.renderFn = render;

    let round = 0;
    let done = false;
    while (!done) {
      round += 1;
      for (const p of P) {
        turnPlayer = p;
        streak = 0;
        nextCard = null;
        s.say(`${p.name}の番（${p.score}点）`);
        render();
        for (;;) {
          let choice;
          if (p.human) {
            const list = [
              { label: "ハイ ↑", value: "high", primary: true },
              { label: "ロー ↓", value: "low", primary: true },
            ];
            if (streak > 0) list.push({ label: `ストップ（+${streak}点）`, value: "stop" });
            if (streak === 0) s.yourTurn(p);
            choice = await s.choose(list, `${p.name}: 次は ${RANK_LABEL[currentCard.rank]} より大きい？小さい？`);
          } else {
            await s.sleep(700);
            const r = currentCard.rank;
            const safe = Math.max(r - 1, 13 - r) / 12; // 当たりやすさの目安
            if (streak > 0 && (p.score + streak >= goal || streak >= 4 || (safe < 0.62 && streak >= 2) || (safe < 0.55 && streak >= 1))) choice = "stop";
            else choice = r < 7 ? "high" : r > 7 ? "low" : pickRandom(["high", "low"]);
          }
          if (choice === "stop") {
            p.score += streak;
            s.say(`${p.name}: ストップ！ ${streak}点ゲット（合計${p.score}点）`);
            streak = 0;
            break;
          }
          nextCard = draw();
          s.sfx("card");
          render();
          await s.sleep(700);
          const diff = nextCard.rank - currentCard.rank;
          const label = choice === "high" ? "ハイ" : "ロー";
          currentCard = nextCard;
          nextCard = null;
          if (diff === 0) {
            s.note(`${p.name}: ${label} → 同じ数字！ セーフ`);
          } else if ((diff > 0) === (choice === "high")) {
            streak += 1;
            s.sfx("good");
            s.note(`${p.name}: ${label} → 当たり！ 連続 ${streak}`);
          } else {
            s.sfx("bad");
            s.say(`${p.name}: ${label} → はずれ… ${streak ? `連続${streak}は消えました` : ""}`);
            streak = 0;
            render();
            await s.sleep(900);
            break;
          }
          render();
          await s.sleep(300);
        }
        render();
        await s.sleep(500);
      }
      if (P.some((p) => p.score >= goal)) done = true;
      else if (round >= 50) done = true;
    }
    turnPlayer = null;
    render();
    return [...P].sort((a, b) => b.score - a.score).map((p) => ({ player: p, note: `${p.score}点`, key: p.score }));
  },
});
