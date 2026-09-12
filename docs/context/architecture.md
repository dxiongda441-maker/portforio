# 構成の実態

> 最終確認: 2026-09-04 / 確認者: Claude
> ここは「今どうなっているか」を書く場所。「なぜそうしたか」は `docs/decisions/` に書く。

## 全体像

ビルド工程を持たない静的サイト。`.github/workflows/deploy.yml` が `main` への push を検知し、
`actions/upload-pages-artifact` で**リポジトリのルート全体をそのまま** GitHub Pages に配信する。
つまり「リポジトリの見た目 = 公開される中身」。生成物や中間ファイルの概念はない。

```
index.html                  トップページ（HTML + CSS を1ファイルに同梱・821行）
404.html                    404 ページ
robots.txt / sitemap.xml    クローラ向け
CLAUDE.md / docs/           このプロジェクトの記憶
assets/
  favicon.svg               ファビコン
  apple-touch-icon.png
  og-cover.jpg              SNSシェア用 OGP（1200×630）
  portfolio/                作品カードのサムネイル（.jpg と同名 .webp を併置）
projects/<slug>/            各作品の実体。それぞれ独立した静的アプリ
tools/fetch-backgrounds.sh  背景写真をローカルに取り込むスクリプト（未実行）
.github/workflows/deploy.yml  Pages デプロイ
```

編集箇所の早見表は `README.md` の「差し替える場所」にある。重複させないのでそちらを見ること。

## index.html — 自己完結している

**`<script>` タグは 0 個、CSS の外部読み込みも 0 個。** 検証コマンド:

```bash
grep -c '<script' index.html            # => 0
grep -c 'rel="stylesheet"' index.html   # => 0
```

`<link>` タグ自体は 5 個あるが、canonical / favicon / apple-touch-icon /
Unsplash 向けの `preconnect` `dns-prefetch` だけで、スタイルは読み込んでいない。

したがって:

- **スタイルを変える** → `index.html` 冒頭の `<style>` ブロックを編集する（外部 CSS ファイルは存在しない）
- **作品カードを追加する** → `#works` セクション内の `<article class="project-card">` を直接複製して編集する

### セクション構成（四季に対応）

| id | テーマ | 行番号の目安 |
|---|---|---|
| `home` | Hero | 648〜 |
| `about` | Spring | 663〜 |
| `works` | Summer | 677〜 |
| `skills` | Autumn | 772〜 |
| `story` | Winter / Philosophy | 789〜 |
| `contact` | — | 800〜 |

※ 行番号は編集で動く。`grep -n '<section' index.html` で都度確認すること。

### CSS 変数（`index.html` の `<style>` 内）

`--ink` `--soft-ink` `--paper` `--line` `--moss` `--leaf` `--persimmon` `--gold`
和の色名で統一されている。新しい色を足すときはこの命名に合わせる。

### ⚠️ 背景写真は Unsplash を直リンクしている

`--bg-hero` `--bg-spring` `--bg-summer` `--bg-autumn` `--bg-winter` `--bg-contact` の 6 変数が
`https://images.unsplash.com/...` を指している（`index.html:51-56`）。
**外部サービス依存なので、Unsplash 側の都合で背景が出なくなりうる。**

ローカル化する場合は `bash tools/fetch-backgrounds.sh` を実行する。
`assets/backgrounds/` にダウンロードし、`index.html` の変数をローカルパスへ自動で書き換える（冪等）。
取り込んだ画像はコミットすること。**未実行。**

## 旧デザインの残骸（`style.css` / `main.js`）は削除済み

2025-10 のネオン基調デザインの遺物で、`index.html` から一切参照されないまま残っていた。
**2026-09-02 の PR #3 で削除**したので、もう存在しない。

当時の実装を読みたいときは git 履歴から取れる。

```bash
git show 76ace1e:style.css
git show 76ace1e:main.js
```

経緯は `docs/decisions/0001-static-site-single-file.md`。

## projects/ — 各作品

8 ディレクトリあり、`index.html` の作品カードのリンク先と 1:1 で一致している（リンク切れなし）。

基本構成は `index.html` + `app.js` + `styles.css`。うち 5 件は
`manifest.webmanifest`(または `manifest.json`) + `sw.js`(または `service-worker.js`) を持つ **PWA**。

| slug | 表示名 | 構成 | `CACHE_PREFIX` |
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
- `contracts` は `data.js` にデータを分離。
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
