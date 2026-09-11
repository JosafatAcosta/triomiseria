/* Trio Miseria · funcionamiento sin señal
   Guarda todo en el teléfono la primera vez que se abre con internet.
   Después la página abre igual aunque no haya datos. */

const CACHE = "trio-miseria-v1";

const ARCHIVOS = [
  "./",
  "./index.html",
  "./mapa.webp",
  "./mapa.jpg",
  "./icon-180.png",
  "./icon-192.png",
  "./icon-512.png",
  "./og.png",
  "./site.webmanifest"
];

// Al instalar, bajar y guardar todo
self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(ARCHIVOS))
      .then(() => self.skipWaiting())
  );
});

// Al activar, borrar versiones viejas
self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  if (new URL(req.url).origin !== self.location.origin) return;

  // Navegación: intentar red, y si no hay, servir la copia guardada
  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req)
        .then(res => {
          const copia = res.clone();
          caches.open(CACHE).then(c => c.put("./index.html", copia));
          return res;
        })
        .catch(() => caches.match("./index.html"))
    );
    return;
  }

  // Todo lo demás: primero la copia guardada, que es lo rápido y lo que sirve sin señal
  e.respondWith(
    caches.match(req).then(hit => {
      if (hit) return hit;
      return fetch(req).then(res => {
        if (res && res.status === 200 && res.type === "basic") {
          const copia = res.clone();
          caches.open(CACHE).then(c => c.put(req, copia));
        }
        return res;
      });
    })
  );
});

// Permite que la página pregunte si ya quedó todo guardado
self.addEventListener("message", e => {
  if (e.data === "estado") {
    caches.open(CACHE)
      .then(c => c.keys())
      .then(ks => e.source.postMessage({ listo: ks.length >= ARCHIVOS.length - 1, n: ks.length }));
  }
});
