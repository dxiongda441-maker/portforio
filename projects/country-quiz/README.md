# 世界の国クイズ

国旗と世界地図を見ながら195か国を学び、「世界パスポート」に記録できるオフライン対応クイズ。この中で一番大きい作品。

| 項目 | 内容 |
| --- | --- |
| 種類 | 地図・国旗の学習ゲーム（PWA） |
| 公開URL | https://dxiongda441-maker.github.io/portforio/projects/country-quiz/ |
| 作ったチャット | 2026-07-13 のコミット「Add portfolio projects and live demos」でまとめて追加（チャット一覧より前のため、元のチャットは特定できません）。2026-07-14 に PWA 化と地図ズームを追加 |
| 保存するデータ | `world-country-quiz-state-v2`（localStorage） |
| オフライン対応 | あり（`sw.js`、キャッシュ名の頭は `world-country-quiz-`） |

## ファイル

| ファイル | 役割 |
| --- | --- |
| `index.html` | 画面 |
| `app.js` | 動き（地図・クイズ・パスポート） |
| `styles.css` | 見た目 |
| `data/countries.json` | 国のデータ。形式は `DATA_FORMAT.md` に説明あり |
| `data/world-map.geojson` | 世界地図の形 |
| `data/LICENSE-countries.txt` | 国データのライセンス（ODbL-1.0）。**消さないこと** |
| `assets/flags/` | 国旗の SVG（195個） |
| `manifest.webmanifest` | ホーム画面に追加したときの設定 |
| `sw.js` | オフライン用のキャッシュ |

## 編集するとき

- **オフライン対応の作品なので、直しただけでは利用者の画面に反映されません。** `sw.js` の `CACHE_NAME` の版数（`v5` → `v6` など）を1つ上げてください。
- ファイルを新しく足したときは、`sw.js` の中のファイル一覧にも追加してください（忘れるとオフラインのときだけ表示されません）。
- 確認は `python3 -m http.server 3000` で開いてから行います（ファイルを直接開くとオフライン機能が動きません）。
- トップページのカードの文言は、リポジトリ直下の `index.html` の `.works-grid` にあります。
