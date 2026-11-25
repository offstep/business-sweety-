import { useEffect, useState } from 'react';

// Exécute une fonction asynchrone quand les dépendances changent.
// keep=true : conserve les anciennes données pendant le rechargement (utile en admin).
export function useAsync(fn, deps = [], keep = false) {
  const [state, set] = useState({ data: undefined, error: null, loading: true });
  useEffect(() => {
    let on = true;
    set((s) => ({ data: keep ? s.data : undefined, error: null, loading: true }));
    Promise.resolve()
      .then(fn)
      .then((data) => on && set({ data, error: null, loading: false }))
      .catch((error) => on && set({ data: undefined, error, loading: false }));
    return () => { on = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return state;
}

// Transforme { data, error } de Supabase en valeur ou exception.
export async function must(builder) {
  const { data, error } = await builder;
  if (error) throw error;
  return data;
}
