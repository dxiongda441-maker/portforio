# 構成の実態

> 最終確認: 2026-10-31 / 確認者: Claude
> ここは「今どうなっているか」を書く場所。「なぜそうしたか」は `docs/decisions/` に書く。

## 全体像

ビルド工程を持たない静的サイト。`.github/workflows/deploy.yml` が `main` への push を検知し、
`actions/upload-pages-artifact` で**リポジトリのルート全体をそのまま** GitHub Pages に配信する。
つまり「リポジトリの見た目 = 公開される中身」。生成物や中間ファイルの概念はない。

```
index.html                  トップページ（HTML + CSS を1ファイルに同梱）。サービスページへの入口
service/index.html          サービス紹介（料金・見本・流れ・問い合わせ）。1ファイル完結・script 0 個（0008）
samples/<業種>/             営業用の見本（架空の店舗）。noindex・sitemap に載せない（0008）
_headers                    Cloudflare 用の HTTP ヘッダー。GitHub Pages では無視される（0009）
404.html                    404 ページ
robots.txt / sitemap.xml    クローラ向け
CLAUDE.md / docs/           このプロジェクトの記憶（docs/chats.md = チャット別の成果物一覧）
assets/
  favicon.svg               ファビコン
  apple-touch-icon.png
  og-cover.jpg              SNSシェア用 OGP（1200×630）
  portfolio/                作品カードのサムネイル（.jpg と同名 .webp を併置）
projects/<slug>/            各作品の実体。それぞれ独立した静的アプリ
tools/fetch-backgrounds.sh  背景写真をローカルに取り込むスクリプト（未実行）
tools/check-learning-game.js  学習ゲームの問題データ検査（`node tools/check-learning-game.js <slug>`・依存なし）
tools/check.sh              ルールの機械チェック（読むだけ・書き換えない）
tools/screenshot.sh         ヘッドレス Chromium で撮影（出力はリポジトリ外）
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

11 ディレクトリあり、`index.html` の作品カードのリンク先と 1:1 で一致している（リンク切れなし）。

基本構成は `index.html` + `app.js` + `styles.css`。うち 6 件は
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
| `security-quest` | セキュリティ・クエスト | 静的 | — |
| `family-cards` | 年末ファミリートランプ | PWA（複数JS） | `family-cards-` |
| `cafe-lp` | 琥珀 KOHAKU COFFEE | 静的（HTML+CSSのみ） | — |

- `country-quiz` が最大規模。`assets/flags/` に SVG 国旗 195 個、`data/countries.json` を同梱。
  データ仕様は `projects/country-quiz/DATA_FORMAT.md` に独立して記載。
  国データは mledoze/countries 由来（ODbL-1.0）。**ライセンス表記を消さないこと。**
- `contracts` は `data.js` にデータを分離。
- 各作品フォルダに `README.md`（概要・ファイルの役割・編集時の注意）がある。どのチャットで作ったかは `docs/chats.md`。
- `cafe-lp` は架空のカフェの LP。`index.html` + `styles.css` のみで JS なし。LP の型との対応は同フォルダの `README.md`。
- `money-anime` はアプリではなくケーススタディ（`index.html` + `cover.jpg` のみ）。
- `security-quest` は `app.js`（エンジン）＋ `data/acts.js` ＋ `data/ch01.js`〜`ch18.js`（章ごとのデータ）。
  CSP を `<meta>` で設定しており、外部スクリプト・外部通信は不可。問題の追加は各章の `quiz` 配列の**末尾**に
  （途中に挿すと自動採番の問題IDがずれ、復習リストが別問題を指す）。経緯は `docs/decisions/0004`。
  データを変えたら `node tools/check-learning-game.js security-quest` で検査する（形式エラーと、選択肢の偏り）。
  同じ仕組みで別分野の学習ゲームを作るときは `/learning-game <分野>` コマンド（`.claude/commands/learning-game.md`）を使う。
- `family-cards` はトランプ10種のゲーム集。`app.js` と `styles.css` に加えて、共通部品の `core.js` と
  1ゲーム1ファイルの `games/*.js` を**通常の `<script>` で順番に読み込む**（ES Modules は使わない）。
  ゲームを足すときは `games/` にファイルを作り、`registerGame({...})` を呼び、`index.html` の
  `<script>` 列（`app.js` より前）に1行足す。**さらに `sw.js` の `ASSETS` にも足す**（2026-09-30 に PWA 化。`docs/decisions/0007`）。
  - 設定項目に `group: "local"` と `help` を付けると「ローカルルール」欄に説明つきで並ぶ。
    `presets` を定義すると「おすすめセット」ボタンが出る（大富豪が例）。
  - `levels: true` を付けたゲームには、設定画面に「CPUの強さ（よわい/ふつう/つよい）」が自動で出る（`s.options.level`）。
  - `logic: {...}` に載せた純粋関数（大富豪の役判定、ポーカーの役評価など）は `GAMES` 経由で
    ブラウザのコンソールから直接呼べる。ルールを直したらここで確かめる。
  - 効果音は音声ファイルを持たず、`core.js` の `Sound` が Web Audio で合成する（`docs/decisions/0005`）。

### 全作品ページに入っている共通要素

各 `projects/<slug>/index.html` の `<head>` には次が揃っている。作品を追加するときも同じものを入れる。

- `<meta name="description">`
- `<link rel="icon" href="../../assets/favicon.svg">`
- `<link rel="canonical">`
- OGP 一式（`og:type` `og:locale` `og:site_name` `og:title` `og:description` `og:url` `og:image`）
- Twitter Card
- `href="../../"` の戻り導線（通常は `<a class="portfolio-back">`。`money-anime` だけ `<a class="back" href="../../#works">`）

`tools/check.sh` がこれらの有無を全作品について確認する。

<!-- ✏️ 新しい作品や構成変更を入れたら、ここを更新してください -->
