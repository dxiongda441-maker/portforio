/* 3年目の分かれ道 — 実績をつくる12週間
 * 依存なし・ビルドなし。DOM は textContent で組み立て、innerHTML は使わない（利用者の入力を扱うため）。
 */
(() => {
  "use strict";

  const STORAGE_KEY = "sannen-quest-v1"; // 全作品が同一オリジン。ほかの作品と被らない名前にする
  const WEEKS = 12;
  const MAX = 10;

  // ---------- 保存（失敗しても遊べるようにする） ----------
  function loadStore() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const data = raw ? JSON.parse(raw) : {};
      return data && typeof data === "object" ? data : {};
    } catch (_) {
      return {};
    }
  }
  function saveStore() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
    } catch (_) { /* 保存できない環境でも続行 */ }
  }
  const store = loadStore();
  if (!Array.isArray(store.mine)) store.mine = [];
  store.mine = store.mine.filter((x) => x && typeof x.text === "string").slice(0, 200);
  if (!Array.isArray(store.endings)) store.endings = [];

  // ---------- DOM ヘルパー ----------
  function h(tag, attrs, ...children) {
    const el = document.createElement(tag);
    if (attrs) {
      for (const [k, v] of Object.entries(attrs)) {
        if (v === false || v == null) continue;
        if (k === "class") el.className = v;
        else if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
        else if (k === "html") throw new Error("innerHTML は使わない");
        else el.setAttribute(k, v === true ? "" : v);
      }
    }
    for (const c of children.flat()) {
      if (c == null || c === false) continue;
      el.append(c instanceof Node ? c : document.createTextNode(String(c)));
    }
    return el;
  }
  const app = document.getElementById("app");
  const modal = document.getElementById("modal");
  function mount(...nodes) {
    app.replaceChildren(...nodes);
    window.scrollTo(0, 0);
  }
  function toast(msg) {
    const t = h("div", { class: "toast", role: "status" }, msg);
    document.body.append(t);
    setTimeout(() => t.remove(), 2200);
  }
  const shuffle = (arr) => {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };
  const clamp = (n) => Math.max(0, Math.min(MAX, n));

  // ---------- 成果の「種」（記録すると実績になる） ----------
  // 選択肢の s: 1 = やったことの羅列 / 2 = 結果はあるが数字か手段が欠ける / 3 = 工夫＋Before→After の数字
  const SEEDS = {
    stretch: [
      {
        label: "他部署との調整役を引き受けた",
        options: [
          { t: "他部署との調整業務を担当した。", s: 1, why: "「担当した」だけでは、何が良くなったのかが読み手に伝わらない。" },
          { t: "他部署との連携強化に向けて調整役を務め、部署間のやり取りを大きく改善し、業務の円滑化に貢献した。", s: 2, why: "結果らしい言葉はあるが「大きく」「円滑化」は主観。確かめようがない。" },
          { t: "部署間の週次定例を立ち上げ、問い合わせの往復を月40件→15件に減らした。", s: 3, why: "自分の打ち手（定例の立ち上げ）と、Before→After の数字がそろっている。" },
        ],
      },
      {
        label: "新人の教育係を任された",
        options: [
          { t: "新人2名のOJTを担当した。", s: 1, why: "役割は分かるが、成果がない。" },
          { t: "手順書とチェックリストを作り、新人が独り立ちするまでを3か月→6週間に縮めた。", s: 3, why: "工夫（手順書）と期間の短縮が数字で示されている。" },
          { t: "新人教育に熱心に取り組み、丁寧な指導が評価されて、チームの育成体制の強化に大きく貢献した。", s: 2, why: "評価されたことは伝わるが、何をしてどう変わったかが無い。" },
        ],
      },
      {
        label: "先輩の提案資料の一部を任された",
        options: [
          { t: "顧客向け提案資料のうち、費用対効果の試算ページを担当し、根拠のある提案づくりに積極的に取り組んだ。", s: 2, why: "担当範囲は具体的。ただ、その結果どうなったかが書けていない。" },
          { t: "提案資料の作成に携わった。", s: 1, why: "「携わった」は関わり方が分からない言葉の代表例。" },
          { t: "費用対効果の試算ページを作り、提案の受注（年間120万円）に貢献。以降チームのひな形として使われている。", s: 3, why: "担当範囲・結果の金額・その後の広がりまで書けている。" },
        ],
      },
      {
        label: "新しい案件のサブ担当になった",
        options: [
          { t: "新規案件のサブ担当として、進捗表を作り週次で共有。納期遅れを0件に抑えた。", s: 3, why: "役割・打ち手・結果がそろっている。" },
          { t: "新規案件にサブ担当として参加した。", s: 1, why: "参加した事実だけ。" },
          { t: "新規案件でリーダーを支え、メンバー間の調整や資料作成など幅広い業務を担い、プロジェクトを成功に導いた。", s: 2, why: "「成功」の中身が書かれていない。" },
        ],
      },
    ],
    ai: [
      {
        label: "週次レポートの集計を AI で自動化した",
        options: [
          { t: "生成AIを活用して業務を効率化した。", s: 1, why: "いま一番多い書き方。どの業務がどれだけ良くなったかが無いので差がつかない。" },
          { t: "週次レポートの集計を、生成AIで作った表計算の関数で自動化し、作業時間を週3時間→30分にした。", s: 3, why: "対象業務・手段・時間の Before→After がそろっている。" },
          { t: "週次レポートの集計を自動化する仕組みを生成AIで作り、チーム全体の作業時間を大幅に削減した。", s: 2, why: "惜しい。「大幅に」を数字に置き換えれば伝わる。" },
        ],
      },
      {
        label: "議事録づくりを AI で型にした",
        options: [
          { t: "会議の議事録を作成した。", s: 1, why: "通常業務の説明で、実績になっていない。" },
          { t: "AI 要約の型を作ってチームで共有し、議事録の作成を1回40分→10分、共有を当日中にそろえた。", s: 3, why: "自分だけでなくチームに広げた点まで書けている。" },
          { t: "生成AIを積極的に活用して議事録作成の効率化に取り組み、チームの生産性向上と情報共有の迅速化に貢献した。", s: 2, why: "方向は合っているが、数字が無い。" },
        ],
      },
      {
        label: "問い合わせ返信のひな形を AI で整えた",
        options: [
          { t: "よくある問い合わせ20種の返信ひな形を AI で下書きし、確認を経て整備。1件あたりの対応を15分→5分にした。", s: 3, why: "範囲（20種）・手順（人の確認を入れた）・結果がある。" },
          { t: "問い合わせ対応を改善した。", s: 1, why: "何をどう改善したのかが分からない。" },
          { t: "問い合わせ返信のひな形を整備し、対応スピードが大きく上がったと、社内外から好評を得ることができた。", s: 2, why: "評判は伝わるが、数字が無い。" },
        ],
      },
    ],
    event: {
      checklist: {
        label: "ミスの再発防止チェックリストを作った",
        options: [
          { t: "請求書の確認チェックリストを作り、チームで運用。同じ種類のミスを半年0件にした。", s: 3, why: "失敗を仕組みで止めた話は、評価でも面接でも強い。" },
          { t: "ミスを反省し、以後は注意して作業している。", s: 1, why: "気持ちの話で、仕組みが無い。" },
          { t: "ミスの原因を分析して再発防止策を作り、チーム内で共有することで、同様のミスを大きく減らした。", s: 2, why: "何を作って、どれだけ減ったかが無い。" },
        ],
      },
    },
  };

  // ---------- 週ごとの出来事 ----------
  // eff: { hp, growth, trust, market, moya, unlock, seed: "stretch"|"ai"|"checklist", apNext }
  const EVENTS = [
    {
      tag: "第1週・春",
      title: "3年目の春",
      text: "上司「今年も去年と同じ担当でよろしくね。もう慣れてるし安心だよ」",
      choices: [
        { t: "「はい、分かりました」とそのまま受ける", eff: { trust: 1, moya: 1 }, res: "安心した顔をされた。仕事は楽だが、どこか物足りない。",
          why: "慣れた仕事だけを続けると、成長している感覚は下がりやすい。2025年の調査では、辞めたい気持ちが強まるのは入社3年目だった。" },
        { t: "「同じ担当に加えて、新しいことを1つ任せてほしい」と伝える", eff: { unlock: true, moya: -1 }, res: "上司「お、いいね。考えておく」。背伸びの仕事に手を挙げやすくなった。",
          why: "成長に要るのは仕事の中身の負荷（新しい・少し難しい）で、人間関係の負荷ではない、という指摘がある。頼まれるのを待たずに自分から言うのが近道。" },
      ],
    },
    {
      tag: "第2週",
      title: "同期の転職報告",
      text: "同期が SNS で「転職しました！」と投稿していた。年収も上がったらしい。",
      choices: [
        { t: "焦って転職サイトに登録し、夜中まで求人を眺める", eff: { hp: -2, moya: 2 }, res: "眠れなかった。何をしたいのかは、結局分からないまま。",
          why: "人と比べて焦るだけでは、判断の材料は増えない。20代会社員の多くは、半年以上も辞めるかどうか迷っている。" },
        { t: "「辞めたい理由」と「残る理由」を紙に書き出す", eff: { moya: -2 }, res: "辞めたい理由の大半は「成長している実感がない」だった。なら、まず今の職場で試せることがある。",
          why: "迷いを言葉にすると、何を変えれば解決するのかが見える。辞めるかどうかは、それを試してから決めても遅くない。" },
        { t: "見なかったことにする", eff: { moya: 1 }, res: "考えないようにしたが、モヤモヤは残った。",
          why: "気持ちにふたをしても、迷いの原因は消えない。" },
      ],
    },
    {
      tag: "第3週",
      title: "いつもの議事録係",
      text: "「議事録、今回もお願いね」。気づけばずっと自分の担当になっている。",
      choices: [
        { t: "黙って今まで通り書く", eff: { trust: 1, hp: -1 }, res: "いつも通り1時間かかった。",
          why: "頼まれた仕事を丁寧にこなすと信頼は積み上がる。ただ、それだけでは実績にならない。" },
        { t: "AI で要約の型を作り、チームに共有してみる", eff: { growth: 1, seed: "ai" }, res: "10分で書けた。「これ便利だね」と先輩に言われた。成果を記録しておこう。",
          why: "AI を仕事で使う20代の約6割は、周りに言わずに使っているという調査がある。使って終わりにせず、改善として見える形にすると実績になる。" },
        { t: "「もう他の人に回してほしい」と断る", eff: { trust: -1 }, res: "少し気まずい空気になった。",
          why: "断ること自体は悪くない。ただ、代わりの案（型を作る・持ち回りにする）を出すと受け入れられやすい。" },
      ],
    },
    {
      tag: "第4週",
      title: "強めに叱られた",
      text: "上司「この資料、数字の根拠がないよね。これじゃ出せない」",
      choices: [
        { t: "謝ったうえで「直すべき点を1つ具体的に教えてください」と聞く", eff: { trust: 1, growth: 1 }, res: "「出典と計算式を1行添えて」と教わった。次から迷わずに済む。",
          why: "若い人ほど上司から叱られるとストレスが高まりやすいという調査がある。叱られた内容を「次に何をするか」1つに変えると、受け止めやすくなる。" },
        { t: "落ち込んで、週末もずっと考え続ける", eff: { hp: -2, moya: 2 }, res: "休んだ気がしないまま月曜になった。",
          why: "考え続けても、直す点は増えない。具体的な直し方を聞く方が早い。" },
        { t: "信頼できる先輩に話を聞いてもらう", eff: { hp: 1, moya: -1 }, res: "「自分も同じことを言われたよ」。少し気が楽になった。",
          why: "一人で抱えないことは大事。気持ちが落ち着いたら、直す点を1つ確認しておくとさらに良い。" },
      ],
    },
    {
      tag: "第5週",
      title: "「AIに仕事が奪われる」",
      text: "ニュース「生成AIの普及で、若手の採用が減る可能性」。自分の仕事は大丈夫だろうか。",
      choices: [
        { t: "不安になって、何も手につかない", eff: { moya: 2 }, res: "不安だけが大きくなった。",
          why: "AI を導入した企業で若手の採用が減ったという海外の研究はある。ただ、不安を減らすのは「自分で使ってみること」の方。" },
        { t: "自分の業務を書き出し、AI に任せられそうな作業を1つ試す", eff: { growth: 1, market: 1, seed: "ai" }, res: "問い合わせの返信の下書きが、かなり速くなった。確認は自分でやる。",
          why: "奪われるかどうかより、「AI で何を良くしたか」を語れる人になる方が強い。" },
        { t: "「自分は AI を使わない」と決める", eff: { moya: 1 }, res: "周りは少しずつ使い始めている。",
          why: "20代の転職希望者の6割以上は、すでに生成AIを使っている。使わないという選択にも、理由を説明できるようにしておきたい。" },
      ],
    },
    {
      tag: "第6週",
      title: "請求書の金額ミス",
      text: "送った請求書の金額が1桁違っていた。まだ誰も気づいていない。",
      choices: [
        { t: "こっそり自分で差し替える", eff: { trust: -2, moya: 1 }, res: "取引先から問い合わせが来て、結局ばれた。",
          why: "隠すと、ミスより「報告しなかったこと」の方が信頼を下げる。" },
        { t: "すぐ報告し、再発防止のチェックリストを作る", eff: { trust: 1, growth: 1, seed: "checklist" }, res: "上司「報告が早くて助かった。チェックリスト、チームで使おう」",
          why: "失敗を仕組みで止めた話は、それ自体が実績になる。面接でも聞かれやすい。" },
        { t: "「先輩の確認が漏れていた」と言う", eff: { trust: -3 }, res: "先輩との関係がぎくしゃくした。",
          why: "人のせいにすると、次に助けてもらえなくなる。" },
      ],
    },
    {
      tag: "第7週",
      title: "飲み会の誘い",
      text: "金曜の夜、部署の飲み会に誘われた。正直、今週は疲れている。",
      choices: [
        { t: "行く", eff: { trust: 1, hp: -1 }, res: "楽しかったが、少し疲れた。",
          why: "付き合いで信頼は少し上がる。体力との相談。" },
        { t: "断って休む", eff: { hp: 2 }, res: "よく眠れた。",
          why: "休むのも仕事のうち。断り方が丁寧なら、信頼はほとんど下がらない。" },
        { t: "行って、他部署の人に「今どんな仕事をしているか」を聞く", eff: { trust: 1, market: 1, hp: -1 }, res: "他部署で自分のスキルが役立ちそうな話を聞けた。",
          why: "20代会社員の7割以上が孤独を感じることがあるという調査がある。社内に話せる人を増やすと、次の機会の情報も入ってくる。" },
      ],
    },
    {
      tag: "第8週",
      title: "背伸びのチャンス",
      text: "新しい案件のサブ担当を募集している。忙しくなるのは間違いない。",
      choices: [
        { t: "手を挙げる", eff: { growth: 2, hp: -2, seed: "stretch" }, res: "任された。大変だが、手応えがある。",
          why: "少し難しい仕事に手を挙げるのが、成長の実感を得る一番の近道。" },
        { t: "今は余裕がないので見送る", eff: { hp: 1, moya: 1 }, res: "楽にはなったが、少し後悔している。",
          why: "見送るのが正しいときもある。その場合は「次は手を挙げたい」と上司に伝えておくと、次の機会が回ってきやすい。" },
        { t: "「定常業務の一部を AI で減らせれば受けられます」と条件をつけて手を挙げる", eff: { special: "conditional" }, res: "",
          why: "条件を出して引き受けるのは交渉力。AI で時間を作った実績があると、条件に説得力が出る。" },
      ],
    },
    {
      tag: "第9週",
      title: "スカウトが届いた",
      text: "転職サービスから「職務経歴書を送ってください。面談しませんか」と連絡が来た。",
      choices: [
        { t: "今ある実績で職務経歴書を書いてみる", eff: { special: "scout" }, res: "",
          why: "職務経歴書は「何をしたか」ではなく「何を変えたか」を見られる。書ける実績の量が、今の自分の市場価値の目安になる。" },
        { t: "今は興味がないので放っておく", eff: {}, res: "放っておいた。",
          why: "すぐ転職しなくても、「今書けるか」を確かめるだけで、足りないものが分かる。" },
      ],
    },
    {
      tag: "第10週",
      title: "評価面談",
      text: "来週は半期の評価面談。上司と30分話す。",
      choices: [
        { t: "記録した実績を1枚にまとめて持っていく", eff: { special: "review" }, res: "",
          why: "上司も部下の仕事をすべて覚えているわけではない。記録を持っていくと、評価の材料を自分で渡せる。" },
        { t: "「頑張りました」と熱意で伝える", eff: { trust: 0 }, res: "上司「うん、頑張ってたよね」。でも評価の理由は曖昧なまま。",
          why: "熱意は伝わっても、評価の根拠にはなりにくい。" },
        { t: "特に準備しない", eff: { moya: 1 }, res: "何を話したか、あまり覚えていない。",
          why: "準備しないと、評価の結果に納得しづらくなる。" },
      ],
    },
    {
      tag: "第11週",
      title: "疲れが溜まってきた",
      text: "朝起きるのがつらい。月曜が憂うつだ。",
      choices: [
        { t: "有休を1日取って、しっかり休む", eff: { hp: 4, moya: -1 }, res: "頭がすっきりした。",
          why: "社会人1〜3年目の7割以上が「連休明けに仕事が憂うつになることがある」と答えている。休むことで、次の週の判断がよくなる。" },
        { t: "無理をして続ける", eff: { hp: -2, growth: 1 }, res: "仕事は進んだが、体は重い。",
          why: "無理が続くと、体調を崩して結局もっと休むことになりやすい。" },
      ],
    },
    {
      tag: "第12週",
      title: "分かれ道",
      text: "3か月が過ぎた。自分は、この先どうしたいだろう。",
      choices: [
        { t: "今の会社で、次の挑戦を任せてほしいと伝える", eff: { trust: 1 }, res: "気持ちを言葉にした。",
          why: "残るなら「何をやりたいか」を伝えておくと、次の機会が回ってきやすい。" },
        { t: "社外でも通用するか、職務経歴書を仕上げて確かめる", eff: { market: 1 }, res: "職務経歴書を仕上げた。",
          why: "転職するかどうかに関係なく、職務経歴書を最新にしておくと、判断の材料になる。" },
        { t: "まだ決めない。記録だけは続ける", eff: { moya: -1 }, res: "焦って決めないことにした。",
          why: "決めないのも1つの判断。実績の記録を続けていれば、決めたい時にすぐ動ける。" },
      ],
    },
  ];

  // ---------- 毎週の行動 ----------
  const ACTIONS = [
    { id: "routine", name: "頼まれた仕事を丁寧にこなす", ap: 1, kind: "", desc: "信頼 +1 / 体力 −1。安全だが、実績の種は生まれない。",
      run: (s) => { s.trust += 1; s.hp -= 1; return "いつもの仕事を丁寧に終えた。"; } },
    { id: "stretch", name: "背伸びの仕事に手を挙げる", ap: 2, kind: "stretch", desc: "成長 +2 / 体力 −2。実績の種が1つ生まれる。",
      lock: (s) => (s.trust >= 4 || s.unlock ? "" : "信頼が4以上か、上司に「新しいことを任せて」と伝えた後に選べる。"),
      run: (s) => {
        s.growth += 2; s.hp -= 2;
        return addSeed(s, "stretch") ? "少し難しい仕事に挑んだ。手応えあり。実績の種が生まれた。" : "少し難しい仕事に挑んだ。今回は前の仕事の続きで、新しい種は生まれなかった。";
      } },
    { id: "ai", name: "AI で定型作業を減らす", ap: 1, kind: "ai", desc: "成長 +1 / 体力 −1。実績の種が1つ。初回は翌週から行動回数が1増える。",
      run: (s) => {
        s.growth += 1; s.hp -= 1;
        const got = addSeed(s, "ai");
        if (!s.automated) { s.automated = true; return "定型作業を AI で短くした。来週から時間に余裕ができる（行動回数 +1）。"; }
        return got ? "別の作業も AI で短くした。実績の種が生まれた。" : "AI の使い方を磨いた。もう大きく短くできる作業は残っていない。";
      } },
    { id: "record", name: "成果を数字で記録する", ap: 1, kind: "record", desc: "実績の種を1つ、職務経歴書に書ける実績に変える。3週間放っておいた種は消える。",
      lock: (s) => (s.seeds.length ? "" : "記録できる実績の種がまだ無い。"),
      run: null },
    { id: "oneonone", name: "上司と1on1で期待をすり合わせる", ap: 1, kind: "", desc: "信頼 +2 / モヤモヤ −1。背伸びの仕事を選べるようになる。",
      run: (s) => { s.trust += 2; s.moya -= 1; s.unlock = true; return "上司が自分に期待していることが分かった。"; } },
    { id: "outside", name: "社外で学ぶ・発信する", ap: 1, kind: "", desc: "市場価値 +1 / 成長 +1 / 体力 −1。",
      run: (s) => { s.market += 1; s.growth += 1; s.hp -= 1; return "勉強会に出て、学んだことを短く発信した。"; } },
    { id: "rest", name: "しっかり休む", ap: 1, kind: "", desc: "体力 +3 / モヤモヤ −1。",
      run: (s) => { s.hp += 3; s.moya -= 1; return "早く寝て、週末はしっかり休んだ。"; } },
  ];

  // ---------- 状態 ----------
  let S = null;
  function newGame() {
    return {
      week: 1, apMax: 3, ap: 3, hp: 7, growth: 0, trust: 3, market: 0, moya: 4,
      seeds: [], records: [], lost: [], used: [], unlock: false, automated: false,
      downs: 0, growthThisWeek: 0, phase: "event", log: [], seedCounter: 0,
      pools: { stretch: shuffle([0, 1, 2, 3]), ai: shuffle([0, 1, 2]) },
    };
  }
  function addSeed(s, type) {
    let tpl;
    if (type === "checklist") tpl = SEEDS.event.checklist;
    else {
      const pool = s.pools[type];
      if (!pool.length) return false; // 同じ成果を二度は書かない
      tpl = SEEDS[type][pool.shift()];
    }
    s.seedCounter += 1;
    s.seeds.push({ id: s.seedCounter, type, week: s.week, label: tpl.label, options: tpl.options });
    return true;
  }
  function norm(s) {
    for (const k of ["hp", "growth", "trust", "market", "moya"]) s[k] = clamp(s[k]);
  }
  function applyEff(s, eff) {
    const before = snapshot(s);
    if (eff.hp) s.hp += eff.hp;
    if (eff.growth) { s.growth += eff.growth; s.growthThisWeek += eff.growth; }
    if (eff.trust) s.trust += eff.trust;
    if (eff.market) s.market += eff.market;
    if (eff.moya) s.moya += eff.moya;
    if (eff.unlock) s.unlock = true;
    if (eff.seed) addSeed(s, eff.seed);
    norm(s);
    return diff(before, snapshot(s));
  }
  const LABELS = { hp: "体力", growth: "成長", trust: "信頼", market: "市場価値", moya: "モヤモヤ" };
  function snapshot(s) { return { hp: s.hp, growth: s.growth, trust: s.trust, market: s.market, moya: s.moya }; }
  function diff(a, b) {
    const out = [];
    for (const k of Object.keys(LABELS)) {
      const d = b[k] - a[k];
      if (d) out.push({ k, d });
    }
    return out;
  }
  function deltaNode(list) {
    if (!list.length) return null;
    return h("p", { class: "delta" }, list.map(({ k, d }, i) => {
      const good = k === "moya" ? d < 0 : d > 0;
      return h("span", { class: good ? "up" : "down" }, `${i ? "　" : ""}${LABELS[k]} ${d > 0 ? "+" : ""}${d}`);
    }));
  }
  function persist() {
    store.game = S;
    saveStore();
  }

  // ---------- 画面：タイトル ----------
  function renderTitle() {
    const hasSave = store.game && typeof store.game.week === "number" && store.game.phase !== "end";
    mount(
      h("section", { class: "title-hero" },
        h("p", { class: "eyebrow" }, "SIMULATION GAME"),
        h("h1", null, "3年目の分かれ道"),
        h("p", null, "入社3年目。仕事には慣れた。でも、成長している気がしない。転職しようにも、職務経歴書に書けることが無い。"),
        h("p", null, "この12週間で、毎日の仕事を「職務経歴書に書ける実績」に変えていこう。"),
        h("div", { class: "road", "aria-hidden": "true" }, Array.from({ length: 12 }, () => h("span"))),
        h("div", { class: "btn-row" },
          h("button", { class: "btn gold", onclick: () => { S = newGame(); persist(); renderWeek(); } }, hasSave ? "最初から始める" : "はじめる"),
          hasSave ? h("button", { class: "btn ghost", onclick: () => { S = store.game; renderWeek(); } }, `続きから（第${store.game.week}週）`) : null,
        ),
      ),
      h("section", { class: "panel" },
        h("h2", null, "遊び方"),
        h("ul", { class: "plain" },
          h("li", null, "毎週はじめに出来事が起きる。どう動くかを選ぶ。"),
          h("li", null, "そのあと、行動を選ぶ（1週間に3回。AI で作業を減らすと4回に増える）。"),
          h("li", null, "背伸びの仕事や AI での改善をすると「実績の種」が生まれる。"),
          h("li", null, "種は「成果を数字で記録する」で実績に変わる。3週間放っておくと、数字を思い出せなくなって消える。"),
          h("li", null, "体力が0になると倒れる。モヤモヤが10になると、勢いで退職してしまう。"),
        ),
        h("p", { class: "muted" }, "出来事の解説は、若手社会人の調査（離職率、成長実感、AI 利用、孤独など）をもとにしています。数値は各調査の公表値で、出典は README に載せています。"),
      ),
      h("section", { class: "panel" },
        h("h2", null, "実績メーカー"),
        h("p", null, "ゲームの外で、自分の本当の仕事を「職務経歴書に書ける1行」にする道具です。"),
        h("button", { class: "btn", onclick: renderMaker }, `実績メーカーを開く${store.mine.length ? `（${store.mine.length}件）` : ""}`),
      ),
    );
  }

  // ---------- 画面：週 ----------
  function hud() {
    const stat = (k, color) => h("div", { class: "stat" },
      `${LABELS[k]} ${S[k]}/${MAX}`,
      h("div", { class: "bar" }, h("b", { style: `width:${S[k] * 10}%;background:var(--${color})` })),
    );
    return h("section", { class: "hud", "aria-label": "ステータス" },
      h("div", { class: "hud-top" },
        h("div", { class: "week" }, `第${S.week}週 `, h("small", null, `/ ${WEEKS}週`)),
        h("div", { class: "ap", "aria-label": `残りの行動 ${S.ap}回` }, "行動",
          Array.from({ length: S.apMax }, (_, i) => h("i", { class: i < S.ap ? "" : "used" }))),
        h("div", { class: "ap" }, `実績 ${S.records.length}件`),
      ),
      h("div", { class: "stats" },
        stat("hp", "hp"), stat("growth", "growth"), stat("trust", "trust"), stat("market", "market"), stat("moya", "moya"),
      ),
      S.seeds.length
        ? h("div", { class: "seeds" }, S.seeds.map((sd) => {
            const left = 3 - (S.week - sd.week);
            return h("span", { class: `seed${left <= 1 ? " warn" : ""}` }, `種：${sd.label}（あと${left}週）`);
          }))
        : null,
    );
  }

  function renderWeek() {
    if (S.phase === "end") return renderEnding();
    if (S.phase === "event") return renderEvent();
    return renderPlan();
  }

  function renderEvent(result) {
    // 選んだ後に再読み込みしても、同じ出来事を二重に選べないようにする
    if (!result && S.eventResult && S.eventResult.week === S.week) result = S.eventResult;
    const ev = EVENTS[S.week - 1];
    const body = h("section", { class: "panel" },
      h("p", { class: "event-tag" }, ev.tag),
      h("h2", null, ev.title),
      h("p", null, ev.text),
    );
    if (!result) {
      ev.choices.forEach((c, i) => body.append(h("button", { class: "choice", onclick: () => chooseEvent(i) }, c.t)));
    } else {
      body.append(
        h("div", { class: "result" }, h("p", null, result.res), deltaNode(result.delta)),
        h("div", { class: "why" }, h("b", null, "解説　"), result.why),
        h("div", { class: "btn-row" }, h("button", { class: "btn", onclick: () => { S.phase = "plan"; persist(); renderPlan(); } }, "今週の行動を選ぶ →")),
      );
    }
    mount(hud(), body, logPanel());
  }

  function chooseEvent(i) {
    const c = EVENTS[S.week - 1].choices[i];
    let res = c.res;
    let delta;
    if (c.eff.special === "conditional") {
      if (S.automated) {
        delta = applyEff(S, { growth: 2, hp: -1, trust: 1, seed: "stretch" });
        res = "上司「AI で作業を減らした件、聞いてるよ。それなら任せられる」。負担を抑えて引き受けられた。";
      } else {
        delta = applyEff(S, { growth: 2, hp: -2, seed: "stretch" });
        res = "上司「AI で減らすって、具体的には？」。うまく答えられなかったが、任せてはもらえた。";
      }
    } else if (c.eff.special === "scout") {
      if (strongCount() >= 2) {
        delta = applyEff(S, { market: 2, moya: -1 });
        res = `実績を${S.records.length}件書けた。担当者「数字があって分かりやすいです。ぜひ一度お話を」`;
      } else {
        delta = applyEff(S, { moya: 1 });
        res = S.records.length
          ? "書いてみたが、数字が足りず「何を変えたか」が伝わらない。担当者からの返事は来なかった。"
          : "書こうとして手が止まった。「やったこと」はあるのに、書ける「実績」が無い。";
      }
    } else if (c.eff.special === "review") {
      const n = S.records.length;
      const stars = totalStars();
      if (n === 0) {
        delta = applyEff(S, { moya: 1 });
        res = "1枚にまとめようとしたが、記録が1つも無かった。";
      } else {
        delta = applyEff(S, { trust: Math.min(3, Math.ceil(stars / 3)), moya: -1 });
        res = `記録した実績${n}件を見せた。上司「ここまで整理してくれると評価しやすい。次はこれを任せたい」`;
      }
    } else {
      delta = applyEff(S, c.eff);
    }
    S.log.unshift(`第${S.week}週「${EVENTS[S.week - 1].title}」：${c.t}`);
    S.eventResult = { week: S.week, res, why: c.why, delta };
    persist();
    renderEvent(S.eventResult);
  }

  function renderPlan(lastMsg) {
    const body = h("section", { class: "panel" },
      h("h2", null, "今週の行動"),
      h("p", { class: "muted" }, `残り ${S.ap} 回。同じ行動は1週間に1回まで。`),
    );
    if (lastMsg) body.append(h("div", { class: "result" }, h("p", null, lastMsg.text), deltaNode(lastMsg.delta)));
    for (const a of ACTIONS) {
      const lockMsg = a.lock ? a.lock(S) : "";
      const used = S.used.includes(a.id);
      const disabled = used || S.ap < a.ap || !!lockMsg;
      const btn = h("button", { class: `action ${a.kind}`, disabled, onclick: () => doAction(a) },
        h("strong", null, a.name),
        h("span", { class: "cost" }, `行動 ${a.ap}`),
        h("span", { class: "desc" }, a.desc),
        used ? h("span", { class: "lock" }, "今週はもう選んだ。") : lockMsg ? h("span", { class: "lock" }, lockMsg) : null,
      );
      body.append(btn);
    }
    body.append(h("div", { class: "btn-row" },
      h("button", { class: "btn gold", onclick: endWeek }, S.ap ? `週を終える（残り${S.ap}回を使わない）` : "週を終える →"),
    ));
    mount(hud(), body, logPanel());
  }

  function doAction(a) {
    if (a.id === "record") return openRecord();
    const before = snapshot(S);
    const g = S.growth;
    const text = a.run(S);
    S.growthThisWeek += Math.max(0, S.growth - g);
    norm(S);
    S.ap -= a.ap;
    S.used.push(a.id);
    S.log.unshift(`第${S.week}週：${a.name}`);
    persist();
    renderPlan({ text, delta: diff(before, snapshot(S)) });
  }

  // ---------- 記録のミニゲーム ----------
  function openRecord() {
    const seed = S.seeds[0];
    const opts = shuffle(seed.options);
    const card = h("div", { class: "modal-card", role: "dialog", "aria-modal": "true", "aria-labelledby": "rec-title" },
      h("p", { class: "event-tag" }, "成果を記録する"),
      h("h2", { id: "rec-title" }, seed.label),
      h("p", null, "職務経歴書に書くなら、どの書き方にする？"),
      opts.map((o) => h("button", { class: "choice", onclick: () => finishRecord(seed, o) }, o.t)),
      h("div", { class: "btn-row" }, h("button", { class: "btn ghost small", onclick: closeModal }, "やめる")),
    );
    modal.replaceChildren(card);
    modal.hidden = false;
    card.querySelector(".choice").focus();
  }
  function closeModal() { modal.hidden = true; modal.replaceChildren(); }
  function finishRecord(seed, o) {
    S.seeds = S.seeds.filter((x) => x.id !== seed.id);
    S.records.push({ text: o.t, stars: o.s, type: seed.type });
    S.ap -= 1;
    S.used.push("record");
    const before = snapshot(S);
    if (o.s === 3) { S.growth += 1; S.growthThisWeek += 1; S.moya -= 1; }
    norm(S);
    S.log.unshift(`第${S.week}週：実績を記録（${"★".repeat(o.s)}）`);
    persist();
    const best = seed.options.find((x) => x.s === 3);
    const card = h("div", { class: "modal-card", role: "dialog", "aria-modal": "true" },
      h("p", { class: "event-tag" }, "記録した"),
      h("h2", null, starNode(o.s)),
      h("p", null, o.t),
      h("div", { class: "why" }, h("b", null, "解説　"), o.why),
      o.s < 3 ? h("div", { class: "why" }, h("b", null, "★3の書き方　"), best.t) : null,
      deltaNode(diff(before, snapshot(S))),
      h("div", { class: "btn-row" }, h("button", { class: "btn", onclick: () => { closeModal(); renderPlan(); } }, "続ける")),
    );
    modal.replaceChildren(card);
    card.querySelector(".btn").focus();
  }
  const starNode = (n) => h("span", { class: "stars", "aria-label": `星${n}つ` }, "★".repeat(n), h("span", { class: "empty" }, "★".repeat(3 - n)));
  const totalStars = () => S.records.reduce((a, r) => a + r.stars, 0);

  // ---------- 週の終わり ----------
  function endWeek() {
    const notes = [];
    const before = snapshot(S);
    // 記録しなかった種は消える
    const keep = [];
    for (const sd of S.seeds) {
      if (S.week - sd.week >= 2) { S.lost.push(sd.label); notes.push(`「${sd.label}」を記録しないまま3週間たち、数字を思い出せなくなった。`); }
      else keep.push(sd);
    }
    S.seeds = keep;
    // 成長の実感がない週はモヤモヤが増える
    if (S.growthThisWeek > 0) S.moya -= 1;
    else { S.moya += 1; notes.push("今週は成長した実感がなかった。モヤモヤが少し増えた。"); }
    norm(S);
    // 倒れる
    let down = false;
    if (S.hp <= 0) {
      S.downs += 1; down = true; S.hp = 4; S.moya = clamp(S.moya + 1);
      notes.push("体力が尽きて、週末に寝込んでしまった。来週は行動が2回に減る。");
    }
    const delta = diff(before, snapshot(S));

    if (S.moya >= MAX) return finish("quit");
    if (S.downs >= 2) return finish("burnout");
    if (S.week >= WEEKS) return finish();

    S.week += 1;
    S.apMax = S.automated ? 4 : 3;
    S.ap = down ? 2 : S.apMax;
    S.used = [];
    S.growthThisWeek = 0;
    S.phase = "event";
    persist();
    if (notes.length || delta.length) {
      const card = h("div", { class: "modal-card", role: "dialog", "aria-modal": "true" },
        h("p", { class: "event-tag" }, "週の終わり"),
        notes.map((n) => h("p", null, n)),
        deltaNode(delta),
        h("div", { class: "btn-row" }, h("button", { class: "btn", onclick: () => { closeModal(); renderEvent(); } }, `第${S.week}週へ →`)),
      );
      modal.replaceChildren(card);
      modal.hidden = false;
      card.querySelector(".btn").focus();
    } else {
      renderEvent();
    }
  }

  // ---------- エンディング ----------
  const ENDINGS = {
    both: { title: "どちらも選べる人", text: "社内では次の挑戦を任され、社外からも声がかかる。残るか移るかを、自分で選べる立場になった。" },
    stay: { title: "社内で次の挑戦へ", text: "記録した実績が評価の材料になり、新しい案件を任されることになった。「成長できない」は、もう口ぐせではない。" },
    move: { title: "社外でも通用する", text: "職務経歴書に数字で書ける実績がそろった。転職するかどうかは、もう不安ではなく選択の問題だ。" },
    almost: { title: "あと一歩", text: "動いた分だけ手応えはある。ただ、数字で語れる実績はまだ少ない。記録を続ければ、次の3か月で届く。" },
    yuru: { title: "ゆるい現状維持", text: "大きな失敗はない。でも3か月前と、職務経歴書はほとんど変わっていない。「働きやすいけど成長できない」と感じる若手は4割いる。" },
    quit: { title: "勢いで退職", text: "モヤモヤが限界に達し、次を決めないまま辞めてしまった。辞めることが悪いのではない。判断の材料がないまま辞めたのが惜しい。" },
    burnout: { title: "燃え尽き", text: "頑張りすぎて2度倒れてしまった。背伸びは大事だが、休むことも計画のうち。" },
  };
  // 判定は「★3（工夫＋Before→After の数字）の実績が何件あるか」が中心。★1を数だけ集めても届かない
  const strongCount = () => S.records.filter((r) => r.stars === 3).length;
  function judge() {
    const strong = strongCount();
    if (strong >= 5 && S.trust >= 8 && S.market >= 4) return "both";
    if (strong >= 4 && S.trust >= 7) return "stay";
    if (strong >= 4 && S.market >= 4) return "move";
    if (strong >= 2) return "almost";
    return "yuru";
  }
  function finish(forced) {
    S.ending = forced || judge();
    S.phase = "end";
    if (!store.endings.includes(S.ending)) store.endings.push(S.ending);
    persist();
    closeModal();
    renderEnding();
  }
  function renderEnding() {
    const e = ENDINGS[S.ending] || ENDINGS.yuru;
    const resume = h("div", { class: "resume" },
      h("h3", null, "職務経歴書（主な実績）"),
      S.records.length
        ? h("ul", null, S.records.map((r) => h("li", null, starNode(r.stars), " ", r.text)))
        : h("p", { class: "muted" }, "書ける実績がまだ無い。"),
      S.lost.length ? h("p", { class: "muted" }, `記録しなかったために消えた成果：${S.lost.join("、")}`) : null,
    );
    mount(
      h("section", { class: "ending-badge" },
        h("p", { class: "eyebrow" }, `ENDING ${Object.keys(ENDINGS).indexOf(S.ending) + 1} / ${Object.keys(ENDINGS).length}`),
        h("h2", null, e.title),
        h("p", null, e.text),
        h("p", { class: "muted", style: "color:rgba(246,243,236,.75)" },
          `実績 ${S.records.length}件（うち★3が${strongCount()}件）・信頼 ${S.trust}・市場価値 ${S.market}・体力 ${S.hp}・モヤモヤ ${S.moya}`),
      ),
      h("section", { class: "panel" }, resume),
      h("section", { class: "panel" },
        h("h2", null, "現実に持ち帰る3つのこと"),
        h("ol", { class: "plain" },
          h("li", null, "背伸びの仕事は「待つ」より「自分から言う」。上司に、今の担当に加えて1つ新しいことを任せてほしいと伝える。"),
          h("li", null, "AI で作業を減らしたら、Before→After の数字をその日のうちにメモする。3週間たつと思い出せない。"),
          h("li", null, "辞めるか迷ったら、まず職務経歴書を書いてみる。書けないなら、足りないのは会社ではなく記録かもしれない。"),
        ),
        h("p", { class: "muted" }, `見たエンディング：${store.endings.length} / ${Object.keys(ENDINGS).length}`),
        h("div", { class: "btn-row" },
          h("button", { class: "btn gold", onclick: renderMaker }, "自分の実績を作ってみる"),
          h("button", { class: "btn ghost", onclick: () => { S = newGame(); persist(); renderWeek(); } }, "もう一度遊ぶ"),
          h("button", { class: "btn ghost", onclick: renderTitle }, "タイトルへ"),
        ),
      ),
    );
  }

  function logPanel() {
    if (!S.log.length) return null;
    return h("section", { class: "panel" },
      h("h3", null, "これまでの記録"),
      h("ol", { class: "log", reversed: true }, S.log.slice(0, 30).map((l) => h("li", null, l))),
    );
  }

  // ---------- 実績メーカー（現実の仕事用） ----------
  function renderMaker() {
    const f = { task: "", before: "", after: "", how: "" };
    const preview = h("p", { class: "preview" });
    const hint = h("p", { class: "hint" });
    const list = h("div", { class: "mine" });

    const compose = () => {
      const task = f.task.trim(), how = f.how.trim(), before = f.before.trim(), after = f.after.trim();
      if (!task) return "";
      // 例：「週次レポートの集計：生成AIで表計算の関数を作り、週3時間→週30分にした。」
      const result = before && after ? `${before}→${after}にした。` : after ? `${after}。` : "";
      if (how) return `${task}：${how.replace(/[、。]$/, "")}${result ? `、${result}` : "。"}`;
      return result ? `${task}を${result}` : `${task}を担当した。`;
    };
    const update = () => {
      const s = compose();
      preview.textContent = s || "（上の欄を埋めると、ここに1行ができます）";
      const tips = [];
      if (s) {
        if (!/[0-9０-９]/.test(f.before + f.after)) tips.push("数字が入っていません。時間・件数・金額・期間のどれかで表せないか考えてみる。");
        if (!f.how.trim()) tips.push("「自分が何をしたか（手段・工夫）」があると、自分の実績だと伝わる。");
        if (/大幅|大きく|貢献|円滑|効率化/.test(s) && !/[0-9０-９]/.test(s)) tips.push("「大幅に」「貢献」などの言葉は、数字に置き換えると強くなる。");
      }
      hint.textContent = tips.join(" ");
    };
    const field = (key, label, help, ph, area) => h("label", { class: "field" },
      h("span", null, label), h("small", null, help),
      h(area ? "textarea" : "input", { rows: area ? "2" : false, placeholder: ph, maxlength: "120", oninput: (ev) => { f[key] = ev.target.value; update(); } }),
    );
    const drawList = () => {
      list.replaceChildren(
        h("h3", null, `保存した実績（${store.mine.length}件）`),
        store.mine.length
          ? h("ul", null, store.mine.map((m, i) => h("li", null,
              h("span", null, m.text),
              h("button", { class: "linkbtn", "aria-label": "この実績を消す", onclick: () => { store.mine.splice(i, 1); saveStore(); drawList(); } }, "消す"))))
          : h("p", { class: "muted" }, "まだありません。"),
        store.mine.length ? h("div", { class: "btn-row" }, h("button", { class: "btn small", onclick: copyAll }, "まとめてコピー")) : null,
      );
    };
    const copyAll = async () => {
      const text = store.mine.map((m) => `・${m.text}`).join("\n");
      try { await navigator.clipboard.writeText(text); toast("コピーしました"); }
      catch (_) { toast("コピーできませんでした。長押しで選択してください"); }
    };

    mount(
      h("section", { class: "panel" },
        h("p", { class: "event-tag" }, "実績メーカー"),
        h("h2", null, "自分の仕事を、職務経歴書の1行にする"),
        h("p", { class: "muted" }, "入力した内容はこの端末のブラウザにだけ保存され、外部には送られません。会社名や顧客名など、社外に出せない情報は書かないでください。"),
        field("task", "どの仕事？", "例：週次レポートの集計", "週次レポートの集計"),
        field("how", "自分は何をした？（手段・工夫）", "例：生成AIで表計算の関数を作り", "生成AIで表計算の関数を作り", true),
        field("before", "前の状態（数字）", "例：週3時間", "週3時間"),
        field("after", "後の状態（数字）", "例：週30分", "週30分"),
        preview, hint,
        h("div", { class: "btn-row" },
          h("button", { class: "btn gold", onclick: () => {
            const s = compose();
            if (!s) return toast("「どの仕事？」を入れてください");
            store.mine.unshift({ text: s, at: Date.now() });
            saveStore(); drawList(); toast("保存しました");
          } }, "この1行を保存"),
          h("button", { class: "btn ghost", onclick: renderTitle }, "タイトルへ"),
        ),
      ),
      h("section", { class: "panel" }, list),
    );
    update();
    drawList();
  }

  // ---------- 起動 ----------
  if (store.game && (typeof store.game.week !== "number" || !Array.isArray(store.game.seeds))) delete store.game;
  renderTitle();
})();
