// 章データの入れ物。各 chNN.js が SQ.chapters.push() で章を足す。
// 問題形式: choice / multi / order / input / spot / match（app.js の judge() を参照）
window.SQ = {
  acts: [
    { no: 1, title: "基礎の章", desc: "守るとは何か。脅威・暗号・認証という、すべての土台。" },
    { no: 2, title: "インフラの章", desc: "ネットワーク、OS、マルウェア、そして人。攻撃が実際に通る道。" },
    { no: 3, title: "アプリとクラウドの章", desc: "Web、開発工程、クラウド、IoT と AI。現代の主戦場。" },
    { no: 4, title: "組織の章", desc: "検知し、対応し、統治する。そして守りを設計する。" }
  ],
  chapters: []
};
