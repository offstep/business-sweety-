// Service worker prudent : la boutique reste toujours à jour (réseau d'abord pour les pages).
const V = 'sweety-v1';
self.addEventListener('install', (e) => { e.waitUntil(caches.open(V).then((c) => c.addAll(['./', './index.html'])).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== V).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const r = e.request;
  if (r.method !== 'GET') return;
  if (new URL(r.url).origin !== self.location.origin) return; // Supabase et polices : jamais interceptés
  if (r.mode === 'navigate') { e.respondWith(fetch(r).catch(() => caches.match('./index.html'))); return; }
  e.respondWith(caches.match(r).then((hit) => {
    const net = fetch(r).then((res) => { if (res.ok) { const cp = res.clone(); caches.open(V).then((c) => c.put(r, cp)); } return res; }).catch(() => hit);
    return hit || net;
  }));
});
