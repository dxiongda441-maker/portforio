# 構成の実態

> 最終確認: 2026-09-04 / 確認者: Claude
> ここは「今どうなっているか」を書く場所。「なぜそうしたか」は `docs/decisions/` に書く。

## 全体像

ビルド工程を持たない静的サイト。`.github/workflows/deploy.yml` が `main` への push を検知し、
`actions/upload-pages-artifact` で**リポジトリのルート全体をそのまま** GitHub Pages に配信する。
つまり「リポジトリの見た目 = 公開される中身」。生成物や中間ファイルの概念はない。

```
index.html                  トップページ（HTML + CSS を1ファイルに同梱・821行）
404.html                    存在しないURL用
robots.txt / sitemap.xml    クローラ向け
assets/
  favicon.svg               ファビコン
  apple-touch-icon.png
  og-cover.jpg              SNSシェア用 OGP（1200×630）
  portfolio/                作品カードのサムネイル（WebP + JPEG の2本立て）
projects/<slug>/            各作品の実体。1ディレクトリ＝1作品で完結
tools/fetch-backgrounds.sh  背景写真をローカルへ取り込むスクリプト
.github/workflows/deploy.yml
```

編集箇所の早見表は `README.md` の「差し替える場所」にある。重複させないのでそちらを見ること。

## index.html — 自己完結している

**`<script>` は 0 個。JavaScript を一切使っていない。** 検証:

```bash
grep -c '<script' index.html   # => 0
```

`<link>` は 5 個あるが、いずれも CSS ではなくメタ情報。

| 行 | 用途 |
|---|---|
| 11 | `canonical` |
| 12-13 | Unsplash への `preconnect` / `dns-prefetch` |
| 15-16 | favicon / apple-touch-icon |

したがって**スタイルを変えるときは `index.html` 冒頭の `<style>` ブロックを編集する。**
外部 CSS ファイルは存在しない。

### セクション構成（四季に対応）

| id | テーマ | 行 |
|---|---|---|
| `home` | Hero | 648 |
| `about` | Spring | 663 |
| `works` | Summer | 677 |
| `skills` | Autumn | 772 |
| `story` | Winter / Philosophy | 789 |
| `contact` | — | 800 |

※ 行番号は編集で動く。`grep -n '<section' index.html` で都度確認すること。

### CSS 変数

配色は和の色名で統一: `--ink` `--soft-ink` `--paper` `--line` `--moss` `--leaf` `--persimmon` `--gold`。
新しい色を足すときはこの命名に合わせる。

### ⚠️ 背景写真は Unsplash を直接参照している

`--bg-hero` `--bg-spring` `--bg-summer` `--bg-autumn` `--bg-winter` `--bg-contact` の 6 変数が
`https://images.unsplash.com/...` を指している（`index.html:51-56`）。
**外部サービスに依存しているため、Unsplash 側の都合で表示が壊れうる。**

ローカルに取り込みたい場合は `bash tools/fetch-backgrounds.sh` を実行する。
`assets/backgrounds/` にダウンロードし、`index.html` の変数をローカルパスへ自動で書き換える（冪等）。

## projects/ — 各作品

8 ディレクトリ。`index.html` の作品カードのリンク先と 1:1 で一致している。

基本構成は `index.html` + `app.js` + `styles.css`。うち 5 件が Service Worker を持つ PWA。

| slug | 表示名 | 種別 | `CACHE_PREFIX` |
|---|---|---|---|
| `reading-shelf` | Reading Shelf | PWA | `reading-shelf-` |
| `wabisabi` | 三分録 | PWA | `sanpunroku-` |
| `levellog` | LevelLog | PWA | `level-log-`（SW名は `service-worker.js`） |
| `quote` | 1日1名言 | PWA | `one-day-one-quote-` |
| `country-quiz` | 世界の国クイズ | PWA | `world-country-quiz-` |
| `cat-quiz` | 世界ねこ図鑑クイズ | 静的 | — |
| `contracts` | ビジネス契約ラーニング | 静的 | — |
| `money-anime` | 100円が冒険に出た!? | 静的 | — |

- `country-quiz` が最大規模。`assets/flags/` に SVG 国旗 195 個、`data/countries.json` を同梱。
  データ仕様は `projects/country-quiz/DATA_FORMAT.md` に独立して記載。
  国データは mledoze/countries 由来（ODbL-1.0）。**ライセンス表記を消さないこと。**
- `money-anime` はアプリではなくケーススタディ（`index.html` + `cover.jpg` のみ）。

### 全作品ページに入っている共通要素

各 `projects/<slug>/index.html` の `<head>` には次が揃っている。作品を追加するときも同じものを入れる。

- `<meta name="description">`
- `<link rel="icon" href="../../assets/favicon.svg">`
- `<link rel="canonical">`
- OGP 一式（`og:type` `og:locale` `og:site_name` `og:title` `og:description` `og:url` `og:image`）
- Twitter Card
- `<a class="portfolio-back" href="../../">` の戻り導線

<!-- ✏️ 新しい作品や構成変更を入れたら、ここを更新してください -->
