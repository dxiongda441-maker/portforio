# 年末ファミリートランプ

ババ抜き・大富豪・ポーカー・七並べなど10種類のトランプゲームを、1台の端末で家族と、またはコンピューター相手に遊べるゲーム集。

| 項目 | 内容 |
| --- | --- |
| 種類 | 家族向けトランプゲーム集 |
| 公開URL | https://dxiongda441-maker.github.io/portforio/projects/family-cards/ |
| 作ったチャット | チャット「家族向けトランプゲームアプリ」（2026-09-25〜26）。ブランチ `claude/family-card-game-app-fnnysi` から、この整理ブランチに取り込み済み |
| 保存するデータ | `family-cards:v1`（localStorage） |
| オフライン対応 | なし |

## ファイル

| ファイル | 役割 |
| --- | --- |
| `index.html` | 画面。ゲームを足すときは `<script>` を1行足す |
| `app.js` | 画面の切り替え・ゲームの選択 |
| `core.js` | 全ゲーム共通の部品（カード・進行管理・手札の表示） |
| `games/` | 1ゲーム1ファイル（babanuki, blackjack, daifugo, doubt, highlow, pageone, poker, shichinarabe, shinkei, speed） |
| `styles.css` | 見た目 |

## 編集するとき

- ビルドは不要です。ファイルを直して、ブラウザで開き直せば確認できます。
- 設計の理由は `docs/decisions/0004-family-cards-structure.md` と `0005-family-cards-quality-pass.md`。URL の末尾に `?speed=0` を付けると、全員 CPU で最後まで自動で進む（動作確認用）。
- トップページのカードの文言は、リポジトリ直下の `index.html` の `.works-grid` にあります。
