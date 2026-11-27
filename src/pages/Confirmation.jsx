import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { sb } from '../lib/supabase';
import { useSettings } from '../lib/settings';
import { fcfa, normalizePhone, waLink } from '../lib/utils';

const lineText = (i) => {
  const o = Object.entries(i.options || {}).map(([k, v]) => `${k} : ${v}`).join(', ');
  const su = (i.supplements || []).map((x) => `${x.name}${Object.values(x.options || {}).length ? ` (${Object.values(x.options).join(', ')})` : ''}`).join(', ');
  return `${i.quantity} × ${i.name}${o ? ` [${o}]` : ''}${su ? ` + ${su}` : ''}`;
};

export default function Confirmation() {
  const s = useSettings();
  const ref = useSearchParams()[0].get('ref') || '';
  const [phone, setPhone] = useState(() => { try { const l = JSON.parse(sessionStorage.getItem('sb_last_order') || '{}'); return l.ref === ref ? l.phone : ''; } catch { return ''; } });
  const [order, setOrder] = useState(undefined);     // undefined = chargement, null = à identifier

  useEffect(() => {
    let ok = true;
    if (!phone || !ref) { setOrder(null); return undefined; }
    sb.rpc('get_order', { p_number: ref, p_phone: phone }).then(({ data }) => ok && setOrder(data || null));
    return () => { ok = false; };
  }, [ref, phone]);

  if (order === undefined) return <p className="empty">Chargement…</p>;
  if (!order) {   // la page n'affiche une confirmation que pour une commande réellement enregistrée
    return (
      <section className="float-section auth"><h1 className="sec-title">Ma commande</h1>
        <p className="muted">{ref ? 'Pour afficher cette commande, saisis le numéro de téléphone utilisé.' : 'Aucune commande indiquée.'}</p>
        {ref ? (
          <form className="auth" onSubmit={(e) => { e.preventDefault(); setPhone(normalizePhone(new FormData(e.target).get('phone'))); }}>
            <label>Téléphone<input name="phone" type="tel" inputMode="tel" required /></label><button className="btn" type="submit">Afficher</button>
          </form>
        ) : <Link className="btn" to="/catalogue">Retour à la boutique</Link>}
      </section>
    );
  }
  const o = order;
  const msg = [`Bonjour, voici ma commande ${o.order_number} :`, ...o.items.map((i) => `• ${lineText(i)}`),
    `Total : ${fcfa(o.total)}`, `Livraison : ${o.full_name}, ${o.phone}, ${o.city}, ${o.district}${o.address_notes ? `, ${o.address_notes}` : ''}`].join('\n');
  return (
    <section className="float-section"><h1 className="sec-title">Commande enregistrée</h1>
      <div className="float-card account"><strong>{o.order_number}</strong><span className="muted">Garde ce numéro pour suivre ta commande.</span></div>
      <h2 className="sec-title" style={{ marginTop: 18, fontSize: 18 }}>Récapitulatif</h2>
      {o.items.map((i, k) => <div key={k} className="float-card block" style={{ padding: 12, marginBottom: 10 }}>{lineText(i)}<div className="price">{fcfa(i.line_total)}</div></div>)}
      <div className="totals">
        <div><span>Sous-total</span><span>{fcfa(o.subtotal)}</span></div>
        {o.discount_total ? <div><span>Réduction</span><span>-{fcfa(o.discount_total)}</span></div> : null}
        <div><span>Livraison</span><span>{o.shipping_fee ? fcfa(o.shipping_fee) : 'Offerte'}</span></div>
        <div className="grand"><span>Total</span><span>{fcfa(o.total)}</span></div>
      </div>
      <p className="muted">Livraison : {o.full_name} · {o.phone} · {o.city}, {o.district}{o.address_notes ? ` · ${o.address_notes}` : ''}</p>
      <div className="actions">
        <button className="btn" disabled>Payer maintenant</button>
        <p className="muted" style={{ textAlign: 'center', margin: 0 }}>Paiement en ligne bientôt disponible.</p>
        {s.whatsapp_number ? <a className="btn wa" href={waLink(s.whatsapp_number, msg)} target="_blank" rel="noopener noreferrer">Contacter la vendeuse sur WhatsApp</a> : null}
        <Link className="btn btn--ghost" to="/catalogue">Continuer mes achats</Link>
      </div>
    </section>
  );
}
