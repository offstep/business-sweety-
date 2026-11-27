import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { sb } from '../lib/supabase';
import { useSettings } from '../lib/settings';
import { CARD_COLS, fcfa, resolveLink, safe, sortBy, useAsync, waLink } from '../lib/utils';
import { liveAds } from '../lib/ads';
import Img from '../components/Img';
import Lnk from '../components/Lnk';
import ProductCard from '../components/ProductCard';
import { AdsBlock } from '../components/Ads';

const calm = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
const lines = (t) => String(t || '').split('\n').map((x) => x.trim()).filter(Boolean);
const Title = ({ t }) => (t ? <h2 className="sec-title">{t}</h2> : null);
const Sec = ({ children, className = '' }) => <section className={`float-section ${className}`.trim()}>{children}</section>;
const Cta = ({ c }) => (c.button_label && resolveLink(c.link_url) ? <Lnk className="btn" u={c.link_url}>{c.button_label}</Lnk> : null);

// ---------- Apparition au défilement ----------
function Reveal({ children }) {
  const ref = useRef(null);
  const [on, setOn] = useState(calm || typeof IntersectionObserver === 'undefined');
  useEffect(() => {
    if (on || !ref.current) return undefined;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setOn(true); io.disconnect(); } }, { threshold: 0.12 });
    io.observe(ref.current);
    const t = setTimeout(() => setOn(true), 3000); // sécurité
    return () => { io.disconnect(); clearTimeout(t); };
  }, [on]);
  return <div ref={ref} className={`reveal${on ? ' in' : ''}`}>{children}</div>;
}

// ---------- Sections simples ----------
function Hero({ x }) {
  const c = x.config ?? {};
  if (!safe(c.image_url)) {
    return <section className="hero hero--plain float-card">{c.title ? <h2>{c.title}</h2> : null}{c.subtitle ? <p>{c.subtitle}</p> : null}<Cta c={c} /></section>;
  }
  return (
    <section className="hero float-card"><Img src={c.image_url} ratio="img-frame--banner" alt={c.title} />
      <div className="hero-cap">{c.title ? <h2>{c.title}</h2> : null}{c.subtitle ? <p>{c.subtitle}</p> : null}<Cta c={c} /></div></section>
  );
}
function Pill({ x }) {
  const c = x.config ?? {}; const t = c.title || c.text;
  if (!t) return null;
  return resolveLink(c.link_url) ? <Lnk className="pill-banner" u={c.link_url}>{t}</Lnk> : <div className="pill-banner">{t}</div>;
}
function Slider({ x, ratio }) {
  const imgs = (x.config?.images ?? []).filter((i) => safe(i.url));
  if (!imgs.length) return null;
  return (
    <Sec><Title t={x.title} />
      <div className="carousel">{imgs.map((i, k) => {
        const el = <Img src={i.url} ratio={ratio} alt={i.alt} extra="float-img" />;
        return resolveLink(i.link) ? <Lnk key={k} u={i.link}>{el}</Lnk> : <div key={k}>{el}</div>;
      })}</div>
    </Sec>
  );
}
function Collage({ x }) {
  const imgs = (x.config?.images ?? []).filter((i) => safe(i.url)).slice(0, 3);
  if (!imgs.length) return null;
  return (
    <Sec><Title t={x.title} />
      <div className="collage">{imgs.map((i, k) => {
        const el = <Img src={i.url} ratio="img-frame--square" alt={i.alt} />;
        return resolveLink(i.link) ? <Lnk key={k} u={i.link}>{el}</Lnk> : <div key={k}>{el}</div>;
      })}</div>
    </Sec>
  );
}
function TextImage({ x }) {
  const c = x.config ?? {};
  return (
    <section className="float-section textimg"><Img src={c.image_url} ratio="img-frame--wide" alt={c.title} extra="float-img" />
      <div>{c.title ? <h2 className="sec-title">{c.title}</h2> : null}<p className="muted">{c.text}</p><Cta c={c} /></div></section>
  );
}
function Marquee({ x }) {
  const items = lines(x.config?.text);
  if (!items.length) return null;
  const run = [...items, ...items, ...items, ...items].map((t, i) => <span key={i}>{t}</span>);
  return <div className="marquee" aria-label={items.join(', ')}><div className="marquee-track">{run}{run}</div></div>;
}
const CHECK = <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>;
function Features({ x }) {
  const items = lines(x.config?.text).map((l) => l.split('|').map((p) => p.trim()));
  if (!items.length) return null;
  return (
    <Sec><Title t={x.title} />
      <div className="feat-grid">{items.map(([t, d], i) => (
        <div key={i} className="float-card feat"><i className="feat-ic">{CHECK}</i><strong>{t}</strong>{d ? <span>{d}</span> : null}</div>
      ))}</div>
    </Sec>
  );
}
function AdInvite({ x, s }) {
  const c = x.config ?? {};
  const wa = s.whatsapp_number ? waLink(s.whatsapp_number, `Bonjour, je souhaite faire ma publicité sur ${s.shop_name}.`) : '';
  return (
    <section className="float-section ad-invite"><span className="flash-tag">Espace publicitaire</span>
      <h2>{c.title || "Ton commerce mérite d'être vu"}</h2>
      <p>{c.text || `Salon, restaurant, boutique… fais ta publicité sur ${s.shop_name} et touche de nouveaux clients.`}</p>
      {wa ? <a className="btn wa" href={wa} target="_blank" rel="noopener noreferrer">{c.button_label || 'Faire ma publicité'}</a> : null}</section>
  );
}

// ---------- Compte à rebours (la section disparaît à la fin de l'offre) ----------
function Countdown({ x }) {
  const c = x.config ?? {}; const end = Date.parse(c.ends_at);
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);
  if (!end || end <= now) return null;
  const sec = Math.floor((end - now) / 1000), two = (n) => String(n).padStart(2, '0');
  const units = [[Math.floor(sec / 86400), 'jours'], [Math.floor(sec / 3600) % 24, 'heures'], [Math.floor(sec / 60) % 60, 'min'], [sec % 60, 'sec']];
  return (
    <section className="float-section flash"><span className="flash-tag">{x.title || 'Vente flash'}</span>
      {c.title ? <h2>{c.title}</h2> : null}{c.subtitle ? <p>{c.subtitle}</p> : null}
      <div className="count" role="timer">{units.map(([n, l]) => <div key={l}><b>{two(n)}</b><small>{l}</small></div>)}</div><Cta c={c} /></section>
  );
}

// ---------- Sections qui chargent des données ----------
function Categories({ x }) {
  const { data } = useAsync(async () => (await sb.from('categories').select('id, name, slug, image_url').eq('is_active', true).order('position').order('name')).data ?? []);
  if (!data?.length) return null;
  const to = (k) => `/catalogue?cat=${encodeURIComponent(k.slug)}`;
  const style = x.config?.style;
  return (
    <Sec><Title t={x.title || 'Catégories'} />
      {style === 'tiles'
        ? <div className="tiles">{data.map((k) => <Link key={k.id} className="tile float-card" to={to(k)}><Img src={k.image_url} ratio="img-frame--square" alt={k.name} /><span className="tile-name">{k.name}</span></Link>)}</div>
        : style === 'chips'
          ? <div className="chips">{data.map((k) => <Link key={k.id} className="chip-link" to={to(k)}>{k.name}</Link>)}</div>
          : <div className="carousel carousel--cats">{data.map((k) => <Link key={k.id} className="catlink" to={to(k)}><Img src={k.image_url} ratio="img-frame--square round float-img" alt={k.name} />{k.name}</Link>)}</div>}
    </Sec>
  );
}

function ProductGrid({ title, list, layout, s }) {
  if (!list?.length) return null;
  const large = layout === 'large';
  const cards = list.map((p) => <ProductCard key={p.id} p={p} s={s} large={large} />);
  return (
    <Sec>
      <div className="sec-head">{title ? <h2 className="sec-title">{title}</h2> : <span />}<Link className="more" to="/catalogue">Voir tout</Link></div>
      {layout === 'carousel' ? <div className="carousel carousel--products">{cards}</div> : <div className={`pgrid${large ? ' pgrid--large' : ''}`}>{cards}</div>}
    </Sec>
  );
}
function Products({ x, s, kind }) {
  const { data } = useAsync(async () => {
    let q = sb.from('products').select(CARD_COLS).eq('is_active', true);
    if (kind === 'popular') q = q.eq('is_popular', true).order('created_at', { ascending: false }).limit(8);
    else if (kind === 'new_arrivals') q = q.order('created_at', { ascending: false }).limit(8);
    else q = q.order('created_at', { ascending: false }).limit(24);
    const list = (await q).data ?? [];
    return kind === 'recommendations' ? list.sort(() => Math.random() - 0.5).slice(0, 8) : list;
  }, [kind]);
  const title = x.title || { popular: 'Produits populaires', new_arrivals: 'Nouveautés', recommendations: 'Recommandations' }[kind];
  return <ProductGrid title={title} list={data} layout={x.config?.layout} s={s} />;
}
function Promotions({ x }) {
  const { data } = useAsync(async () => (await sb.from('promotions').select('id, name').eq('is_active', true)).data ?? []);
  if (!data?.length) return null;
  return <Sec><Title t={x.title || 'Promotions'} /><div className="carousel">{data.map((p) => <div key={p.id} className="float-card promo-tile"><strong>{p.name}</strong></div>)}</div></Sec>;
}
function PartnerAds({ x }) {
  const { data } = useAsync(() => liveAds(['accueil']));
  return data ? <AdsBlock ads={data} title={x.title || 'Nos partenaires'} format={x.config?.ad_format || ''} /> : null;
}
function Spotlight({ x }) {
  const id = x.config?.product_id;
  const { data: p } = useAsync(async () => (id ? (await sb.from('products').select(CARD_COLS).eq('id', id).eq('is_active', true).maybeSingle()).data : null), [id]);
  if (!p) return null;
  const cv = sortBy(p.product_images)[0]?.url;
  return (
    <section className="float-section spot-sec"><div className="spot"><div className="spot-img"><Img src={cv} alt={p.name} /></div>
      <div style={{ display: 'grid', gap: 10 }}><span className="tag">{x.title || 'Coup de cœur'}</span>
        <strong>{p.name}</strong><span className="price big-price">{fcfa(p.price)}</span>
        <Link className="btn" to={`/produit/${encodeURIComponent(p.slug)}`}>Voir le produit</Link></div></div></section>
  );
}

function Section({ x, s }) {
  switch (x.type) {
    case 'hero_banner': return <Hero x={x} />;
    case 'custom_banner': return safe(x.config?.image_url) ? <Hero x={x} /> : <Pill x={x} />;
    case 'image_slider': case 'carousel': return <Slider x={x} ratio="img-frame--wide" />;
    case 'categories': return <Categories x={x} />;
    case 'popular': case 'new_arrivals': case 'recommendations': return <Products x={x} s={s} kind={x.type} />;
    case 'promotions': return <Promotions x={x} />;
    case 'partner_ads': return <PartnerAds x={x} />;
    case 'ad_invite': return <AdInvite x={x} s={s} />;
    case 'text_image': return <TextImage x={x} />;
    case 'marquee': return <Marquee x={x} />;
    case 'countdown': return <Countdown x={x} />;
    case 'features': return <Features x={x} />;
    case 'collage': return <Collage x={x} />;
    case 'spotlight': return <Spotlight x={x} />;
    default: return null;
  }
}

export default function Home() {
  const s = useSettings();
  const { loading, data: sections, error } = useAsync(async () => {
    const r = await sb.from('home_sections').select('*').eq('is_visible', true).order('position');
    if (r.error) throw r.error;
    return r.data ?? [];
  });
  const list = useMemo(() => sections ?? [], [sections]);
  if (loading) return <p className="empty">Chargement…</p>;
  if (error) return <p className="empty">Impossible de charger la boutique.<br /><small>{error.message}</small></p>;
  if (!list.length) return <p className="empty">Aucune section n'est encore configurée.</p>;
  return <>{list.map((x) => <Reveal key={x.id}><Section x={x} s={s} /></Reveal>)}</>;
}
