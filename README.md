# Alter Portfolio

SpaceXのような大きなビジュアル主導の構成を、日本の自然、四季、伝統文化の空気感に置き換えたポートフォリオです。

ビルド不要の静的サイトで、`index.html` を開けばそのまま動きます。npm やフレームワークは使っていません。

## 公開URL

- GitHub Pages: https://dxiongda441-maker.github.io/portforio/
- GitHub repository: https://github.com/dxiongda441-maker/portforio

## ローカルで確認する

ファイルを直接開くだけでも表示できます。

```bash
open index.html
```

Service Worker を使う作品（Reading Shelf、三分録、1日1名言、世界の国クイズ、LevelLog）は
`file://` では正しく動かないため、簡易サーバー経由で確認してください。

```bash
python3 -m http.server 3000
```

ブラウザで `http://localhost:3000` を開きます。

## 構成

```
index.html          トップページ（HTML・CSSを1ファイルに同梱）
404.html            存在しないURLに来たときのページ
robots.txt          クローラ向け設定
sitemap.xml         トップと全作品ページのURL一覧
assets/
  favicon.svg       サイトのファビコン
  apple-touch-icon.png
  og-cover.jpg      SNSシェア用のOGP画像（1200×630）
  portfolio/        作品カードのサムネイル
projects/           各作品の実体。1ディレクトリ＝1作品で完結
tools/              メンテナンス用スクリプト
.github/workflows/  main へのpushでGitHub Pagesへ自動デプロイ
```

## 背景写真をローカルに置き換える

トップページの背景写真6枚は、現在Unsplashを直接参照しています。表示速度を安定させたい、
オフラインでも背景を出したい場合は、次のコマンドでローカルに取り込めます。

```bash
bash tools/fetch-backgrounds.sh
```

6枚を `assets/backgrounds/` にダウンロードし（`cwebp` があればWebPに変換）、
`index.html` の `--bg-*` 変数をローカルパスへ自動で書き換えます。何度実行しても結果は同じです。
取り込んだ画像はコミットしてください。

## 差し替える場所

すべて `index.html` を直接編集します。

| 変更したいもの | 場所 |
| --- | --- |
| 名前、肩書き、リード文 | `.hero-content` 内 |
| 作品カード | `.works-grid` 内の `<article class="project-card">` |
| できること（実装・情報設計など） | `.skill-panel` 内の `.capability` |
| 連絡先 | `#contact` セクション |
| SNSシェア時のタイトル・説明・画像 | `<head>` 内の `og:` / `twitter:` メタタグ |

## 作品を追加するとき

1. `projects/` に新しいディレクトリを作る
2. サムネイルを `assets/portfolio/` に置く。表示用のWebPと、OGP・フォールバック用の
   JPEGを1枚ずつ、どちらも 1280×800 で用意する
3. `index.html` の `.works-grid` にカードを追加する。画像は `<picture>` で
   WebPを先に、JPEGをフォールバックとして指定する
4. 作品ページ側に次を入れる（既存の作品ページが参考になる）
   - `<a class="portfolio-back" href="../../">` の戻り導線
   - `description` / `canonical` / OGP / Twitter Card / `rel="icon"`

Service Worker を持たせる場合、キャッシュ名は必ず作品ごとのプレフィックスにして、
`activate` での削除も自分のプレフィックスに限定してください。GitHub Pages では
全作品が同一オリジンで動くため、Cache Storage を共有しています。

## デプロイ

`main` ブランチにpushすると `.github/workflows/deploy.yml` が動き、リポジトリ全体が
GitHub Pagesへ公開されます。手動の操作は不要です。

## 掲載作品

| 作品 | 種別 | ディレクトリ |
| --- | --- | --- |
| Reading Shelf | 読書記録PWA | `projects/reading-shelf/` |
| 三分録 | 音声アウトプット習慣PWA | `projects/wabisabi/` |
| LevelLog | 行動をEXP化する習慣アプリ | `projects/levellog/` |
| 1日1名言 | 日替わり名言PWA | `projects/quote/` |
| 世界の国クイズ | 地図・国旗の学習ゲーム | `projects/country-quiz/` |
| 世界ねこ図鑑クイズ | 図鑑＋クイズ | `projects/cat-quiz/` |
| ビジネス契約ラーニング | 契約の学習アプリ | `projects/contracts/` |
| 100円が冒険に出た!? | AIアニメ制作ケーススタディ | `projects/money-anime/` |

## 設計上の判断

### 同一オリジンで、作品どうしがデータを壊し合っていた

GitHub Pages では全作品が `dxiongda441-maker.github.io` という同一オリジンで動く。
その結果、各作品の Service Worker と localStorage が、同じ保存領域を共有していた。

**起きたこと。** Service Worker の `activate` は、ふつう「自分の最新キャッシュ以外を削除する」
実装にする。作品ごとに独立したサイトのつもりで書いていたため、この削除処理が
他の作品のキャッシュまで消していた。ある作品を開くと、別の作品のオフライン動作が壊れる。

**打った手。** キャッシュ名を作品ごとのプレフィックスで名前空間化し、削除対象を
自分のプレフィックスに限定した。

```js
const CACHE_PREFIX = "reading-shelf-";
const CACHE_NAME = `${CACHE_PREFIX}v5`;

// 削除は自分のプレフィックスを持つものだけに限定する
keys.filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME);
```

**同じ問題が localStorage にもあった。** `themes` `records` のような一般的なキー名を
使っていたため、作品間で衝突しうる状態だった。キーを作品名で名前空間化したうえで、
すでに使っている人のデータを失わないよう移行処理を入れている。旧キーの値を新キーへ移し、
新キーに値があるときは上書きせず、移行後に旧キーを削除する（`projects/wabisabi/app.js`）。

**結果。** Service Worker を持つ5作品が、互いに干渉せずオフラインで動く。

### ビルドを持たない

npm もバンドラも使っていない。`index.html` を開けばそのまま動く。
作品ごとに1ディレクトリで完結させ、外部への依存を持たせていない。
個人で8作品を並行して保守するうえで、ツールチェーンの更新に時間を取られないことを優先した。

トレードオフとして、型チェックと自動テストは持っていない。
規模が大きくなるか、複数人で触るようになった時点で、この判断は見直す必要がある。

### 作品ページに共通で入れているもの

各作品は単体で開かれることを前提にしている。そのため作品ページ側に、
ポートフォリオへの戻り導線、`description`、`canonical`、OGP、Twitter Card、
`rel="icon"` を個別に持たせている。トップページからの流入だけを想定しない。
