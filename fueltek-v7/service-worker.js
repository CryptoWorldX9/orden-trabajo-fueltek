const CACHE = "fueltek-static-v1";
const FILES = [
  "/",
  "/index.html",
  "/css/styles.css",
  "/js/main.js",
  "/js/db.js",
  "/js/ui.js",
  "/js/backup.js",
  "/assets/logo-fueltek.png",
  "/manifest.json"
];

self.addEventListener("install", evt=>{
  evt.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES)));
  self.skipWaiting();
});

self.addEventListener("fetch", evt=>{
  evt.respondWith(
    caches.match(evt.request).then(resp => resp || fetch(evt.request))
  );
});

self.addEventListener("activate", evt=>{
  evt.waitUntil(clients.claim());
});
