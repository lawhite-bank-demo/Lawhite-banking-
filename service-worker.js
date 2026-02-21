self.addEventListener("install", e => {
  e.waitUntil(
    caches.open("app-cache").then(cache =>
      cache.addAll([
        "index.html",
        "dashboard.html",
        "profile.html"
      ])
    )
  );
});

self.addEventListener("fetch", e => {
  e.respondWith(
    caches.match(e.request).then(res => res || fetch(e.request))
  );
});