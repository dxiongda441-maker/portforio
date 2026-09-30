"use strict";

/* ポーカー（5カードドロー・チップ制） */
(() => {
  const HAND_NAMES = ["ハイカード", "ワンペア", "ツーペア", "スリーカード", "ストレート", "フラッシュ", "フルハウス", "フォーカード", "ストレートフラッシュ"];
  const val = (c) => (c.rank === 1 ? 14 : c.rank);

  /** 役を判定し、比較用の配列 score を返す（辞書順で大きいほど強い） */
  function evaluate(cards) {
    const vals = cards.map(val).sort((a, b) => b - a);
    const counts = new Map();
    for (const v of vals) counts.set(v, (counts.get(v) || 0) + 1);
    const groups = [...counts].sort((a, b) => b[1] - a[1] || b[0] - a[0]);
    const flush = cards.every((c) => c.suit === cards[0].suit);
    const uniq = [...new Set(vals)];
    let straight = 0;
    if (uniq.length === 5) {
      if (uniq[0] - uniq[4] === 4) straight = uniq[0];
      else if (uniq.join() === "14,5,4,3,2") straight = 5;
    }
    let cat;
    let tie = groups.map((g) => g[0]);
    if (straight && flush) {
      cat = 8;
      tie = [straight];
    } else if (groups[0][1] === 4) cat = 7;
    else if (groups[0][1] === 3 && groups[1][1] === 2) cat = 6;
    else if (flush) {
      cat = 5;
      tie = vals;
    } else if (straight) {
      cat = 4;
      tie = [straight];
    } else if (groups[0][1] === 3) cat = 3;
    else if (groups[0][1] === 2 && groups[1][1] === 2) cat = 2;
    else if (groups[0][1] === 2) cat = 1;
    else cat = 0;
    const name = cat === 8 && straight === 14 ? "ロイヤルストレートフラッシュ" : HAND_NAMES[cat];
    return { cat, score: [cat, ...tie], name, top: groups[0][0] };
  }

  function compare(a, b) {
    for (let i = 0; i < Math.max(a.length, b.length); i += 1) {
      const d = (a[i] || 0) - (b[i] || 0);
      if (d) return d;
    }
    return 0;
  }

  /** CPUが交換するカードを選ぶ */
  function cpuDiscards(hand) {
    const ev = evaluate(hand);
    if (ev.cat >= 4 && ev.cat !== 7) return [];
    const counts = new Map();
    for (const c of hand) counts.set(val(c), (counts.get(val(c)) || 0) + 1);
    if (ev.cat >= 1) return hand.filter((c) => counts.get(val(c)) === 1);
    // フラッシュ・ストレートまであと1枚
    for (const suit of SUITS) {
      const same = hand.filter((c) => c.suit === suit);
      if (same.length === 4) return hand.filter((c) => c.suit !== suit);
    }
    for (const c of hand) {
      const rest = hand.filter((x) => x !== c).map(val);
      const u = new Set(rest);
      const sorted = [...u].sort((a, b) => a - b);
      if (u.size === 4 && sorted[3] - sorted[0] <= 4) return [c];
    }
    const sorted = [...hand].sort((a, b) => val(b) - val(a));
    return sorted.slice(val(sorted[0]) >= 13 ? 1 : 2);
  }

  function strength(hand, drawn) {
    const ev = evaluate(hand);
    if (!drawn) {
      if (ev.cat >= 2) return 3;
      if (ev.cat === 1) return ev.top >= 11 ? 2 : 1;
      const suits = SUITS.map((s) => hand.filter((c) => c.suit === s).length);
      return Math.max(...suits) === 4 ? 1 : 0;
    }
    if (ev.cat >= 3) return 3;
    if (ev.cat === 2) return 2.5;
    if (ev.cat === 1) return ev.top >= 10 ? 2 : 1;
    return 0;
  }

  registerGame({
    id: "poker",
    title: "ポーカー",
    mark: "♠",
    tone: "navy",
    tagline: "役をそろえてチップを奪い合う",
    players: [2, 6],
    defaultPlayers: 4,
    levels: true,
    logic: { evaluate, compare, cpuDiscards },
    options: [
      { key: "hands", label: "ゲーム数", choices: [[5, "5ゲーム"], [10, "10ゲーム"], [15, "15ゲーム"]], default: 5 },
      { key: "chips", label: "最初のチップ", choices: [[100, "100枚"], [200, "200枚"]], default: 100 },
    ],
    rules: `
      <p>5枚の手札で役を作る「5カードドロー」です。チップを一番多く持っていた人の勝ち。</p>
      <ol>
        <li>全員が参加料（アンティ）5枚を出し、5枚ずつ配ります。</li>
        <li><b>1回目の賭け</b>: チェック（賭けずに回す）/ ベット・レイズ（10枚上乗せ）/ コール（同額を出す）/ フォールド（降りる）。</li>
        <li><b>カード交換</b>: いらないカードを好きな枚数（0〜5枚）捨てて、同じ枚数を引きます。</li>
        <li><b>2回目の賭け</b>: 上乗せは20枚。1回の賭けで上乗せできるのは3回まで。</li>
        <li><b>ショーダウン</b>: 残った人で手札を見せ合い、一番強い役の人がポット（賭けたチップ）をもらいます。</li>
      </ol>
      <p>役の強さ（弱い順）: ハイカード &lt; ワンペア &lt; ツーペア &lt; スリーカード &lt; ストレート（連番）&lt; フラッシュ（同じマーク）&lt; フルハウス（3枚＋2枚）&lt; フォーカード &lt; ストレートフラッシュ。A は一番強く、A-2-3-4-5 のストレートにも使えます。</p>
      <p>チップが足りないときは持っている分だけで勝負（オールイン）できます。チップが0枚になった人はそこで終了です。</p>
    `,

    async play(s) {
      const P = s.players;
      const n = P.length;
      const ANTE = 5;
      for (const p of P) {
        p.chips = s.options.chips;
        p.folded = false;
        p.contrib = 0;
        p.roundBet = 0;
      }
      let dealer = Math.floor(Math.random() * n);
      let deck = [];
      let discardPile = [];
      let turnPlayer = null;
      let phase = "";
      let showdown = false;
      let sel = new Set();
      let selecting = false;
      let results = new Map();
      let handNo = 0;
      let refresh = () => {};

      const pot = () => P.reduce((sum, p) => sum + p.contrib, 0);
      const contenders = () => P.filter((p) => p.inHand && !p.folded);

      function draw(count) {
        const out = [];
        for (let i = 0; i < count; i += 1) {
          if (!deck.length) {
            deck = shuffle(discardPile);
            discardPile = [];
          }
          out.push(deck.pop());
        }
        return out;
      }

      function pay(p, amount) {
        const paid = Math.min(amount, p.chips);
        p.chips -= paid;
        p.contrib += paid;
        p.roundBet += paid;
        return paid;
      }

      function render() {
        const info = (p) => {
          const parts = [`<span class="pts">🪙${p.chips}</span>`];
          if (!p.inHand) parts.push(`<span class="badge muted-badge">${p.chips <= 0 ? "チップなし" : "不参加"}</span>`);
          else if (p.folded) parts.push(`<span class="badge muted-badge">フォールド</span>`);
          else if (p.inHand && p.chips === 0) parts.push(`<span class="badge red">オールイン</span>`);
          if (p.roundBet) parts.push(`<span class="badge">賭け ${p.roundBet}</span>`);
          if (showdown && results.has(p)) parts.push(`<span class="badge gold">${results.get(p)}</span>`);
          return parts.join(" ");
        };
        const faceUp = (p) => (showdown && p.inHand && !p.folded) || (s.watching && p.inHand) ? p.hand : null;
        const center = h(
          "div",
          { class: "center-info" },
          h("p", { class: "center-label", text: `第${handNo}ゲーム ${phase}` }),
          h("div", { class: "pot" }, h("span", { text: "ポット" }), h("strong", { text: `🪙 ${pot()}` })),
        );
        const me = s.viewer;
        let bottom = null;
        if (me && me.inHand) {
          bottom = s.hand(me.hand, {
            selected: sel,
            onClick: selecting
              ? (card) => {
                  if (sel.has(card)) sel.delete(card);
                  else sel.add(card);
                  render();
                  refresh();
                }
              : null,
          });
        }
        const myHand = me && me.inHand ? evaluate(me.hand).name : "";
        s.layout({
          top: s.seats({ current: turnPlayer, info, out: (p) => !p.inHand || p.folded, faceUp, count: (p) => (p.inHand ? p.hand.length : 0) }),
          center,
          bottom,
          bottomTitle: me ? `${me.name}の手札 ${myHand ? `― ${myHand}` : ""}　🪙${me.chips}` : undefined,
        });
      }
      s.renderFn = render;

      /** CPUの賭け方。強さ設定で性格が変わる */
      function cpuBet(p, toCall, canRaise, size) {
        const st = strength(p.hand, phase.includes("2回目"));
        const r = Math.random();
        const level = s.options.level || "normal";
        if (level === "easy") {
          // 何でもついてくるが、あまり上乗せしない
          if (st >= 2.5 && canRaise && r < 0.4) return "raise";
          if (toCall === 0) return "call";
          return st >= 1 || r < 0.55 ? "call" : "fold";
        }
        if (level === "hard") {
          const odds = toCall / (pot() + toCall || 1);
          if (st >= 2.5) return canRaise && r < 0.9 ? "raise" : "call";
          if (st >= 2) return toCall === 0 ? (canRaise && r < 0.55 ? "raise" : "call") : odds > 0.4 && r < 0.3 ? "fold" : "call";
          if (st >= 1) return toCall === 0 ? (canRaise && r < 0.12 ? "raise" : "call") : odds <= 0.28 ? "call" : "fold";
          if (toCall === 0) return canRaise && contenders().length <= 3 && r < 0.14 ? "raise" : "call"; // ときどきブラフ
          return odds < 0.12 && r < 0.35 ? "call" : "fold";
        }
        if (st >= 2.5) return canRaise && r < 0.8 ? "raise" : "call";
        if (st >= 2) return toCall === 0 ? (canRaise && r < 0.45 ? "raise" : "call") : toCall > p.chips * 0.6 && r < 0.4 ? "fold" : "call";
        if (st >= 1) return toCall === 0 ? (canRaise && r < 0.15 ? "raise" : "call") : toCall <= size && r < 0.7 ? "call" : "fold";
        return toCall === 0 ? (canRaise && r < 0.08 ? "raise" : "call") : r < 0.12 ? "call" : "fold";
      }

      async function bettingRound(size) {
        for (const p of P) p.roundBet = 0;
        let currentBet = 0;
        let raises = 0;
        const canAct = (p) => p.inHand && !p.folded && p.chips > 0;
        if (P.filter(canAct).length < 2) return;
        let toAct = new Set(P.filter(canAct));
        let idx = (dealer + 1) % n;
        while (toAct.size && contenders().length > 1) {
          const p = P[idx];
          idx = (idx + 1) % n;
          if (!toAct.has(p)) continue;
          toAct.delete(p);
          if (!canAct(p)) continue;
          const toCall = currentBet - p.roundBet;
          const others = P.filter((q) => q !== p && canAct(q));
          const canRaise = raises < 3 && p.chips > toCall && others.length > 0;
          turnPlayer = p;
          render();
          let action;
          if (p.human) {
            await s.handoff(p);
            s.yourTurn(p);
            const callLabel = toCall === 0 ? "チェック" : p.chips <= toCall ? `オールイン（${p.chips}）` : `コール（${toCall}）`;
            const raiseLabel = toCall === 0 ? `ベット（${size}）` : `レイズ（+${size}）`;
            const list = [{ label: callLabel, value: "call", primary: true }];
            if (canRaise) list.push({ label: raiseLabel, value: "raise" });
            if (toCall > 0) list.push({ label: "フォールド", value: "fold", danger: true });
            action = await s.choose(list, toCall ? `${toCall}枚でコールできます（ポット ${pot()}）` : "チェックかベットを選んでください");
          } else {
            s.note(`${p.name}が考えています…`);
            await s.sleep(700);
            action = cpuBet(p, toCall, canRaise, size);
          }
          if (action !== "fold" && (toCall > 0 || action === "raise")) s.sfx("draw");
          if (action === "fold") {
            p.folded = true;
            s.say(`${p.name}: フォールド`);
          } else if (action === "raise") {
            pay(p, toCall + size);
            const before = currentBet;
            currentBet = Math.max(currentBet, p.roundBet);
            if (currentBet > before) {
              raises += 1;
              toAct = new Set(P.filter((q) => q !== p && canAct(q)));
              s.say(`${p.name}: ${before === 0 ? "ベット" : "レイズ"}（${p.roundBet}）${p.chips === 0 ? " オールイン！" : ""}`);
            } else {
              s.say(`${p.name}: コール（オールイン ${p.roundBet}）`);
            }
          } else {
            const paid = pay(p, toCall);
            s.say(`${p.name}: ${toCall === 0 ? "チェック" : `コール（${paid}）`}${p.chips === 0 && toCall > 0 ? " オールイン！" : ""}`);
          }
          if (p.human) s.conceal();
          render();
          await s.sleep(350);
        }
        turnPlayer = null;
      }

      async function drawPhase() {
        let idx = (dealer + 1) % n;
        for (let step = 0; step < n; step += 1, idx = (idx + 1) % n) {
          const p = P[idx];
          if (!p.inHand || p.folded) continue;
          turnPlayer = p;
          render();
          let discards;
          if (p.human) {
            await s.handoff(p);
            s.yourTurn(p);
            sel = new Set();
            selecting = true;
            refresh = () =>
              s.actions([
                { label: sel.size ? `${sel.size}枚交換する` : "交換しない", value: "ok", primary: true },
                { label: "おすすめを選ぶ", value: "hint" },
              ]);
            s.note("交換したいカードをタップしてください");
            render();
            for (;;) {
              refresh();
              const v = await s.ask();
              if (v === "ok") break;
              sel = new Set(cpuDiscards(p.hand));
              render();
            }
            selecting = false;
            s.actions([]);
            discards = [...sel];
            sel = new Set();
          } else {
            await s.sleep(600);
            discards = cpuDiscards(p.hand);
          }
          takeOut(p.hand, discards);
          discardPile.push(...discards);
          const got = draw(discards.length);
          if (got.length) s.sfx("card");
          p.hand.push(...got);
          p.hand.sort((a, b) => val(a) - val(b));
          s.say(`${p.name}: ${discards.length}枚交換${s.isViewer(p) && got.length ? `（${cardNames(got)} を引いた）` : ""}`);
          render();
          await s.sleep(p.human ? 1000 : 400);
          if (p.human) s.conceal();
        }
        turnPlayer = null;
      }

      function distribute() {
        const live = contenders();
        const evals = new Map(live.map((p) => [p, evaluate(p.hand)]));
        const levels = [...new Set(P.map((p) => p.contrib).filter((c) => c > 0))].sort((a, b) => a - b);
        const won = new Map();
        let prev = 0;
        for (const level of levels) {
          let amount = 0;
          for (const p of P) amount += Math.min(p.contrib, level) - Math.min(p.contrib, prev);
          prev = level;
          let eligible = live.filter((p) => p.contrib >= level);
          if (!eligible.length) eligible = live;
          let best = [];
          for (const p of eligible) {
            if (!best.length) best = [p];
            else {
              const d = compare(evals.get(p).score, evals.get(best[0]).score);
              if (d > 0) best = [p];
              else if (d === 0) best.push(p);
            }
          }
          const share = Math.floor(amount / best.length);
          best.forEach((p, i) => won.set(p, (won.get(p) || 0) + share + (i === 0 ? amount - share * best.length : 0)));
        }
        for (const [p, amount] of won) p.chips += amount;
        return { won, evals };
      }

      for (handNo = 1; handNo <= s.options.hands; handNo += 1) {
        const seated = P.filter((p) => p.chips > 0);
        if (seated.length < 2) break;
        deck = shuffle(makeDeck());
        discardPile = [];
        showdown = false;
        results = new Map();
        for (const p of P) {
          p.inHand = p.chips > 0;
          p.folded = false;
          p.contrib = 0;
          p.roundBet = 0;
          p.hand = p.inHand ? draw(5).sort((a, b) => val(a) - val(b)) : [];
        }
        while (!P[dealer].inHand) dealer = (dealer + 1) % n;
        for (const p of seated) pay(p, ANTE);
        for (const p of P) p.roundBet = 0;
        phase = "― 1回目の賭け";
        s.say(`――― 第${handNo}ゲーム（親: ${P[dealer].name}）―――`);
        render();
        await s.sleep(600);

        await bettingRound(10);
        if (contenders().length > 1) {
          phase = "― カード交換";
          await drawPhase();
          phase = "― 2回目の賭け";
          await bettingRound(20);
        }
        for (const p of P) p.roundBet = 0;

        phase = "― 結果";
        const live = contenders();
        if (live.length === 1) {
          const total = pot();
          live[0].chips += total;
          s.say(`${live[0].name}以外が降りたので、${live[0].name}がポット ${total} を獲得`);
        } else {
          showdown = true;
          s.conceal();
          const { won, evals } = distribute();
          for (const p of live) results.set(p, evals.get(p).name);
          s.sfx([...won].some(([p, amount]) => amount > 0 && p.human) ? "good" : "card");
          for (const p of live) s.log(`${p.name}: ${evals.get(p).name}（${cardNames(p.hand)}）`);
          s.say(
            [...won]
              .filter(([, amount]) => amount > 0)
              .map(([p, amount]) => `${p.name}が ${evals.get(p).name} で ${amount} 獲得`)
              .join(" / "),
          );
        }
        for (const p of P) p.contrib = 0;
        render();
        if (s.humans.length) {
          await s.choose([{ label: handNo < s.options.hands ? "次のゲームへ" : "結果を見る", value: "next", primary: true }]);
        } else {
          await s.sleep(1500);
        }
        dealer = (dealer + 1) % n;
      }

      return [...P].sort((a, b) => b.chips - a.chips).map((p) => ({ player: p, note: `チップ ${p.chips}枚`, key: p.chips }));
    },
  });
})();
