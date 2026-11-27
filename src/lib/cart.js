import { useEffect, useState } from 'react';

// Panier conservé dans le navigateur.
export const cart = {
  get() { try { return JSON.parse(localStorage.getItem('sb_cart') || '[]'); } catch { return []; } },
  set(items) { try { localStorage.setItem('sb_cart', JSON.stringify(items)); } catch {} window.dispatchEvent(new Event('sb-cart')); },
  count() { return this.get().reduce((n, i) => n + i.qty, 0); },
  clear() { this.set([]); },
  add(item) {
    const items = this.get(); const f = items.find((i) => i.key === item.key);
    if (f) f.qty = Math.min(99, f.qty + item.qty); else items.push(item);
    this.set(items);
  },
  setQty(key, q) { this.set(q <= 0 ? this.get().filter((i) => i.key !== key) : this.get().map((i) => (i.key === key ? { ...i, qty: Math.min(99, q) } : i))); },
};

export function useCart() {
  const [items, setItems] = useState(() => cart.get());
  useEffect(() => {
    const h = () => setItems(cart.get());
    window.addEventListener('sb-cart', h); window.addEventListener('storage', h);
    return () => { window.removeEventListener('sb-cart', h); window.removeEventListener('storage', h); };
  }, []);
  return items;
}
