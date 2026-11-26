import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const KEY = 'sb_favs';
const Ctx = createContext({ ids: [], has: () => false, toggle: () => {} });
export const useFavs = () => useContext(Ctx);

const read = () => { try { const v = JSON.parse(localStorage.getItem(KEY) || '[]'); return Array.isArray(v) ? v : []; } catch { return []; } };

// Favoris enregistrés sur l'appareil (aucune donnée envoyée au serveur).
export function FavProvider({ children }) {
  const [ids, setIds] = useState(read);
  useEffect(() => { try { localStorage.setItem(KEY, JSON.stringify(ids)); } catch { /* stockage indisponible */ } }, [ids]);
  const toggle = useCallback((id) => setIds((c) => (c.includes(id) ? c.filter((x) => x !== id) : [id, ...c])), []);
  const value = useMemo(() => ({ ids, has: (id) => ids.includes(id), toggle }), [ids, toggle]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
