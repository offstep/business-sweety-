import { useEffect, useState } from 'react';

export const fcfa = (n) => `${Number(n).toLocaleString('fr-FR')} FCFA`;
export const safe = (u) => (/^https?:\/\//i.test(u || '') || /^[\w\-./?=&#%]+$/.test(u || '') ? u : '');
export const sortBy = (a, k = 'position') => [...(a || [])].sort((x, y) => (x[k] ?? 0) - (y[k] ?? 0));
export const waLink = (n, t) => `https://wa.me/${String(n || '').replace(/\D/g, '')}?text=${encodeURIComponent(t)}`;
export const normalizePhone = (r) => String(r || '').replace(/\D/g, '');
export const phoneEmail = (d) => `${d}@clients.sweety.app`; // identifiant technique, jamais affiché

export const CARD_COLS = 'id, name, slug, price, stock, low_stock_threshold, product_images(url, position)';
export const cover = (p) => sortBy(p.product_images)[0]?.url;
export const isLow = (p, s) => p.stock <= (p.low_stock_threshold ?? s.low_stock_threshold ?? 5);

// Les liens saisis en administration (catalogue.html, /categories/x, https://…) deviennent des routes React.
export function resolveLink(u) {
  const v = safe(u);
  if (!v) return null;
  if (/^https?:/i.test(v)) return { href: v, external: true };
  let m;
  if ((m = v.match(/^\/?categories\/([^/?#]+)/))) return { to: `/catalogue?cat=${m[1]}` };
  if ((m = v.match(/^\/?produits\/([^/?#]+)/))) return { to: `/produit/${m[1]}` };
  if ((m = v.match(/^\/?produit\.html\?(?:[^#]*&)?slug=([^&#]+)/))) return { to: `/produit/${m[1]}` };
  const clean = v.replace(/^\//, '').replace(/\.html(?=$|[?#])/, '');
  return { to: clean === '' || clean === 'index' ? '/' : `/${clean}` };
}

// Charge des données asynchrones : { loading, data, error }
export function useAsync(fn, deps = []) {
  const [s, setS] = useState({ loading: true, data: null, error: null });
  useEffect(() => {
    let ok = true;
    setS((v) => ({ ...v, loading: true }));
    Promise.resolve().then(fn).then(
      (data) => ok && setS({ loading: false, data, error: null }),
      (error) => ok && setS({ loading: false, data: null, error }),
    );
    return () => { ok = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return s;
}
