import { useEffect } from 'react';
import SmartLink from '../components/SmartLink.jsx';
import { sb } from '../lib/supabase.js';
import { useAsync, must } from '../hooks/useAsync.js';
import { toRoute } from '../lib/helpers.js';

// NB : les colonnes autres que created_at / is_active n'étaient pas dans les fichiers fournis.
// Affichage défensif : title, puis body / message / content / description, lien link_url.
export default function Notifications() {
  const { data, error, loading } = useAsync(() => must(sb.from('notifications').select('*').eq('is_active', true).order('created_at', { ascending: false }).limit(50)), []);

  useEffect(() => {
    if (!data) return;
    try { localStorage.setItem('sb_notif_seen', new Date().toISOString()); } catch { /* stockage indisponible */ }
    window.dispatchEvent(new Event('sb-notif'));
  }, [data]);

  return (
    <section className="float-section">
      <h1 className="sec-title">Notifications</h1>
      {loading && <p className="empty">Chargement…</p>}
      {error && <p className="empty">Impossible de charger les notifications.<br /><small>{error.message}</small></p>}
      {data && !data.length && <p className="empty">Aucune notification pour le moment.</p>}
      <div className="notifs">
        {(data ?? []).map((n) => {
          const body = n.body ?? n.message ?? n.content ?? n.description;
          const inner = <><strong>{n.title}</strong>{body && <span className="muted">{body}</span>}</>;
          return toRoute(n.link_url)
            ? <SmartLink key={n.id} className="float-card notif" to={n.link_url}>{inner}</SmartLink>
            : <div key={n.id} className="float-card notif">{inner}</div>;
        })}
      </div>
    </section>
  );
}
