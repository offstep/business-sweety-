import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { sb } from '../lib/supabase';
import { useSettings } from '../lib/settings';
import { cart } from '../lib/cart';
import { toast } from '../lib/toast';
import { CARD_COLS, fcfa, isLow, safe, sortBy, useAsync, waLink } from '../lib/utils';
import { liveAds } from '../lib/ads';
import Img from '../components/Img';
import ProductCard from '../components/ProductCard';
import { AdsBlock } from '../components/Ads';

export default function Product() {
  const { slug } = useParams();
  const { loading, data: p } = useAsync(async () => (await sb.from('products')
    .select('*, product_images(*), option_types(*, option_values(*)), supplements(*, supplement_option_types(*))')
    .eq('slug', slug || '').eq('is_active', true).maybeSingle()).data, [slug]);
  if (loading) return <p className="empty">Chargement…</p>;
  if (!p) return <p className="empty">Produit introuvable.</p>;
  return <ProductView key={p.id} p={p} />;
}

function ProductView({ p }) {
  const s = useSettings();
  const images = useMemo(() => sortBy(p.product_images), [p]);
  const types = useMemo(() => sortBy(p.option_types).map((t) => ({ ...t, values: sortBy(t.option_values) })), [p]);
  const sups = useMemo(() => (p.supplements || []).filter((x) => x.is_active !== false), [p]);

  const [sel, setSel] = useState({});                                  // typeId -> valueId
  const [supSel, setSupSel] = useState(() => Object.fromEntries(sups.map((x) => [x.id, { on: !!x.is_required, opts: {} }])));
  const [qty, setQty] = useState(1);
  const [idx, setIdx] = useState(0);
  const low = isLow(p, s);
  const inStock = p.stock > 0;

  const chosen = types.map((t) => ({ name: t.name, label: t.values.find((v) => v.id === sel[t.id])?.label })).filter((o) => o.label);
  const chosenSups = sups.filter((x) => supSel[x.id].on).map((x) => ({
    id: x.id, name: x.name, price: x.price,
    options: Object.fromEntries((x.supplement_option_types || []).map((o) => [o.name, supSel[x.id].opts[o.id]]).filter(([, v]) => v)),
  }));
  const supPerUnit = chosenSups.reduce((n, x) => n + x.price, 0);
  const problem = (() => {
    if (!inStock) return 'Ce produit est bientôt épuisé.';
    const t = types.find((t) => !sel[t.id]); if (t) return `Choisis : ${t.name}`;
    for (const x of sups.filter((x) => supSel[x.id].on)) {
      const o = (x.supplement_option_types || []).find((o) => !supSel[x.id].opts[o.id]);
      if (o) return `${x.name} : choisis ${o.name}`;
    }
    return '';
  })();
  const message = () => {
    const o = chosen.map((x) => `${x.name} : ${x.label}`).join(', ');
    const su = chosenSups.map((x) => `${x.name}${Object.values(x.options).length ? ` (${Object.values(x.options).join(', ')})` : ''} +${fcfa(x.price)}`).join('\n  ');
    return `Bonjour, je souhaite commander :\n• ${p.name} — ${fcfa(p.price)}${o ? `\nVariantes : ${o}` : ''}${su ? `\nSuppléments :\n  ${su}` : ''}\nQuantité : ${qty}\nTotal : ${fcfa((p.price + supPerUnit) * qty)}\nLien : ${location.href}`;
  };

  // l'image suit la couleur choisie
  const pick = (typeId, valueId) => {
    setSel((v) => ({ ...v, [typeId]: valueId }));
    const val = types.flatMap((t) => t.values).find((v) => v.id === valueId);
    const i = images.findIndex((im) => im.id === val?.image_id);
    if (i >= 0) setIdx(i);
  };
  const setSup = (id, patch) => setSupSel((v) => ({ ...v, [id]: { ...v[id], ...patch } }));

  const add = () => {
    if (problem) return;
    const options = Object.fromEntries(chosen.map((o) => [o.name, o.label]));
    cart.add({ key: JSON.stringify([p.id, options, chosenSups]), productId: p.id, slug: p.slug, name: p.name, image: images[0]?.url || '',
      unitPrice: p.price, supplementsPerUnit: supPerUnit, qty, options, supplements: chosenSups });
    toast('Ajouté au panier', { type: 'success', label: 'Voir le panier', href: 'panier.html' });
  };
  const share = async () => {
    try {
      const blob = await (await fetch(images[idx].url)).blob();
      const file = new File([blob], 'produit.jpg', { type: blob.type });
      if (navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], text: message() }); return; }
    } catch {}
    window.open(waLink(s.whatsapp_number, message()), '_blank');
  };

  const video = safe(p.video_url) ? (/\.(mp4|webm)(\?|$)/i.test(p.video_url)
    ? <video className="vid" controls preload="none" playsInline src={p.video_url} />
    : <a className="btn btn--ghost" style={{ marginTop: 12 }} href={p.video_url} target="_blank" rel="noopener noreferrer">Voir la vidéo</a>) : null;

  return (
    <>
      <section className="float-section">
        <Img src={images[idx]?.url} alt={p.name} extra="float-img" />
        {images.length > 1 ? (
          <div className="thumbs">{images.map((im, i) => (
            <button key={im.id} onClick={() => setIdx(i)} aria-pressed={i === idx} aria-label={`Photo ${i + 1}`}><Img src={im.url} ratio="img-frame--square" /></button>
          ))}</div>
        ) : null}
        {video}
        <h1 className="sec-title" style={{ marginTop: 18 }}>{p.name}</h1>
        <div className="price big-price">{fcfa(p.price)}</div>
        <div className={`stock ${low ? 'stock--low' : 'stock--ok'}`}>{low ? 'Bientôt épuisé' : 'En stock'}</div>
        {p.description ? <p style={{ whiteSpace: 'pre-line' }}>{p.description}</p> : null}

        {types.map((t) => (
          <div className="field" key={t.id}><span>{t.name}</span>
            {t.kind === 'select' ? (
              <select value={sel[t.id] || ''} onChange={(e) => pick(t.id, e.target.value)}>
                <option value="">Choisir</option>{t.values.map((v) => <option key={v.id} value={v.id}>{v.label}</option>)}
              </select>
            ) : (
              <div className="opts">{t.values.map((v) => (
                <button key={v.id} className="opt" aria-pressed={sel[t.id] === v.id} onClick={() => pick(t.id, v.id)}>
                  {v.color_hex ? <i className="dot" style={{ background: v.color_hex }} /> : null}{v.label}
                </button>
              ))}</div>
            )}
          </div>
        ))}

        {sups.length ? <h2 className="sec-title" style={{ marginTop: 22 }}>Suppléments</h2> : null}
        {sups.map((x) => (
          <div className="float-card sup" key={x.id}><Img src={x.image_url} ratio="img-frame--square" alt={x.name} />
            <div>
              <label><input type="checkbox" checked={supSel[x.id].on} disabled={!!x.is_required} onChange={(e) => setSup(x.id, { on: e.target.checked })} /> {x.name} <span className="price">+{fcfa(x.price)}</span></label>
              {x.description ? <small className="muted">{x.description}</small> : null}
              {supSel[x.id].on ? (x.supplement_option_types || []).map((o) => (
                <div className="field" key={o.id}><span>{o.name}</span>
                  <select value={supSel[x.id].opts[o.id] || ''} onChange={(e) => setSup(x.id, { opts: { ...supSel[x.id].opts, [o.id]: e.target.value } })}>
                    <option value="">Choisir</option>{(o.values || []).map((v) => <option key={v}>{v}</option>)}
                  </select>
                </div>
              )) : null}
            </div>
          </div>
        ))}

        <div className="field"><span>Quantité</span>
          <div className="qty"><button onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="Moins">−</button><b>{qty}</b><button onClick={() => setQty((q) => Math.min(99, q + 1))} aria-label="Plus">+</button></div></div>
        <div className="price big-price">Total : {fcfa((p.price + supPerUnit) * qty)}</div>
        {problem ? <p className="muted">{problem}</p> : null}
        <div className="actions">
          <button className="btn" onClick={add} disabled={!!problem}>Ajouter au panier</button>
          {s.whatsapp_number ? <a className="btn wa" href={waLink(s.whatsapp_number, message())} target="_blank" rel="noopener noreferrer">Contacter sur WhatsApp</a> : null}
          {navigator.canShare && images[idx] ? <button className="btn btn--ghost" onClick={share}>Envoyer avec la photo</button> : null}
        </div>
      </section>
      <Extras p={p} s={s} />
    </>
  );
}

// Sous la fiche : recommandations, publicité partenaire, autres catégories
function Extras({ p, s }) {
  const { data } = useAsync(async () => {
    let rq = sb.from('products').select(CARD_COLS).eq('is_active', true).neq('id', p.id).order('created_at', { ascending: false }).limit(8);
    if (p.category_id) rq = rq.eq('category_id', p.category_id);
    const [{ data: recos }, ads, { data: cats }] = await Promise.all([rq, liveAds(['produit']),
      sb.from('categories').select('id, name, slug, image_url').eq('is_active', true).order('position').order('name')]);
    return { recos, ads, others: (cats ?? []).filter((c) => c.id !== p.category_id) };
  }, [p.id]);
  if (!data) return null;
  const { recos, ads, others } = data;
  return (
    <div>
      {recos?.length ? (
        <section className="float-section">
          <div className="sec-head"><h2 className="sec-title">Recommandations</h2><Link className="more" to="/catalogue">Voir tout</Link></div>
          <div className="carousel carousel--products">{recos.map((r) => <ProductCard key={r.id} p={r} s={s} />)}</div>
        </section>
      ) : null}
      <AdsBlock ads={ads} title="Nos partenaires" />
      {others.length ? (
        <section className="float-section"><h2 className="sec-title">Explorer d'autres catégories</h2>
          <div className="tiles">{others.map((c) => (
            <Link key={c.id} className="tile float-card" to={`/catalogue?cat=${encodeURIComponent(c.slug)}`}><Img src={c.image_url} ratio="img-frame--square" alt={c.name} /><span className="tile-name">{c.name}</span></Link>
          ))}</div>
        </section>
      ) : null}
    </div>
  );
}
