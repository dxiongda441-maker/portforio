// 章データの入れ物。各 chNN.js が SQ.chapters.push() で章を足す。
// 問題形式: choice / multi / order / input / spot / match（app.js の judge() を参照）
window.SQ = {
  acts: [
    { no: 1, title: "記述の章", desc: "データの種類を見分け、要約し、描き、関係を読む。そして、そもそもデータをどう集めるか。" },
    { no: 2, title: "確率の章", desc: "偶然を数える言葉。確率、確率変数、確率分布、そして中心極限定理。" },
    { no: 3, title: "推測の章", desc: "一部から全体を語る。推定、信頼区間、仮説検定、分散分析。" },
    { no: 4, title: "モデルと判断の章", desc: "関係を式にし、時間を読み、原因を見極める。統計で判断する力の総仕上げ。" }
  ],
  chapters: []
};
