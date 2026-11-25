import { Link } from 'react-router-dom';
import Img from './Img.jsx';
import ProductCard from './ProductCard.jsx';
import SmartLink from './SmartLink.jsx';
import { sb } from '../lib/supabase.js';
import { useAsync, must } from '../hooks/useAsync.js';
import { CARD_COLS, safe, toRoute } from '../lib/helpers.js';

const Title = ({ children }) => (children ? <h2 className="sec-title">{children}</h2> : null);
const Sec = ({ children }) => <section className="float-section">{children}</section>;
const Cta = ({ c }) => (c.button_label && toRoute(c.link_url) ? <SmartLink className="btn" to={c.link_url}>{c.button_label}</SmartLink> : null);

function Grid({ title, list, s, large }) {
  if (!list?.length) return null;
  return (
    <Sec>
      <Title>{title}</Title>
      <div className={`pgrid${large ? ' pgrid--large' : ''}`}>{list.map((p) => <ProductCard key={p.id} p={p} s={s} large={large} />)}</div>
    </Sec>
  );
}

function Products({ x, s, def, filter, shuffle = false }) {
  const { data } = useAsync(async () => {
    let q = sb.from('products').select(CARD_COLS).eq('is_active', true);
    if (filter) q = filter(q);
    const list = await must(q.order('created_at', { ascending: false }).limit(shuffle ? 24 : 8));
    return shuffle ? [...list].sort(() => Math.random() - 0.5).slice(0, 8) : list;
  }, []);
  return <Grid title={x.title || def} list={data} s={s} large={x.config?.layout === 'large'} />;
}

function Slider({ x, ratio }) {
  const imgs = (x.config?.images ?? []).filter((i) => safe(i.url));
  if (!imgs.length) return null;
  return (
    <Sec>
      <Title>{x.title}</Title>
      <div className="carousel">
        {imgs.map((i, n) => {
          const el = <Img src={i.url} ratio={ratio} alt={i.alt ?? ''} extra="float-img" />;
          return toRoute(i.link) ? <SmartLink key={n} to={i.link}>{el}</SmartLink> : <div key={n}>{el}</div>;
        })}
      </div>
    </Sec>
  );
}

function Hero({ x }) {
  const c = x.config ?? {};
  if (!safe(c.image_url)) {
    return (
      <section className="hero hero--plain float-card">
        {c.title && <h2>{c.title}</h2>}{c.subtitle && <p>{c.subtitle}</p>}<Cta c={c} />
      </section>
    );
  }
  return (
    <section className="hero float-card">
      <Img src={c.image_url} ratio="img-frame--banner" alt={c.title ?? ''} eager />
      <div className="hero-cap">{c.title && <h2>{c.title}</h2>}{c.subtitle && <p>{c.subtitle}</p>}<Cta c={c} /></div>
    </section>
  );
}

function Pill({ x }) {
  const c = x.config ?? {};
  const t = c.title || c.text;
  if (!t) return null;
  return toRoute(c.link_url)
    ? <SmartLink className="pill-banner" to={c.link_url}>{t}</SmartLink>
    : <div className="pill-banner">{t}</div>;
}

function Categories({ x }) {
  const { data } = useAsync(() => must(sb.from('categories').select('id, name, slug, image_url').eq('is_active', true).order('position').order('name')), []);
  if (!data?.length) return null;
  const href = (k) => `/categories/${encodeURIComponent(k.slug)}`;
  return (
    <Sec>
      <Title>{x.title || 'Catégories'}</Title>
      {x.config?.style === 'chips' ? (
        <div className="chips">{data.map((k) => <Link key={k.id} className="chip-link" to={href(k)}>{k.name}</Link>)}</div>
      ) : (
        <div className="carousel carousel--cats">
          {data.map((k) => (
            <Link key={k.id} className="catlink" to={href(k)}>
              <Img src={k.image_url} ratio="img-frame--square" extra="round float-img" alt={k.name} />{k.name}
            </Link>
          ))}
        </div>
      )}
    </Sec>
  );
}

function Promotions({ x }) {
  const { data } = useAsync(() => must(sb.from('promotions').select('id, name').eq('is_active', true)), []);
  if (!data?.length) return null;
  return (
    <Sec>
      <Title>{x.title || 'Promotions'}</Title>
      <div className="carousel">{data.map((p) => <div key={p.id} className="float-card promo-tile"><strong>{p.name}</strong></div>)}</div>
    </Sec>
  );
}

function PartnerAds({ x }) {
  const { data } = useAsync(() => must(sb.from('ads').select('id, business_name, title, description, image_url, cta_label, link_url').eq('is_active', true)), []);
  if (!data?.length) return null;
  return (
    <Sec>
      <Title>{x.title || 'Nos partenaires'}</Title>
      <div className="carousel">
        {data.map((a) => (
          <article key={a.id} className="float-card ad">
            <small className="ad-tag">Publicité · {a.business_name}</small>
            <Img src={a.image_url} ratio="img-frame--wide" alt={a.title} />
            <div className="pcard-body"><strong>{a.title}</strong><span className="muted">{a.description}</span></div>
            {a.cta_label && toRoute(a.link_url) && (
              <SmartLink className="btn btn--ghost ad-btn" to={a.link_url} target="_blank" rel="noopener sponsored">{a.cta_label}</SmartLink>
            )}
          </article>
        ))}
      </div>
    </Sec>
  );
}

function TextImage({ x }) {
  const c = x.config ?? {};
  return (
    <section className="float-section textimg">
      <Img src={c.image_url} ratio="img-frame--wide" extra="float-img" alt={c.title ?? ''} />
      <div>{c.title && <h2 className="sec-title">{c.title}</h2>}<p className="muted">{c.text}</p><Cta c={c} /></div>
    </section>
  );
}

export default function Section({ x, s }) {
  const c = x.config ?? {};
  switch (x.type) {
    case 'hero_banner': return <Hero x={x} />;
    case 'custom_banner': return safe(c.image_url) ? <Hero x={x} /> : <Pill x={x} />;
    case 'image_slider':
    case 'carousel': return <Slider x={x} ratio="img-frame--wide" />;
    case 'categories': return <Categories x={x} />;
    case 'popular': return <Products x={x} s={s} def="Produits populaires" filter={(q) => q.eq('is_popular', true)} />;
    case 'new_arrivals': return <Products x={x} s={s} def="Nouveautés" />;
    case 'recommendations': return <Products x={x} s={s} def="Recommandations" shuffle />;
    case 'promotions': return <Promotions x={x} />;
    case 'partner_ads': return <PartnerAds x={x} />;
    case 'text_image': return <TextImage x={x} />;
    default: return null;
  }
}
