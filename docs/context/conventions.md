# 作業のルール

<!-- ✏️ このファイルはあなたの好みを書く場所です。合わない項目は遠慮なく書き換えてください -->

## 対話

> 進め方・説明の粒度・前提知識は **`CLAUDE.md` の「個人設定」が正**。
> ここには重複して書かない（食い違うと事故になる）。

- 応答は**日本語**。
- 着手時は何をするかを一言だけ宣言してから進める。**承認は待たない**
  （確認が必要なのは `CLAUDE.md` に挙げた 2 例外＝`main` への push と削除のみ）。

## コード

- **ビルドしない。** npm、バンドラ、フレームワークを導入しない。ブラウザがそのまま読めるものだけ書く。
- **トップページの変更は `index.html` の中に閉じる。** 外部 CSS / JS ファイルを新設しない
  （かつて `style.css` と `main.js` が参照されないまま残り、削除された経緯がある → `docs/decisions/0001`）。
- 既存の書き方に合わせる。インデント 2 スペース、CSS 変数は和色の命名を踏襲。
- HTML は日本語コンテンツ前提（`<html lang="ja">`）。
- 画像は `loading="lazy" decoding="async"` を付ける。
  作品サムネイルは **WebP + JPEG フォールバックを `<picture>` で**指定する（1280×800）。
- 外部リンクは `target="_blank" rel="noreferrer"`。
- **作品ページを追加したら `sitemap.xml` にも URL を足す。**

## PWA 作品を編集するときの必須手順 ⚠️

`projects/` 配下の 5 件（`reading-shelf` `wabisabi` `levellog` `quote` `country-quiz`）は
Service Worker でキャッシュしている。**ファイルを直しただけでは利用者に反映されない。**

各 SW の冒頭が 2 段構成になっている。

```js
const CACHE_PREFIX = "reading-shelf-";        // 作品ごとに固有。変えない
const CACHE_NAME = `${CACHE_PREFIX}v5`;       // ← 編集したら v6 に上げる
```

`activate` は**自分のプレフィックスで始まるキャッシュだけ**を削除する。

```js
keys.filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME)
```

**この `startsWith(CACHE_PREFIX)` を外してはいけない。** GitHub Pages では全作品が同一オリジンで
動くため Cache Storage を共有しており、外すと他の作品のオフラインキャッシュを巻き込んで消す
（2026-09-02 の PR #3 で修正された実際の不具合。経緯は `docs/decisions/0003`）。

- [ ] 中身を変えたら `CACHE_NAME` の版数を +1 する
- [ ] **ファイルを新規追加した場合**は、SW 内の `APP_SHELL` / `ASSETS` 配列にもパスを足す
      （足し忘れるとオフライン時だけ 404 になり、手元では気づけない）
- [ ] 新しく SW を作る場合も、必ず作品固有の `CACHE_PREFIX` を切る

## Git

- `main` への push = **即本番公開**。慎重に。
- 作業は必ずブランチを切る。
- コミットメッセージは英語・命令形（既存の履歴に準拠。例: `Add illustrated country quiz cover`）。

## 確認

自動テストはない。変更したら以下を目視する。

```bash
python3 -m http.server 3000   # → http://localhost:3000
```

Service Worker を使う作品は `file://` では動かないので、必ずサーバー経由で開くこと。

- [ ] トップページの該当セクションが崩れていない
- [ ] スマホ幅（375px）で崩れていない
- [ ] 作品カードのリンクが 404 にならない

## やらないこと

- `README.md` や `index.html` を、頼まれていないのに「ついでに」整理しない。
- 作品の説明文・実績の数値を創作しない。事実が不明なら聞く。
