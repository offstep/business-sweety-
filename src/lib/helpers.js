export const fcfa = (n) => `${Number(n).toLocaleString('fr-FR')} FCFA`;

// Accepte les URL http(s) et les chemins simples ; refuse tout le reste (javascript:, data:…).
export const safe = (u) => (/^https?:\/\//i.test(u || '') || /^[\w\-./?=&#%]+$/.test(u || '') ? u : '');

// Lien saisi en admin → { external, href } ; les chemins internes deviennent des routes React Router.
export function toRoute(u) {
  const v = safe(u);
  if (!v) return null;
  if (/^https?:\/\//i.test(v)) return { external: true, href: v };
  const p = v.replace(/^\/+/, '').replace(/^index\.html$/, '').replace(/\.html(?=$|\?)/, '');
  return { external: false, href: `/${p}` };
}

export const sortBy = (a, k = 'position') => [...(a || [])].sort((x, y) => (x[k] ?? 0) - (y[k] ?? 0));

// Le numéro vient toujours de la table settings (jamais codé en dur).
export const waLink = (n, t) => `https://wa.me/${String(n || '').replace(/\D/g, '')}?text=${encodeURIComponent(t)}`;

export const normalizePhone = (r) => String(r || '').replace(/\D/g, '');
export const isValidPhone = (d) => d.length >= 8 && d.length <= 15;
export const phoneEmail = (d) => `${d}@clients.sweety.app`; // identifiant technique, jamais affiché

export const slugify = (s) =>
  String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80) || 'produit';

export const CARD_COLS = 'id, name, slug, price, stock, low_stock_threshold, product_images(url, position)';
export const cover = (p) => sortBy(p.product_images)[0]?.url;
// « Bientôt épuisé » : seuil du produit, sinon seuil global. Jamais de quantité exacte.
export const isLow = (p, s) => p.stock <= (p.low_stock_threshold ?? s.low_stock_threshold ?? 5);
