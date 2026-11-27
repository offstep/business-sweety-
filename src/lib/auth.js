import { useEffect, useState } from 'react';
import { sb } from './supabase';

// undefined = chargement, null = déconnecté, objet = session ouverte
export function useSession() {
  const [session, setSession] = useState(undefined);
  useEffect(() => {
    sb.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: { subscription } } = sb.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => subscription.unsubscribe();
  }, []);
  return session;
}
