// 章データの入れ物。各 chNN.js が SQ.chapters.push() で章を足す。
// 問題形式: choice / multi / order / input / spot / match（app.js の judge() を参照）
window.SQ = {
  acts: [
    { no: 1, title: "科学の章", desc: "心をどう測り、どう確かめるか。歴史・研究法・統計・脳という、すべての土台。" },
    { no: 2, title: "しくみの章", desc: "見る・覚える・学ぶ・考える・感じる。一人の心の中で何が起きているか。" },
    { no: 3, title: "人の中の章", desc: "生まれてから老いるまで。個人差、そして他者と集団が心を動かす力。" },
    { no: 4, title: "支援の章", desc: "ストレス、心の不調、支援の方法と現場。そして心理学で判断する。" }
  ],
  chapters: []
};
