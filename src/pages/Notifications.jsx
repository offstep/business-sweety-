import { useMemo } from 'react';
import { sb } from '../lib/supabase';
import { useAsync } from '../lib/utils';
import Lnk from '../components/Lnk';
import { resolveLink } from '../lib/utils';

const ICON = {
  info: 'M6 17V11a6 6 0 0112 0v6l2 2H4zM10 21h4',
  promo: 'M20 12l-8 8-9-9V3h8zM7.5 7.5h.01',
  nouveau: 'M12 3l2.2 5.6 5.8.4-4.5 3.7 1.5 5.7-5-3.2-5 3.2 1.5-5.7L4 9l5.8-.4z',
  livraison: 'M3 7h11v9H3zM14 10h4l3 3v3h-7zM7 19a1.5 1.5 0 100-3 1.5 1.5 0 000 3zM17 19a1.5 1.5 0 100-3 1.5 1.5 0 000 3z',
};
const ago = (iso) => {
  const m = Math.round((Date.now() - new Date(iso)) / 60000);
  if (m < 1) return "à l'instant";
  if (m < 60) return `il y a ${m} min`;
  const h = Math.round(m / 60); if (h < 24) return `il y a ${h} h`;
  const d = Math.round(h / 24); if (d < 7) return `il y a ${d} j`;
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });
};

export default function Notifications() {
  const { loading, data } = useAsync(async () => {
    const r = await sb.from('notifications').select('id, kind, title, body, link_url, created_at').eq('is_active', true).order('created_at', { ascending: false }).limit(50);
    let seen = ''; try { seen = localStorage.getItem('sb_notif_seen') || ''; } catch {}   // lu AVANT de marquer comme lu : pour afficher les points « nouveau »
    try { if (r.data?.[0]) localStorage.setItem('sb_notif_seen', r.data[0].created_at); } catch {}
    return { list: r.data ?? [], error: r.error, seen };
  });

  const groups = useMemo(() => {
    if (!data) return [];
    const day0 = new Date().setHours(0, 0, 0, 0);
    const defs = [["Aujourd'hui", (n) => new Date(n.created_at) >= day0], ['Cette semaine', (n) => new Date(n.created_at) >= day0 - 6 * 86400000], ['Plus ancien', () => true]];
    const rest = [...data.list];
    return defs.map(([label, test]) => {
      const part = rest.filter(test); part.forEach((n) => rest.splice(rest.indexOf(n), 1));
      return [label, part];
    }).filter(([, part]) => part.length);
  }, [data]);

  if (loading || !data) return <p className="empty">Chargement…</p>;
  const { seen, error } = data;

  const Card = ({ n }) => {
    const fresh = !seen || new Date(n.created_at) > new Date(seen);
    const kind = ICON[n.kind] ? n.kind : 'info';
    const inner = (
      <>
        <i className={`notif-ic notif-ic--${kind}`}><svg viewBox="0 0 24 24" aria-hidden="true"><path d={ICON[kind]} /></svg></i>
        <div className="notif-body"><strong>{n.title}</strong>{n.body ? <span>{n.body}</span> : null}<small>{ago(n.created_at)}</small></div>
        {fresh ? <b className="notif-dot" aria-label="Nouveau" /> : null}
      </>
    );
    return resolveLink(n.link_url) ? <Lnk className="float-card notif" u={n.link_url}>{inner}</Lnk> : <div className="float-card notif">{inner}</div>;
  };

  return (
    <section className="float-section"><h1 className="sec-title">Notifications</h1>
      {groups.length ? groups.map(([label, part]) => (
        <div key={label}><h2 className="notif-day">{label}</h2><div className="notifs">{part.map((n) => <Card key={n.id} n={n} />)}</div></div>
      )) : (
        <div className="notif-empty"><svg viewBox="0 0 24 24" aria-hidden="true"><path d={ICON.info} /></svg><strong>Tout est calme</strong>
          <span>{error ? error.message : 'Tes prochaines notifications apparaîtront ici.'}</span></div>
      )}
    </section>
  );
}
