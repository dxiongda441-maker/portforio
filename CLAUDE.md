# portforio — プロジェクトメモリ

「オルタ」のポートフォリオサイト。GitHub Pages で公開する**静的サイト**（ビルド工程なし）。

- 公開URL: https://dxiongda441-maker.github.io/portforio/
- デプロイ: `main` に push → GitHub Actions がリポジトリ全体をそのまま Pages へ配信

## 必要なときだけ開くもの

| 知りたいこと | 参照先 |
|---|---|
| ファイル構成・どこを直すか | `docs/context/architecture.md` |
| 書き方・作業のルール | `docs/context/conventions.md` |
| 過去の決定と、その理由 | `docs/decisions/` を grep |
| この記憶の仕組み自体の使い方 | `docs/memory-guide.md` |
| Obsidian Vault との連携 | `docs/obsidian/SETUP.md` |

> **全部読まないこと。** 必要な 1〜2 ファイルだけ開く。無関係なファイルを読むとコンテキストを浪費して精度が落ちる。

## 常に守るルール

1. **トップページは `index.html` 1枚で完結している。** CSS は `<style>` に、作品カードは HTML に直書き。`<script>` も `<link>` も 0 個。
2. `style.css` と `main.js` は **どこからも読み込まれていない旧デザインの残骸**。触る前に必ず `docs/context/architecture.md` を確認する。
3. ビルド工程・npm・フレームワークは使わない。ファイルを直接編集する。
4. 設計判断をしたら `docs/decisions/` に 1 ファイル追加する（`/decide` コマンドあり）。
5. **`projects/` の PWA を編集したら Service Worker の `CACHE_NAME` を上げる。**
   忘れると利用者に更新が届かない（詳細は `docs/context/conventions.md`）。
6. 応答は日本語で行う。

## 既知の注意点

- `README.md` の「使い方」節（`npm install` / `npm run dev` / `app/page.tsx`）は**実態と一致していない**。該当ファイルは存在しない。修正は未着手。

<!-- ✏️ ここから下は自由に追記してください -->
## 個人設定

<!-- 例: 「絵文字は使わない」「変更前に必ず差分を見せる」「Codex と併用しているので〜」 -->
