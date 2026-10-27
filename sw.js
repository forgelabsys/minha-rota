// Guarda o app no celular para abrir sem internet.
// Troque a versão a cada publicação para o celular baixar a nova.
const CACHE = "minharota-v1";
const ARQUIVOS = ["./", "./index.html", "./manifest.webmanifest", "./icons/icon-192.png", "./icons/icon-512.png", "./icons/maskable-512.png", "./icons/apple-touch-icon.png"];

self.addEventListener("install", ev => {
  ev.waitUntil(caches.open(CACHE).then(c => c.addAll(ARQUIVOS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", ev => {
  ev.waitUntil(caches.keys()
    .then(nomes => Promise.all(nomes.filter(n => n !== CACHE).map(n => caches.delete(n))))
    .then(() => self.clients.claim()));
});

self.addEventListener("fetch", ev => {
  const req = ev.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  const proprio = url.origin === location.origin;
  const fonte = url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com";
  if (!proprio && !fonte) return;

  // Página: tenta a internet primeiro (pega a versão nova), sem sinal usa a guardada.
  if (req.mode === "navigate") {
    ev.respondWith(fetch(req)
      .then(resp => { const copia = resp.clone(); caches.open(CACHE).then(c => c.put("./index.html", copia)); return resp; })
      .catch(() => caches.match("./index.html")));
    return;
  }

  // Ícones e fontes: usa o guardado e atualiza por trás.
  ev.respondWith(caches.match(req).then(guardado => {
    const rede = fetch(req).then(resp => {
      if (resp.ok || resp.type === "opaque") { const copia = resp.clone(); caches.open(CACHE).then(c => c.put(req, copia)); }
      return resp;
    }).catch(() => guardado);
    return guardado || rede;
  }));
});
