import { fcfa } from './utils';

// Aperçu du prix dans le panier. Le prix FINAL est toujours recalculé par la base de données (fonction create_order) :
// ce calcul reproduit ses règles pour que le client voie la même chose avant de commander.
const live = (p, now = Date.now()) => p.is_active !== false
  && (!p.starts_at || new Date(p.starts_at) <= now) && (!p.ends_at || new Date(p.ends_at) >= now);

export const lineTotal = (l) => (l.unitPrice + (l.supplementsPerUnit || 0)) * l.qty;

function measure(p, lines) {
  const ls = lines.filter((l) => p.applies_to_all || (p.product_ids || []).includes(l.productId));
  const qty = ls.reduce((n, l) => n + l.qty, 0);
  const amount = ls.reduce((n, l) => n + lineTotal(l), 0);
  return { amount, metric: p.threshold_kind === 'quantity' ? qty : amount };
}

export function computePricing({ lines, promotions, giftNames = {} }) {
  const subtotal = lines.reduce((n, l) => n + lineTotal(l), 0);
  let discount = 0, discountPromo = null, freeShipping = false, any = false, next = null;
  const gifts = [];
  for (const p of promotions) {
    if (!live(p)) continue;
    const m = measure(p, lines);
    if (m.metric >= p.threshold) {
      any = true; // une seule réduction : la plus avantageuse
      if (p.type === 'quantity_discount' || p.type === 'amount_discount') {
        const v = Math.round((m.amount * p.discount_percent) / 100);
        if (v > discount) { discount = v; discountPromo = p; }
      } else if (p.type === 'free_shipping') freeShipping = true;
      else if (p.type === 'gift' && p.gift_product_id) gifts.push({ name: giftNames[p.gift_product_id] || 'Cadeau' });
    } else {
      const missing = p.threshold - m.metric, ratio = missing / p.threshold;
      if (!next || ratio < next.ratio) next = { promo: p, missing, ratio };
    }
  }
  return { subtotal, discount, discountPromo, freeShipping, gifts, total: subtotal - discount, hasAutoPromo: any, next };
}

export function nextPromoText(n) {
  if (!n) return '';
  const { promo: p, missing } = n;
  const need = p.threshold_kind === 'quantity' ? `${missing} article${missing > 1 ? 's' : ''}` : fcfa(missing);
  const what = p.type === 'free_shipping' ? 'la livraison offerte' : p.type === 'gift' ? 'un cadeau offert' : `-${p.discount_percent} %`;
  return `Ajoute encore ${need} pour profiter de ${what}.`;
}
