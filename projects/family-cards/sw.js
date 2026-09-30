// GitHub Pages では全作品が同一オリジンのため Cache Storage を共有する。
// 後片付けは自分のプレフィックスを持つものだけに限定する（docs/decisions/0003）。
// ファイルを直したら CACHE_NAME の版数を上げ、ファイルを増やしたら ASSETS にも足すこと。
const CACHE_PREFIX = "family-cards-";
const CACHE_NAME = `${CACHE_PREFIX}v1`;
const ASSETS = [
  "./",
  "./index.html",
  "./styles.css",
  "./core.js",
  "./app.js",
  "./games/babanuki.js",
  "./games/daifugo.js",
  "./games/shichinarabe.js",
  "./games/poker.js",
  "./games/doubt.js",
  "./games/pageone.js",
  "./games/shinkei.js",
  "./games/speed.js",
  "./games/blackjack.js",
  "./games/highlow.js",
  "./manifest.webmanifest",
  "./icon.svg",
  "./icon-180.png",
  "./icon-192.png",
  "./icon-512.png",
  "../../assets/favicon.svg",
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME).map((key) => caches.delete(key)))),
  );
  self.clients.claim();
});

// 画面（HTML）はネット優先で最新を取り、つながらないときはキャッシュ。
// それ以外（JS・CSS・画像）はキャッシュ優先で、すぐ開けるようにする。
self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET" || new URL(request.url).origin !== self.location.origin) return;
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put("./index.html", copy));
          return response;
        })
        .catch(() => caches.match("./index.html")),
    );
    return;
  }
  event.respondWith(
    caches.match(request, { ignoreSearch: true }).then(
      (hit) =>
        hit ||
        fetch(request).then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return response;
        }),
    ),
  );
});
