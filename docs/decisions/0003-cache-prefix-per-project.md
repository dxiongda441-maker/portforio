# 0003. Service Worker のキャッシュ名を作品ごとのプレフィックスで名前空間化する

- **日付**: 2026-09-04（記録） / 実装は `main` の `1c9fd0e` 前後
- **状態**: 採用
- **関係する場所**: `projects/*/sw.js`, `projects/levellog/service-worker.js`

## 背景

GitHub Pages では全作品が **同一オリジン**（`dxiongda441-maker.github.io`）で動く。
Cache Storage はオリジン単位で共有されるため、作品どうしが同じ棚を使っている。

当初の各 SW は `activate` でこう書いていた。

```js
keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
```

「自分の最新版以外を全部消す」という意味になり、**ある作品を開くたびに、他の作品の
オフラインキャッシュが道連れで消える**状態だった。利用者からは「オフラインで開けなくなる作品がある」
という形で現れる。

## 決めたこと

キャッシュ名を 2 段構成にし、削除対象を自分のプレフィックス配下に限定する。

```js
const CACHE_PREFIX = "reading-shelf-";
const CACHE_NAME = `${CACHE_PREFIX}v5`;

// activate
keys.filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME)
```

プレフィックスは作品ごとに固有（`reading-shelf-` `sanpunroku-` `level-log-`
`one-day-one-quote-` `world-country-quiz-`）。

## 検討して捨てた案

- **キャッシュ削除をやめる**: 古いキャッシュが無限に溜まり、ストレージを圧迫する。
  更新も届かなくなるので本末転倒。
- **作品ごとにサブドメインを分ける**: オリジンが分かれれば根本解決だが、
  GitHub Pages の1リポジトリ＝1サイト構成を捨てることになり、コストが見合わない。

## 結果と影響

- 作品を跨いでもオフラインキャッシュが保持されるようになった
- **新しく SW を作るときは必ず固有の `CACHE_PREFIX` を切る必要がある。**
  `startsWith(CACHE_PREFIX)` を外すと同じ事故が再発する（`docs/context/conventions.md` に手順あり）
