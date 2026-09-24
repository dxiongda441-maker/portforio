# 0004. 完了前の確認を Claude 自身が行えるようにする

- **日付**: 2026-09-24
- **状態**: 採用
- **関係する場所**: `CLAUDE.md`, `tools/check.sh`, `tools/screenshot.sh`, `docs/context/conventions.md`

## 背景

自動テストが無く、確認は「人間の目視」に頼っていた。CLAUDE.md のルール（`<script>` 0 個、
`CACHE_NAME` を上げる、`CACHE_PREFIX` で絞る）は文章で書かれているだけで、守れたかを
Claude が機械的に確かめる手段が無かった。一方、作業環境（Claude Code on the web）には
ヘッドレス Chromium が最初から入っており、Claude は PNG を開いて見ることができる。

## 決めたこと

- `tools/check.sh`: ルールと整合性を判定するシェルスクリプト。読むだけで書き換えない。
  `<script>`・外部 CSS が 0 個、`style.css` / `main.js` が無いこと、作品カード ⇔ `projects/` ⇔ `sitemap.xml` の一致、
  作品ページ共通の `<head>` 要素と戻り導線、SW の `CACHE_PREFIX` / `startsWith`、
  `origin/main` から変更した PWA で `CACHE_NAME` を上げ忘れていないか。
- `tools/screenshot.sh`: ヘッドレス Chromium の `--screenshot` で撮影する。出力はリポジトリ外。
- CLAUDE.md に「完了の条件」を置き、check → 撮影して自分で見る → 作業ブランチへ push を必須にした。

## 検討して捨てた案

- **Playwright / npm でテストを書く**: 表現力は高いが、ルール 3（npm を使わない）に反し、
  `package.json` と依存を持ち込むことになる。
- **GitHub Actions で check.sh を CI 化する**: 有効だが、`deploy.yml` に手を入れると本番デプロイに影響するため、
  今回の範囲（CLAUDE.md の改善）を超える。やるなら別に判断する。
- **ルールを CLAUDE.md にもっと詳しく書く**: 文章を増やしても守れたかは分からない。
  CLAUDE.md を太らせる（0002 の方針に反する）。

## 結果と影響

- ルール違反と SW の上げ忘れが、コミット前に機械的に見つかる。
- 見た目の崩れを、人に頼む前に Claude が自分で見つけられる。
- 作業環境によっては外部画像（Unsplash）が取れず、撮影結果に背景が写らない。本番の不具合と混同しないこと。
- 作品ページの共通要素を増やしたら `tools/check.sh` のパターンも更新する。
