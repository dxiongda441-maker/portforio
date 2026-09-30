# LevelLog

行動を EXP（経験値）に変えて、レベル・時間の価値・週ごとの振り返りを見える化する習慣アプリ。

| 項目 | 内容 |
| --- | --- |
| 種類 | 習慣化アプリ（PWA） |
| 公開URL | https://dxiongda441-maker.github.io/portforio/projects/levellog/ |
| 作ったチャット | 2026-07-13 のコミット「Add portfolio projects and live demos」でまとめて追加（チャット一覧より前のため、元のチャットは特定できません） |
| 保存するデータ | `level-log-state`（localStorage） |
| オフライン対応 | あり（`service-worker.js`、キャッシュ名の頭は `level-log-`） |

## ファイル

| ファイル | 役割 |
| --- | --- |
| `index.html` | 画面 |
| `app.js` | 動き（EXP 計算・レベル・週次レビュー） |
| `styles.css` | 見た目 |
| `icon.svg` | アイコン |
| `manifest.json` | ホーム画面に追加したときの設定 |
| `service-worker.js` | オフライン用のキャッシュ（ほかの作品と名前が違うので注意） |

## 編集するとき

- **オフライン対応の作品なので、直しただけでは利用者の画面に反映されません。** `service-worker.js` の `CACHE_NAME` の版数（`v5` → `v6` など）を1つ上げてください。
- ファイルを新しく足したときは、`service-worker.js` の中のファイル一覧にも追加してください（忘れるとオフラインのときだけ表示されません）。
- 確認は `python3 -m http.server 3000` で開いてから行います（ファイルを直接開くとオフライン機能が動きません）。
- トップページのカードの文言は、リポジトリ直下の `index.html` の `.works-grid` にあります。
