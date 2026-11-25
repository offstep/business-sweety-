import { useEffect, useState } from 'react';
import { sb, configured } from '../lib/supabase.js';

// Nombre de notifications actives plus récentes que la dernière visite de la page Notifications.
export function useUnread() {
  const [n, setN] = useState(0);
  useEffect(() => {
    let on = true;
    const load = async () => {
      if (!configured) return;
      const { data } = await sb.from('notifications').select('created_at').eq('is_active', true)
        .order('created_at', { ascending: false }).limit(30);
      let seen = '';
      try { seen = localStorage.getItem('sb_notif_seen') || ''; } catch { /* stockage indisponible */ }
      if (on) setN((data || []).filter((x) => !seen || new Date(x.created_at) > new Date(seen)).length);
    };
    load();
    window.addEventListener('sb-notif', load);
    return () => { on = false; window.removeEventListener('sb-notif', load); };
  }, []);
  return n;
}
