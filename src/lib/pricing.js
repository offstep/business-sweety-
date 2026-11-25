// Calcul des promotions (affichage du panier). Le montant définitif est confirmé par la vendeuse / au paiement.
import { fcfa } from './helpers.js';

const valid = (p, now = Date.now()) =>
  p.is_active && (!p.starts_at || new Date(p.starts_at) <= now) && (!p.ends_at || new Date(p.ends_at) >= now);

export const lineTotal = (l) => (l.unitPrice + l.supplementsPerUnit) * l.qty;

export const describePromo = (p) =>
  (p.type === 'free_shipping' ? 'la livraison gratuite' : p.type === 'gift' ? 'votre cadeau' : `-${p.discount_percent} %`);

export function computePricing({ lines, promotions }) {
  const sum = (a, f) => a.reduce((s, x) => s + f(x), 0);
  const subtotal = sum(lines, lineTotal);
  const evals = promotions.filter((p) => valid(p)).map((p) => {
    const el = p.applies_to_all ? lines : lines.filter((l) => p.product_ids?.includes(l.productId));
    const qty = sum(el, (l) => l.qty);
    const amount = sum(el, lineTotal);
    const metric = p.threshold_kind === 'quantity' ? qty : amount;
    return { p, metric, amount, met: lines.length > 0 && metric >= p.threshold };
  });
  const met = evals.filter((e) => e.met);
  const best = met
    .filter((e) => e.p.type === 'quantity_discount' || e.p.type === 'amount_discount')
    .map((e) => ({ ...e, value: Math.round((e.amount * e.p.discount_percent) / 100) }))
    .sort((a, b) => b.value - a.value)[0]; // une seule réduction : la plus avantageuse
  const unmet = evals
    .filter((e) => !e.met && lines.length)
    .sort((a, b) => (a.p.threshold - a.metric) / a.p.threshold - (b.p.threshold - b.metric) / b.p.threshold)[0];
  const discount = best?.value ?? 0;
  return {
    subtotal,
    discount,
    discountPromo: best?.p ?? null,
    freeShipping: met.some((e) => e.p.type === 'free_shipping'),
    gifts: met.filter((e) => e.p.type === 'gift').map((e) => e.p),
    total: Math.max(0, subtotal - discount),
    hasAutoPromo: met.length > 0, // si vrai : champ code promo masqué
    next: unmet ? { promo: unmet.p, missing: unmet.p.threshold - unmet.metric, kind: unmet.p.threshold_kind } : null,
  };
}

export function nextPromoText(n) {
  if (!n) return '';
  const w = describePromo(n.promo);
  return n.kind === 'quantity'
    ? `Encore ${n.missing} article${n.missing > 1 ? 's' : ''} pour obtenir ${w}.`
    : `Plus que ${fcfa(n.missing)} pour obtenir ${w}.`;
}
