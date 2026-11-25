import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Img from '../components/Img.jsx';
import ProductCard from '../components/ProductCard.jsx';
import { sb } from '../lib/supabase.js';
import { useShop } from '../contexts/ShopContext.jsx';
import { useCart } from '../contexts/CartContext.jsx';
import { useAsync, must } from '../hooks/useAsync.js';
import { CARD_COLS, fcfa, isLow, safe, sortBy, waLink } from '../lib/helpers.js';

export default function Product() {
  const { slug } = useParams();
  const { settings: s } = useShop();
  const { data: p, loading } = useAsync(async () => {
    const { data, error } = await sb.from('products')
      .select('*, product_images(*), option_types(*, option_values(*)), supplements(*, supplement_option_types(*))')
      .eq('slug', slug || '').eq('is_active', true).maybeSingle();
    if (error) throw error;
    return data ?? null;
  }, [slug]);

  if (loading) return <p className="empty">Chargement…</p>;
  if (!p) return <p className="empty">Produit introuvable.</p>;
  return <ProductView key={p.id} p={p} s={s} />;
}

function ProductView({ p, s }) {
  const { add } = useCart();
  const images = useMemo(() => sortBy(p.product_images), [p]);
  const types = useMemo(() => sortBy(p.option_types).map((t) => ({ ...t, values: sortBy(t.option_values) })), [p]);
  const sups = useMemo(() => (p.supplements || []).filter((x) => x.is_active !== false), [p]);

  const [sel, setSel] = useState({});                       // typeId -> valueId
  const [supSel, setSupSel] = useState(() => Object.fromEntries(sups.map((x) => [x.id, { on: !!x.is_required, opts: {} }])));
  const [qty, setQty] = useState(1);
  const [idx, setIdx] = useState(0);
  const [added, setAdded] = useState(false);

  const low = isLow(p, s);
  const inStock = p.stock > 0;

  const chosen = () => types.map((t) => ({ name: t.name, label: t.values.find((v) => v.id === sel[t.id])?.label })).filter((o) => o.label);
  const chosenSups = () => sups.filter((x) => supSel[x.id].on).map((x) => ({
    id: x.id, name: x.name, price: x.price,
    options: Object.fromEntries((x.supplement_option_types || []).map((o) => [o.name, supSel[x.id].opts[o.id]]).filter(([, v]) => v)),
  }));
  const problem = () => {
    if (!inStock) return 'Ce produit est bientôt épuisé.';
    const t = types.find((x) => !sel[x.id]);
    if (t) return `Choisis : ${t.name}`;
    for (const x of sups.filter((y) => supSel[y.id].on)) {
      const o = (x.supplement_option_types || []).find((z) => !supSel[x.id].opts[z.id]);
      if (o) return `${x.name} : choisis ${o.name}`;
    }
    return '';
  };
  const supPerUnit = () => chosenSups().reduce((n, x) => n + x.price, 0);
  const message = () => {
    const o = chosen().map((x) => `${x.name} : ${x.label}`).join(', ');
    const su = chosenSups().map((x) => `${x.name}${Object.values(x.options).length ? ` (${Object.values(x.options).join(', ')})` : ''} +${fcfa(x.price)}`).join('\n  ');
    return `Bonjour, je souhaite commander :\n• ${p.name} — ${fcfa(p.price)}${o ? `\nVariantes : ${o}` : ''}${su ? `\nSuppléments :\n  ${su}` : ''}\nQuantité : ${qty}\nTotal : ${fcfa((p.price + supPerUnit()) * qty)}\nLien : ${window.location.href}`;
  };

  const pickValue = (typeId, valueId) => {
    setSel((c) => ({ ...c, [typeId]: valueId }));
    const v = types.flatMap((t) => t.values).find((x) => x.id === valueId);
    const i = images.findIndex((im) => im.id === v?.image_id); // l'image suit la couleur choisie
    if (i >= 0) setIdx(i);
    setAdded(false);
  };
  const toggleSup = (id, on) => { setSupSel((c) => ({ ...c, [id]: { ...c[id], on } })); setAdded(false); };
  const pickSupOpt = (id, optId, v) => setSupSel((c) => ({ ...c, [id]: { ...c[id], opts: { ...c[id].opts, [optId]: v } } }));

  const addToCart = () => {
    if (problem()) return;
    const options = Object.fromEntries(chosen().map((o) => [o.name, o.label]));
    const supplements = chosenSups();
    add({
      key: JSON.stringify([p.id, options, supplements]), productId: p.id, slug: p.slug, name: p.name,
      image: images[0]?.url || '', unitPrice: p.price, supplementsPerUnit: supPerUnit(), qty, options, supplements,
    });
    setAdded(true);
  };

  const share = async () => {
    try {
      const blob = await (await fetch(images[idx].url)).blob();
      const file = new File([blob], 'produit.jpg', { type: blob.type });
      if (navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], text: message() }); return; }
    } catch { /* repli sur WhatsApp */ }
    window.open(waLink(s.whatsapp_number, message()), '_blank', 'noopener');
  };

  const err = problem();
  const video = safe(p.video_url)
    ? (/\.(mp4|webm)(\?|$)/i.test(p.video_url)
      ? <video className="vid" controls preload="none" playsInline src={p.video_url} />
      : <a className="btn btn--ghost" style={{ marginTop: 12 }} href={p.video_url} target="_blank" rel="noopener noreferrer">Voir la vidéo</a>)
    : null;

  return (
    <>
      <section className="float-section">
        <Img src={images[idx]?.url} alt={p.name} extra="float-img" />
        {images.length > 1 && (
          <div className="thumbs">
            {images.map((im, i) => (
              <button key={im.id} aria-pressed={i === idx} aria-label={`Photo ${i + 1}`} onClick={() => setIdx(i)}>
                <Img src={im.url} ratio="img-frame--square" />
              </button>
            ))}
          </div>
        )}
        {video}
        <h1 className="sec-title" style={{ marginTop: 18 }}>{p.name}</h1>
        <div className="price big-price">{fcfa(p.price)}</div>
        <div className={`stock ${low ? 'stock--low' : 'stock--ok'}`}>{low ? 'Bientôt épuisé' : 'En stock'}</div>
        {p.description && <p style={{ whiteSpace: 'pre-line' }}>{p.description}</p>}

        {types.map((t) => (
          <div className="field" key={t.id}>
            <span>{t.name}</span>
            {t.kind === 'select' ? (
              <select value={sel[t.id] || ''} onChange={(e) => pickValue(t.id, e.target.value)}>
                <option value="">Choisir</option>
                {t.values.map((v) => <option key={v.id} value={v.id}>{v.label}</option>)}
              </select>
            ) : (
              <div className="opts">
                {t.values.map((v) => (
                  <button key={v.id} className="opt" aria-pressed={sel[t.id] === v.id} onClick={() => pickValue(t.id, v.id)}>
                    {v.color_hex && <i className="dot" style={{ background: v.color_hex }} />}{v.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}

        {sups.length > 0 && <h2 className="sec-title" style={{ marginTop: 22 }}>Suppléments</h2>}
        {sups.map((x) => (
          <div className="float-card sup" key={x.id}>
            <Img src={x.image_url} ratio="img-frame--square" alt={x.name} />
            <div>
              <label>
                <input type="checkbox" checked={supSel[x.id].on} disabled={!!x.is_required} onChange={(e) => toggleSup(x.id, e.target.checked)} />
                {' '}{x.name} <span className="price">+{fcfa(x.price)}</span>
              </label>
              {x.description && <small className="muted">{x.description}</small>}
              {supSel[x.id].on && (x.supplement_option_types || []).map((o) => (
                <div className="field" key={o.id}>
                  <span>{o.name}</span>
                  <select value={supSel[x.id].opts[o.id] || ''} onChange={(e) => pickSupOpt(x.id, o.id, e.target.value)}>
                    <option value="">Choisir</option>
                    {(o.values || []).map((v) => <option key={v} value={v}>{v}</option>)}
                  </select>
                </div>
              ))}
            </div>
          </div>
        ))}

        <div className="field">
          <span>Quantité</span>
          <div className="qty">
            <button aria-label="Moins" onClick={() => setQty((q) => Math.max(1, q - 1))}>−</button>
            <b>{qty}</b>
            <button aria-label="Plus" onClick={() => setQty((q) => Math.min(99, q + 1))}>+</button>
          </div>
        </div>
        <div className="price big-price">Total : {fcfa((p.price + supPerUnit()) * qty)}</div>
        {err && <p className="muted">{err}</p>}
        <div className="actions">
          <button className="btn" disabled={!!err} onClick={addToCart}>Ajouter au panier</button>
          {s.whatsapp_number && (
            <a className="btn wa" href={waLink(s.whatsapp_number, message())} target="_blank" rel="noopener noreferrer">Contacter sur WhatsApp</a>
          )}
          {typeof navigator !== 'undefined' && navigator.canShare && images.length > 0 && (
            <button className="btn btn--ghost" onClick={share}>Envoyer avec la photo</button>
          )}
        </div>
        {added && <div className="toast">Ajouté au panier. <Link className="link" to="/panier">Voir le panier</Link></div>}
      </section>
      <Recos p={p} s={s} />
    </>
  );
}

function Recos({ p, s }) {
  const { data } = useAsync(async () => {
    let q = sb.from('products').select(CARD_COLS).eq('is_active', true).neq('id', p.id).order('created_at', { ascending: false }).limit(8);
    if (p.category_id) q = q.eq('category_id', p.category_id);
    return must(q);
  }, [p.id]);
  if (!data?.length) return null;
  return (
    <section className="float-section">
      <h2 className="sec-title">Recommandations</h2>
      <div className="carousel">{data.map((r) => <ProductCard key={r.id} p={r} s={s} />)}</div>
    </section>
  );
}
