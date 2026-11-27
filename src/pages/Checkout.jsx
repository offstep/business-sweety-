import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { sb } from '../lib/supabase';
import { cart, useCart } from '../lib/cart';
import { computePricing } from '../lib/pricing';
import { fcfa, normalizePhone, useAsync } from '../lib/utils';
import { usePromotions } from './Cart';

// Commande sécurisée : le navigateur n'envoie QUE client, zone, code promo et produits/choix.
// Prix, promotions, livraison, stock et total sont recalculés par la fonction create_order (migration 4).
export default function Checkout() {
  const nav = useNavigate();
  const items = useCart();
  const promo = usePromotions();
  const { data: zones } = useAsync(async () => (await sb.from('delivery_zones').select('id, name, fee').eq('is_active', true).order('name')).data ?? []);
  const [zoneId, setZoneId] = useState('');
  const [code, setCode] = useState(() => { try { return sessionStorage.getItem('sb_code') || ''; } catch { return ''; } });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const t = useMemo(() => (promo ? computePricing({ lines: items, promotions: promo.promotions, giftNames: promo.giftNames }) : null), [items, promo]);
  const zone = (zones ?? []).find((z) => z.id === zoneId);
  const fee = t?.freeShipping ? 0 : (zone?.fee ?? 0);

  if (!items.length) {
    return (
      <section className="float-section"><h1 className="sec-title">Commande</h1>
        <p className="empty">Ton panier est vide.</p><Link className="btn" to="/catalogue">Découvrir les produits</Link></section>
    );
  }
  if (!t || !zones) return <p className="empty">Chargement…</p>;

  const submit = async (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    const phone = normalizePhone(f.get('phone'));
    if (phone.length < 8 || phone.length > 15) return setErr('Numéro de téléphone invalide.');
    if (!zoneId) return setErr('Choisis ta zone de livraison.');
    setErr(''); setBusy(true);
    const payload = {
      customer: { name: String(f.get('name')).trim(), phone, city: String(f.get('city')).trim(), district: String(f.get('district')).trim(), address: String(f.get('address') || '').trim() },
      zone_id: zoneId,
      code: t.hasAutoPromo ? '' : code.trim(),
      items: items.map((i) => ({ product_id: i.productId, qty: i.qty, options: i.options || {}, supplements: (i.supplements || []).map((x) => ({ id: x.id, options: x.options || {} })) })),
    };
    const { data, error } = await sb.rpc('create_order', { p: payload });
    setBusy(false);
    if (error) return setErr(error.message || "La commande a échoué. Réessaie dans un instant.");
    try { sessionStorage.setItem('sb_last_order', JSON.stringify({ ref: data.order_number, phone })); sessionStorage.removeItem('sb_code'); } catch {}
    cart.clear();
    nav(`/confirmation?ref=${encodeURIComponent(data.order_number)}`);
  };

  return (
    <section className="float-section auth"><h1 className="sec-title">Commande</h1>
      <form className="auth" onSubmit={submit}>
        {err ? <p className="msg msg--err">{err}</p> : null}
        <label>Nom complet<input name="name" required minLength={2} autoComplete="name" /></label>
        <label>Numéro de téléphone<input name="phone" type="tel" inputMode="tel" required autoComplete="tel" placeholder="07 00 00 00 00" /></label>
        <label>Ville<input name="city" required autoComplete="address-level2" /></label>
        <label>Quartier<input name="district" required /></label>
        <label>Précisions pour la livraison (facultatif)<input name="address" maxLength={300} /></label>
        <label>Zone de livraison
          <select value={zoneId} onChange={(e) => setZoneId(e.target.value)} required>
            <option value="">Choisir</option>
            {zones.map((z) => <option key={z.id} value={z.id}>{z.name} · {z.fee ? fcfa(z.fee) : 'Gratuit'}</option>)}
          </select>
        </label>
        {t.hasAutoPromo ? null : <label>Code promo (facultatif)<input value={code} onChange={(e) => setCode(e.target.value)} /></label>}

        <div className="totals">
          <div><span>Sous-total</span><span>{fcfa(t.subtotal)}</span></div>
          {t.discount ? <div><span>Réduction ({t.discountPromo.name})</span><span>-{fcfa(t.discount)}</span></div> : null}
          {t.gifts.map((g, k) => <div key={k}><span>Cadeau offert</span><span>{g.name}</span></div>)}
          <div><span>Livraison</span><span>{!zone && !t.freeShipping ? 'Selon la zone' : fee ? fcfa(fee) : 'Offerte'}</span></div>
          <div className="grand"><span>Total</span><span>{fcfa(t.total + fee)}</span></div>
        </div>
        <p className="muted">Le total final est confirmé à l'enregistrement de la commande (prix, promotions et stock vérifiés).</p>
        <button className="btn" type="submit" disabled={busy}>{busy ? 'Envoi…' : 'Confirmer la commande'}</button>
        <Link className="btn btn--ghost" to="/panier">Retour au panier</Link>
      </form>
    </section>
  );
}
