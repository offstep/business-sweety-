// Service worker Sweety Business (version React / Vite).
// - Pages et fichiers du site : réseau d'abord (toujours à jour), copie de secours hors ligne.
// - Photos des produits et polices : copie d'abord, rafraîchie en arrière-plan.
// - JAMAIS en cache : l'API Supabase (commandes, comptes, prix, stock) et les requêtes non-GET.
const V = 'sweety-v2';
const SHELL = `${V}-shell`, IMG = `${V}-img`, LIB = `${V}-lib`;
const FILES = ['./', 'index.html', 'offline.html', 'manifest.json', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png'];

self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const c = await caches.open(SHELL);
    await Promise.all(FILES.map((f) => c.add(new Request(f, { cache: 'reload' })).catch(() => {})));
  })());
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (!k.startsWith(V)) await caches.delete(k);
    await self.clients.claim();
  })());
});

self.addEventListener('message', (e) => { if (e.data === 'SKIP_WAITING') self.skipWaiting(); });

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin === location.origin) return e.respondWith(networkFirst(req));
  if (url.hostname.endsWith('.supabase.co')) {
    if (url.pathname.startsWith('/storage/v1/object/public/')) return e.respondWith(staleWhileRevalidate(req, IMG, 80));
    return; // API, auth, rpc : jamais mis en cache
  }
  if (['fonts.googleapis.com', 'fonts.gstatic.com'].includes(url.hostname)) return e.respondWith(staleWhileRevalidate(req, LIB, 40));
});

async function networkFirst(req) {
  const cache = await caches.open(SHELL);
  try {
    const res = await Promise.race([fetch(req), new Promise((_, rej) => setTimeout(() => rej(new Error('lent')), 6000))]);
    if (res.ok && res.type === 'basic') cache.put(req, res.clone());
    return res;
  } catch {
    const hit = await cache.match(req, { ignoreSearch: req.mode === 'navigate' });
    if (hit) return hit;
    if (req.mode === 'navigate') return (await cache.match('offline.html')) || Response.error();
    return Response.error();
  }
}

async function staleWhileRevalidate(req, name, max) {
  const cache = await caches.open(name);
  const hit = await cache.match(req);
  const net = fetch(req).then(async (res) => {
    if (res.ok || res.type === 'opaque') { await cache.put(req, res.clone()); trim(cache, max); }
    return res;
  }).catch(() => null);
  return hit || (await net) || Response.error();
}

async function trim(cache, max) {
  const keys = await cache.keys();
  for (let i = 0; i < keys.length - max; i++) await cache.delete(keys[i]);
}
