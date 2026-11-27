import { sb } from '../../lib/supabase';
import { fcfa, waLink } from '../../lib/utils';
import { Badge, DateFields, Del, Form, Loading, Toggle, iso, period, useAdmin, useLoad } from './common';

// ---------- Commandes ----------
const ST = { new: 'Nouvelle', preparing: 'En préparation', shipped: 'Expédiée', delivered: 'Livrée', cancelled: 'Annulée' };
const PAY = { pending: 'Paiement en attente', paid: 'Payée', failed: 'Paiement échoué', refunded: 'Remboursée', unpaid_whatsapp: 'À régler (WhatsApp)' };

export function Orders() {
  const { note } = useAdmin();
  const { data, reload } = useLoad(async () => {
    const [{ data: list }, { data: set }] = await Promise.all([sb.from('orders').select('*, order_items(*)').order('created_at', { ascending: false }).limit(100),
      sb.from('settings').select('shop_name').eq('id', 1).maybeSingle()]);
    return { list: list ?? [], shop: set?.shop_name || 'la boutique' };
  });
  if (!data) return <Loading />;
  return (
    <>
      <h1>Commandes</h1>
      {data.list.length ? data.list.map((o) => {
        const wa = waLink(o.phone, `Bonjour ${o.full_name}, c'est ${data.shop} à propos de votre commande ${o.order_number}.`);
        return (
          <article className="float-card block" key={o.id}>
            <div className="head">
              <div><strong>{o.order_number}</strong> <span className={`stock ${o.status === 'cancelled' ? 'stock--low' : 'stock--ok'}`}>{ST[o.status]}</span>
                <div className="muted">{new Date(o.created_at).toLocaleString('fr-FR')} · {PAY[o.payment_status] || o.payment_status}</div></div>
              <div className="price">{fcfa(o.total)}</div>
            </div>
            <p><strong>{o.full_name}</strong> · {o.phone}<br />{o.city}, {o.district}{o.address_notes ? <><br />{o.address_notes}</> : null}</p>
            <ul className="chips" style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
              {(o.order_items ?? []).map((i) => {
                const opt = Object.entries(i.options || {}).map(([k, v]) => `${k} : ${v}`).join(', ');
                const su = (i.supplements || []).map((x) => `${x.name}${Object.values(x.options || {}).length ? ` (${Object.values(x.options).join(', ')})` : ''}`).join(', ');
                return <li className="chip" key={i.id}>{i.quantity} × {i.product_name}{opt ? ` [${opt}]` : ''}{su ? ` + ${su}` : ''} · {fcfa(i.line_total)}</li>;
              })}
            </ul>
            <div className="muted">Sous-total {fcfa(o.subtotal)}{o.discount_total ? ` · réduction -${fcfa(o.discount_total)}` : ''} · livraison {fcfa(o.shipping_fee)}</div>
            <Form className="form-inline" onSubmit={async (f) => {
              const { error } = await sb.rpc('admin_set_order_status', { p_order: o.id, p_status: f.get('status') });
              if (error) throw error; note('Statut mis à jour.'); reload();
            }}>
              <select name="status" defaultValue={o.status}>{Object.entries(ST).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
              <button className="btn btn--ghost sm" type="submit">Mettre à jour</button>
              <a className="btn wa sm" href={wa} target="_blank" rel="noopener noreferrer">WhatsApp client</a>
            </Form>
          </article>
        );
      }) : <p className="muted">Aucune commande pour le moment.</p>}
    </>
  );
}

// ---------- Promotions automatiques ----------
const TL = { quantity_discount: 'Réduction selon la quantité', amount_discount: 'Réduction selon le montant', free_shipping: 'Livraison gratuite', gift: 'Cadeau offert' };
export function Promotions() {
  const { note } = useAdmin();
  const { data, reload } = useLoad(async () => {
    const [{ data: list }, { data: prods }] = await Promise.all([sb.from('promotions').select('*').order('name'), sb.from('products').select('id, name').order('name')]);
    return { list: list ?? [], prods: prods ?? [] };
  });
  if (!data) return <Loading />;
  return (
    <>
      <h1>Promotions automatiques</h1>
      {data.list.length ? data.list.map((p) => (
        <div className="float-card block head" key={p.id}>
          <div><strong>{p.name}</strong> <Badge on={p.is_active} />
            <div className="muted">{TL[p.type]} · dès {p.threshold_kind === 'quantity' ? `${p.threshold} article(s)` : fcfa(p.threshold)}{p.discount_percent ? ` · -${p.discount_percent} %` : ''}{p.applies_to_all ? '' : ' · produits ciblés'}{period(p)}</div></div>
          <div className="inline-actions"><Toggle t="promotions" id={p.id} on={p.is_active} onDone={reload} /><Del t="promotions" id={p.id} onDone={reload} /></div>
        </div>
      )) : <p className="muted">Aucune promotion.</p>}
      <h2>Nouvelle promotion</h2>
      <Form className="float-card form-col" reset onSubmit={async (f) => {
        const type = f.get('type'), pct = parseInt(f.get('discount_percent'), 10), th = parseInt(f.get('threshold'), 10);
        const isDiscount = ['quantity_discount', 'amount_discount'].includes(type);
        if (!(th > 0)) throw new Error('Seuil invalide.');
        if (isDiscount && !(pct >= 1 && pct <= 100)) throw new Error('Indique un pourcentage de réduction entre 1 et 100.');
        if (type === 'gift' && !f.get('gift_product_id')) throw new Error('Choisis le produit cadeau.');
        const all = f.get('all') === 'on', ids = f.getAll('products');
        if (!all && !ids.length) throw new Error('Sélectionne au moins un produit, ou coche « tous les produits ».');
        const { data: d, error } = await sb.from('promotions').insert({ name: String(f.get('name')).trim(), type, threshold_kind: f.get('threshold_kind'), threshold: th,
          discount_percent: isDiscount ? pct : null, gift_product_id: type === 'gift' ? f.get('gift_product_id') : null,
          applies_to_all: all, starts_at: iso(f.get('starts_at')), ends_at: iso(f.get('ends_at')), is_active: true }).select('id').single();
        if (error) throw error;
        if (!all) { const r = await sb.from('promotion_products').insert(ids.map((pid) => ({ promotion_id: d.id, product_id: pid }))); if (r.error) throw r.error; }
        note('Promotion créée.'); reload();
      }}>
        <label>Nom<input name="name" placeholder="-20 % dès 3 articles" required /></label>
        <div className="two">
          <label>Type<select name="type">{Object.entries(TL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></label>
          <label>Seuil basé sur<select name="threshold_kind"><option value="quantity">Nombre d'articles</option><option value="amount">Montant (FCFA)</option></select></label>
        </div>
        <div className="two">
          <label>Seuil<input name="threshold" type="number" min="1" step="1" required /></label>
          <label>Réduction % (pour les réductions)<input name="discount_percent" type="number" min="1" max="100" step="1" /></label>
        </div>
        <label>Produit cadeau (pour « Cadeau offert »)<select name="gift_product_id"><option value="">Aucun</option>{data.prods.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></label>
        <label className="check"><input name="all" type="checkbox" defaultChecked /> S'applique à tous les produits</label>
        <label>Sinon, produits concernés (sélection multiple)<select name="products" multiple size={5}>{data.prods.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></label>
        <DateFields /><button className="btn" type="submit">Créer la promotion</button>
      </Form>
    </>
  );
}

// ---------- Codes promo ----------
export function Codes() {
  const { note } = useAdmin();
  const { data, reload } = useLoad(async () => (await sb.from('promo_codes').select('*').order('code')).data ?? []);
  if (!data) return <Loading />;
  return (
    <>
      <h1>Codes promo</h1><p className="muted">Un code ne s'affiche au client que si aucune promotion automatique ne s'applique à son panier.</p>
      {data.length ? data.map((c) => (
        <div className="float-card block head" key={c.id}>
          <div><strong>{c.code}</strong> <Badge on={c.is_active} />
            <div className="muted">{c.discount_percent ? `-${c.discount_percent} %` : `-${fcfa(c.discount_amount)}`} · dès {fcfa(c.min_amount)} · utilisé {c.uses}{c.max_uses ? `/${c.max_uses}` : ''} fois{period(c)}</div></div>
          <div className="inline-actions"><Toggle t="promo_codes" id={c.id} on={c.is_active} onDone={reload} /><Del t="promo_codes" id={c.id} onDone={reload} /></div>
        </div>
      )) : <p className="muted">Aucun code.</p>}
      <h2>Nouveau code</h2>
      <Form className="float-card form-col" reset onSubmit={async (f) => {
        const v = parseInt(f.get('value'), 10), pct = f.get('kind') === 'percent';
        if (!(v >= 1) || (pct && v > 100)) throw new Error('Valeur invalide.');
        const mu = f.get('max_uses');
        const { error } = await sb.from('promo_codes').insert({ code: String(f.get('code')).trim().toUpperCase(), discount_percent: pct ? v : null, discount_amount: pct ? null : v,
          min_amount: parseInt(f.get('min_amount'), 10) || 0, max_uses: mu ? parseInt(mu, 10) : null, starts_at: iso(f.get('starts_at')), ends_at: iso(f.get('ends_at')) });
        if (error) throw error; note('Code créé.'); reload();
      }}>
        <label>Code<input name="code" placeholder="BIENVENUE10" required maxLength={30} /></label>
        <div className="two">
          <label>Type<select name="kind"><option value="percent">Pourcentage</option><option value="amount">Montant fixe (FCFA)</option></select></label>
          <label>Valeur<input name="value" type="number" min="1" step="1" required /></label>
        </div>
        <div className="two">
          <label>Montant minimum du panier<input name="min_amount" type="number" min="0" step="1" defaultValue="0" /></label>
          <label>Utilisations maximum (vide = illimité)<input name="max_uses" type="number" min="1" step="1" /></label>
        </div>
        <DateFields /><button className="btn" type="submit">Créer le code</button>
      </Form>
    </>
  );
}

// ---------- Livraison ----------
export function Delivery() {
  const { note } = useAdmin();
  const { data, reload } = useLoad(async () => (await sb.from('delivery_zones').select('*').order('name')).data ?? []);
  if (!data) return <Loading />;
  return (
    <>
      <h1>Zones de livraison</h1>
      {data.length ? data.map((z) => (
        <Form key={z.id} className="float-card block form-inline" onSubmit={async (f) => {
          const fee = parseInt(f.get('fee'), 10); if (!(fee >= 0)) throw new Error('Tarif invalide.');
          const { error } = await sb.from('delivery_zones').update({ name: String(f.get('name')).trim(), fee, is_active: f.get('is_active') === 'on' }).eq('id', z.id);
          if (error) throw error; note('Enregistré.'); reload();
        }}>
          <input name="name" defaultValue={z.name} required /><input name="fee" type="number" min="0" step="1" defaultValue={z.fee} required aria-label="Tarif" />
          <label className="check"><input name="is_active" type="checkbox" defaultChecked={!!z.is_active} /> Active</label>
          <button className="btn btn--ghost sm" type="submit">Enregistrer</button><Del t="delivery_zones" id={z.id} onDone={reload} />
        </Form>
      )) : <p className="muted">Aucune zone.</p>}
      <h2>Nouvelle zone</h2>
      <Form className="float-card form-inline block" reset onSubmit={async (f) => {
        const fee = parseInt(f.get('fee'), 10); if (!(fee >= 0)) throw new Error('Tarif invalide.');
        const { error } = await sb.from('delivery_zones').insert({ name: String(f.get('name')).trim(), fee });
        if (error) throw error; note('Enregistré.'); reload();
      }}>
        <input name="name" placeholder="Ex. Cocody" required /><input name="fee" type="number" min="0" step="1" placeholder="Tarif en FCFA" required /><button className="btn" type="submit">Ajouter</button>
      </Form>
    </>
  );
}
