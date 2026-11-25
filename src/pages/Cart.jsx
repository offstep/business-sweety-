import { useState } from 'react';
import { Link } from 'react-router-dom';
import Img from '../components/Img.jsx';
import { sb } from '../lib/supabase.js';
import { useShop } from '../contexts/ShopContext.jsx';
import { useCart } from '../contexts/CartContext.jsx';
import { useAsync, must } from '../hooks/useAsync.js';
import { fcfa, waLink } from '../lib/helpers.js';
import { computePricing, nextPromoText } from '../lib/pricing.js';

export default function Cart() {
  const { settings: s } = useShop();
  const { items, setQty } = useCart();
  const [code, setCode] = useState('');
  const { data: rows } = useAsync(() => must(sb.from('promotions').select('*, promotion_products(product_id)').eq('is_active', true)), []);
  const promotions = (rows ?? []).map((p) => ({ ...p, product_ids: (p.promotion_products ?? []).map((x) => x.product_id) }));

  if (!items.length) {
    return (
      <section className="float-section">
        <h1 className="sec-title">Panier</h1>
        <p className="empty">Ton panier est vide.</p>
        <Link className="btn" to="/catalogue">Découvrir les produits</Link>
      </section>
    );
  }

  const t = computePricing({ lines: items, promotions });
  const optsText = (i) => Object.entries(i.options || {}).map(([k, v]) => `${k} : ${v}`);
  const supText = (x) => `${x.name}${Object.values(x.options || {}).length ? ` (${Object.values(x.options).join(', ')})` : ''}`;

  const order = () => {
    if (!s.whatsapp_number) { alert("Le numéro WhatsApp de la boutique n'est pas encore configuré."); return; }
    const msg = [
      'Bonjour, je souhaite passer cette commande :',
      ...items.map((i) => {
        const o = optsText(i).join(', ');
        const su = (i.supplements || []).map((x) => `${supText(x)} +${fcfa(x.price)}`).join(', ');
        return `• ${i.qty} × ${i.name} — ${fcfa(i.unitPrice)}${o ? ` [${o}]` : ''}${su ? ` + ${su}` : ''}`;
      }),
      `Sous-total : ${fcfa(t.subtotal)}`,
      ...(t.discount ? [`Réduction : -${fcfa(t.discount)}`] : []),
      ...(t.freeShipping ? ['Livraison offerte'] : []),
      ...t.gifts.map((g) => `Cadeau : ${g.name}`),
      `Total (hors livraison) : ${fcfa(t.total)}`,
    ].join('\n');
    const c = code.trim();
    window.open(waLink(s.whatsapp_number, `${msg}${c ? `\nCode promo : ${c}` : ''}`), '_blank', 'noopener');
  };

  return (
    <section className="float-section">
      <h1 className="sec-title">Panier</h1>
      {t.next && (
        <div className="notice">{nextPromoText(t.next)}<Link className="btn" to="/catalogue">Découvrir les produits</Link></div>
      )}
      {items.map((i) => (
        <article className="float-card line" key={i.key}>
          <Img src={i.image} ratio="img-frame--square" alt={i.name} />
          <div>
            <strong>{i.name}</strong><span className="price"> {fcfa(i.unitPrice)}</span>
            {optsText(i).length > 0 && <small>{optsText(i).join(' · ')}</small>}
            {(i.supplements || []).map((x) => <small key={x.id}>+ {supText(x)} · {fcfa(x.price)}</small>)}
            <div className="qty" style={{ marginTop: 10 }}>
              <button aria-label="Moins" onClick={() => setQty(i.key, i.qty - 1)}>−</button>
              <b>{i.qty}</b>
              <button aria-label="Plus" onClick={() => setQty(i.key, i.qty + 1)}>+</button>
              <button onClick={() => setQty(i.key, 0)} style={{ marginLeft: 'auto', background: 'none', width: 'auto', boxShadow: 'none', fontSize: 14, color: 'var(--red)' }}>Supprimer</button>
            </div>
          </div>
        </article>
      ))}
      {!t.hasAutoPromo && (
        <label className="field">Code promo
          <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Saisis ton code"
            style={{ minHeight: 48, padding: '0 14px', border: '1px solid var(--line)', borderRadius: 14, font: '500 16px var(--font)' }} />
          <small className="muted">Le code est confirmé par la vendeuse avec ta commande.</small>
        </label>
      )}
      <div className="totals">
        <div><span>Sous-total</span><span>{fcfa(t.subtotal)}</span></div>
        {t.discount > 0 && <div><span>Réduction ({t.discountPromo.name})</span><span>-{fcfa(t.discount)}</span></div>}
        {t.gifts.map((g) => <div key={g.id}><span>Cadeau offert</span><span>{g.name}</span></div>)}
        <div><span>Livraison</span><span>{t.freeShipping ? 'Offerte' : 'Calculée à la commande'}</span></div>
        <div className="grand"><span>Total</span><span>{fcfa(t.total)}</span></div>
      </div>
      <div className="actions">
        <button className="btn wa" onClick={order}>Commander sur WhatsApp</button>
        <button className="btn" disabled>Payer en ligne (bientôt disponible)</button>
      </div>
    </section>
  );
}
