# 構成の実態

> 最終確認: 2026-08-28 / 確認者: Claude
> ここは「今どうなっているか」を書く場所。「なぜそうしたか」は `docs/decisions/` に書く。

## 全体像

ビルド工程を持たない静的サイト。`.github/workflows/deploy.yml` が `main` への push を検知し、
`actions/upload-pages-artifact` で**リポジトリのルート全体をそのまま** GitHub Pages に配信する。
つまり「リポジトリの見た目 = 公開される中身」。生成物や中間ファイルの概念はない。

```
index.html                  トップページ（自己完結・770行）
style.css                   ⚠️ 未使用（旧デザインの残骸）
main.js                     ⚠️ 未使用（旧デザインの残骸）
assets/portfolio/*.jpg      作品カードのサムネイル
projects/<slug>/            各作品の実体。それぞれ独立した静的アプリ
.github/workflows/deploy.yml  Pages デプロイ
```

## index.html — 自己完結している

**`<script>` タグも `<link>` タグも 0 個。** 検証コマンド:

```bash
grep -c '<script' index.html   # => 0
grep -c '<link'   index.html   # => 0
```

したがって:

- **スタイルを変える** → `index.html` 冒頭の `<style>` ブロックを編集する（`style.css` ではない）
- **作品カードを追加する** → `#works` セクション内の `<article class="project-card">` を直接複製して編集する

### セクション構成（四季に対応）

| id | テーマ | 行番号の目安 |
|---|---|---|
| `home` | Hero | 621〜 |
| `about` | Spring | 636〜 |
| `works` | Summer | 650〜 |
| `skills` | Autumn | 721〜 |
| `story` | Winter / Philosophy | 738〜 |
| `contact` | — | 753〜 |

※ 行番号は編集で動く。`grep -n '<section' index.html` で都度確認すること。

### CSS 変数（`index.html` の `<style>` 内）

`--ink` `--soft-ink` `--paper` `--line` `--moss` `--leaf` `--persimmon` `--gold`
和の色名で統一されている。新しい色を足すときはこの命名に合わせる。

## style.css / main.js が「残骸」である根拠

- `index.html` から一切参照されていない（上記 grep が 0）
- 定義している CSS 変数系統が違う: `--neon-cyan` `--neon-lime` `--surface` ＝ ネオン基調。
  現行 `index.html` の和色パレットとは別デザイン
- `main.js` は `#projects-data` という JSON `<script>` タグを読んでカードを動的生成する実装だが、
  `index.html` にその要素は存在しない（作品は HTML 直書きに変わった）
- 最終更新: `style.css` / `main.js` = 2025-10-08、`index.html` = 2026-07-14

→ **現状は「消してもトップページの表示は変わらない」状態。** ただし削除の判断は未実施。
   `docs/decisions/0001-static-site-single-file.md` を参照。

## projects/ — 各作品

8 ディレクトリあり、`index.html` の作品カードのリンク先と 1:1 で一致している（リンク切れなし）。

```
cat-quiz  contracts  country-quiz  levellog  money-anime  quote  reading-shelf  wabisabi
```

基本構成は `index.html` + `app.js` + `styles.css`。うち 5 件は
`manifest.webmanifest`(または `manifest.json`) + `sw.js`(または `service-worker.js`) を持つ **PWA**。

| slug | 構成 | 備考 |
|---|---|---|
| `reading-shelf` | PWA | |
| `wabisabi` | PWA | 表示名「三分録」 |
| `levellog` | PWA | manifest/SW のファイル名だけ他と違う（`manifest.json` / `service-worker.js`） |
| `quote` | PWA | 表示名「1日1名言」 |
| `country-quiz` | PWA | 最大規模。`assets/flags/` に SVG 国旗 195 個、`data/countries.json` を同梱 |
| `cat-quiz` | 静的 | SW なし |
| `contracts` | 静的 | SW なし。`data.js` にデータ分離 |
| `money-anime` | 静的 | `index.html` + `cover.jpg` のみ。アプリではなくケーススタディ |

`country-quiz` のデータ仕様は `projects/country-quiz/DATA_FORMAT.md` に独立して記載されている。
国データは mledoze/countries 由来（ODbL-1.0）。ライセンス表記を消さないこと。

<!-- ✏️ 新しい作品や構成変更を入れたら、ここを更新してください -->
