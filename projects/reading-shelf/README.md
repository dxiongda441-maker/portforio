# Reading Shelf

読んだ本・読む前の期待・進捗を、1つの本棚にまとめて記録する読書記録アプリ。

| 項目 | 内容 |
| --- | --- |
| 種類 | 読書記録アプリ（PWA） |
| 公開URL | https://dxiongda441-maker.github.io/portforio/projects/reading-shelf/ |
| 作ったチャット | 2026-07-13 のコミット「Add portfolio projects and live demos」でまとめて追加（チャット一覧より前のため、元のチャットは特定できません） |
| 保存するデータ | `reading-shelf-books`（localStorage） |
| オフライン対応 | あり（`sw.js`、キャッシュ名の頭は `reading-shelf-`） |

## ファイル

| ファイル | 役割 |
| --- | --- |
| `index.html` | 画面 |
| `app.js` | 動き（本の登録・進捗・表示） |
| `styles.css` | 見た目 |
| `assets/` | アイコン・本棚の背景画像 |
| `manifest.webmanifest` | ホーム画面に追加したときの設定 |
| `sw.js` | オフライン用のキャッシュ |

## 編集するとき

- **オフライン対応の作品なので、直しただけでは利用者の画面に反映されません。** `sw.js` の `CACHE_NAME` の版数（`v5` → `v6` など）を1つ上げてください。
- ファイルを新しく足したときは、`sw.js` の中のファイル一覧にも追加してください（忘れるとオフラインのときだけ表示されません）。
- 確認は `python3 -m http.server 3000` で開いてから行います（ファイルを直接開くとオフライン機能が動きません）。
- トップページのカードの文言は、リポジトリ直下の `index.html` の `.works-grid` にあります。
