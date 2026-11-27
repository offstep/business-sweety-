import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { sb } from '../lib/supabase';
import { useSettings } from '../lib/settings';
import { cart, useCart } from '../lib/cart';
import { toast } from '../lib/toast';
import { computePricing, nextPromoText } from '../lib/pricing';
import { fcfa, useAsync, waLink } from '../lib/utils';
import Img from '../components/Img';

// Promotions actives + noms des produits cadeaux (partagé avec la page de commande)
export function usePromotions() {
  const { data } = useAsync(async () => {
    const { data: rows } = await sb.from('promotions').select('*, promotion_products(product_id)').eq('is_active', true);
    const promotions = (rows ?? []).map((p) => ({ ...p, product_ids: (p.promotion_products ?? []).map((x) => x.product_id) }));
    const ids = [...new Set(promotions.map((p) => p.gift_product_id).filter(Boolean))];
    const giftNames = {};
    if (ids.length) { const { data: g } = await sb.from('products').select('id, name').in('id', ids); (g ?? []).forEach((x) => { giftNames[x.id] = x.name; }); }
    return { promotions, giftNames };
  });
  return data;
}

const optText = (o) => Object.entries(o || {}).map(([k, v]) => `${k} : ${v}`).join(', ');
const supText = (x) => `${x.name}${Object.values(x.options || {}).length ? ` (${Object.values(x.options).join(', ')})` : ''}`;

export default function Cart() {
  const s = useSettings();
  const items = useCart();
  const promo = usePromotions();
  const [code, setCode] = useState(() => { try { return sessionStorage.getItem('sb_code') || ''; } catch { return ''; } });
  const mem = useRef({ first: true, prevHas: null, prevNext: '' });

  const t = useMemo(() => (promo ? computePricing({ lines: items, promotions: promo.promotions, giftNames: promo.giftNames }) : null), [items, promo]);

  // Petits messages quand une promotion se déclenche ou se rapproche
  useEffect(() => {
    if (!t || !items.length) return;
    const m = mem.current, next = nextPromoText(t.next);
    if (!m.first) {
      if (t.hasAutoPromo && !m.prevHas) {
        const what = t.discountPromo ? `-${t.discountPromo.discount_percent} %` : t.freeShipping ? 'livraison offerte' : 'cadeau offert';
        toast(`Promotion appliquée : ${what}.`, { type: 'success' });
      } else if (!t.hasAutoPromo && next && next !== m.prevNext) toast(next, { label: 'Découvrir', href: 'catalogue.html' });
    }
    m.first = false; m.prevHas = t.hasAutoPromo; m.prevNext = next;
  }, [t, items.length]);

  const removeWithUndo = (key) => {
    const it = cart.get().find((x) => x.key === key); if (!it) return;
    cart.setQty(key, 0);
    toast('Article retiré', { label: 'Annuler', duration: 6000, onAction: () => cart.add(it) });
  };
  const change = (i, d) => (i.qty + d <= 0 ? removeWithUndo(i.key) : cart.setQty(i.key, i.qty + d));
  const editCode = (v) => { setCode(v); try { sessionStorage.setItem('sb_code', v); } catch {} };

  if (!items.length) {
    return (
      <section className="float-section"><h1 className="sec-title">Panier</h1>
        <p className="empty">Ton panier est vide.</p><Link className="btn" to="/catalogue">Découvrir les produits</Link></section>
    );
  }
  if (!t) return <p className="empty">Chargement…</p>;

  const sendWhatsApp = () => {
    if (!s.whatsapp_number) return alert("Le numéro WhatsApp de la boutique n'est pas encore configuré.");
    const msg = [
      'Bonjour, je souhaite passer cette commande :',
      ...items.map((i) => {
        const o = optText(i.options), su = (i.supplements || []).map((x) => `${supText(x)} +${fcfa(x.price)}`).join(', ');
        return `• ${i.qty} × ${i.name} — ${fcfa(i.unitPrice)}${o ? ` [${o}]` : ''}${su ? ` + ${su}` : ''}`;
      }),
      `Sous-total : ${fcfa(t.subtotal)}`,
      ...(t.discount ? [`Réduction : -${fcfa(t.discount)}`] : []),
      ...(t.freeShipping ? ['Livraison offerte'] : []),
      ...t.gifts.map((g) => `Cadeau : ${g.name}`),
      `Total (hors livraison) : ${fcfa(t.total)}`,
    ].join('\n');
    window.open(waLink(s.whatsapp_number, `${msg}${code.trim() ? `\nCode promo : ${code.trim()}` : ''}`), '_blank');
  };

  return (
    <section className="float-section"><h1 className="sec-title">Panier</h1>
      {t.next ? <div className="notice">{nextPromoText(t.next)}<Link className="btn" to="/catalogue">Découvrir les produits</Link></div> : null}
      {items.map((i) => (
        <article className="float-card line" key={i.key}><Img src={i.image} ratio="img-frame--square" alt={i.name} />
          <div>
            <strong>{i.name}</strong><span className="price"> {fcfa(i.unitPrice)}</span>
            {optText(i.options) ? <small>{Object.entries(i.options).map(([k, v]) => `${k} : ${v}`).join(' · ')}</small> : null}
            {(i.supplements || []).map((x) => <small key={x.id}>+ {x.name}{Object.values(x.options || {}).length ? ` (${Object.values(x.options).join(', ')})` : ''} · {fcfa(x.price)}</small>)}
            <div className="qty" style={{ marginTop: 10 }}>
              <button onClick={() => change(i, -1)} aria-label="Moins">−</button><b>{i.qty}</b><button onClick={() => change(i, 1)} aria-label="Plus">+</button>
              <button className="link-danger" onClick={() => removeWithUndo(i.key)} style={{ marginLeft: 'auto', background: 'none', width: 'auto', boxShadow: 'none', fontSize: 14, color: 'var(--red)' }}>Supprimer</button>
            </div>
          </div>
        </article>
      ))}
      {t.hasAutoPromo ? null : (
        <label className="field">Code promo
          <input value={code} onChange={(e) => editCode(e.target.value)} placeholder="Saisis ton code" style={{ minHeight: 48, padding: '0 14px', border: '1px solid var(--line)', borderRadius: 14, font: '500 16px var(--font)' }} />
          <small className="muted">Le code est confirmé par la vendeuse avec ta commande.</small>
        </label>
      )}
      <div className="totals">
        <div><span>Sous-total</span><span>{fcfa(t.subtotal)}</span></div>
        {t.discount ? <div><span>Réduction ({t.discountPromo.name})</span><span>-{fcfa(t.discount)}</span></div> : null}
        {t.gifts.map((g, k) => <div key={k}><span>Cadeau offert</span><span>{g.name}</span></div>)}
        <div><span>Livraison</span><span>{t.freeShipping ? 'Offerte' : 'Calculée à la commande'}</span></div>
        <div className="grand"><span>Total</span><span>{fcfa(t.total)}</span></div>
      </div>
      <div className="actions">
        <button className="btn btn--ghost" onClick={sendWhatsApp}>Envoyer mon panier sur WhatsApp</button>
        <Link className="btn" to="/checkout">Passer à la commande</Link>
      </div>
    </section>
  );
}
