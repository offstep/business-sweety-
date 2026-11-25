import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const KEY = 'sb_cart'; // même clé que l'ancienne version : les paniers existants sont conservés
const Ctx = createContext(null);
export const useCart = () => useContext(Ctx);

const read = () => { try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; } };

export function CartProvider({ children }) {
  const [items, setItems] = useState(read);
  useEffect(() => { try { localStorage.setItem(KEY, JSON.stringify(items)); } catch { /* stockage indisponible */ } }, [items]);

  const add = useCallback((item) => setItems((cur) => {
    const found = cur.find((i) => i.key === item.key);
    return found
      ? cur.map((i) => (i.key === item.key ? { ...i, qty: Math.min(99, i.qty + item.qty) } : i))
      : [...cur, item];
  }), []);
  const setQty = useCallback((key, qty) => setItems((cur) =>
    (qty <= 0 ? cur.filter((i) => i.key !== key) : cur.map((i) => (i.key === key ? { ...i, qty: Math.min(99, qty) } : i)))), []);
  const count = useMemo(() => items.reduce((n, i) => n + i.qty, 0), [items]);

  return <Ctx.Provider value={{ items, add, setQty, count }}>{children}</Ctx.Provider>;
}
