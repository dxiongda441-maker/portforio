const CACHE_NAME = "world-country-quiz-v8";
const CORE_SHELL = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./manifest.webmanifest",
  "./data/world-map.geojson",
  "./assets/app-icon.svg",
  "./assets/app-icon-192.png",
  "./assets/app-icon-512.png",
  "./assets/app-icon-maskable-512.png"
];

// 初回インストールでは起動に必要な分だけ取得する。国旗は表示したものが
// fetch ハンドラ経由で自動的にキャッシュされ、全件のまとめ取得はページ側から
// "prefetch-flags" を受け取ったときにバックグラウンドで行う。
self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(CORE_SHELL);
    const response = await fetch("./data/countries.json");
    await cache.put("./data/countries.json", response);
  })());
  self.skipWaiting();
});

let flagPrefetch = null;

async function prefetchFlags() {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match("./data/countries.json");
  const master = await (cached || await fetch("./data/countries.json")).json();
  const flags = master.countries.map((country) => country.flagPath);
  for (let index = 0; index < flags.length; index += 12) {
    await Promise.all(
      flags.slice(index, index + 12).map(async (url) => {
        if (await cache.match(url)) return;
        // 1枚失敗しても残りの取得は続ける。
        await cache.add(url).catch(() => {});
      })
    );
  }
}

self.addEventListener("message", (event) => {
  if (event.data?.type !== "prefetch-flags") return;
  flagPrefetch = flagPrefetch || prefetchFlags().catch(() => {});
  event.waitUntil(flagPrefetch);
});

self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))));
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  if (event.request.mode === "navigate") {
    event.respondWith(fetch(event.request).then((response) => {
      const copy = response.clone();
      caches.open(CACHE_NAME).then((cache) => cache.put("./index.html", copy));
      return response;
    }).catch(() => caches.match("./index.html")));
    return;
  }

  event.respondWith(caches.match(event.request).then((cached) => {
    const network = fetch(event.request).then((response) => {
      if (response.ok) {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
      }
      return response;
    });
    return cached || network;
  }));
});
