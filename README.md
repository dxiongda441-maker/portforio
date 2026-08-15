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
| スキルの数値 | `.skill-panel` 内の `<meter>` |
| 連絡先 | `#contact` セクション |
| SNSシェア時のタイトル・説明・画像 | `<head>` 内の `og:` / `twitter:` メタタグ |

作品を追加するときは `projects/` に新しいディレクトリを作り、`index.html` の
`.works-grid` にカードを1枚追加し、サムネイルを `assets/portfolio/` に置きます。

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
