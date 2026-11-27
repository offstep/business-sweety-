import { useEffect } from 'react';
import Img from './Img';
import Lnk from './Lnk';
import { resolveLink, safe } from '../lib/utils';
import { trackAd, trackImpression } from '../lib/ads';

function AdCard({ a }) {
  useEffect(() => { trackImpression(a.id); }, [a.id]);
  const hasLink = !!resolveLink(a.link_url);
  const btn = (cls) => (a.cta_label && hasLink
    ? <Lnk u={a.link_url} className={`btn ${cls}`.trim()} rel="noopener sponsored" onClick={() => trackAd(a.id, 'click')}>{a.cta_label}</Lnk> : null);
  const logo = safe(a.logo_url) ? <img className="ad-logo" src={a.logo_url} alt="" loading="lazy" width="44" height="44" /> : null;
  const desc = a.description ? <span className="muted">{a.description}</span> : null;
  const tag = <small className="ad-tag">Publicité · {a.business_name}</small>;

  if (a.format === 'hero_banner') return (
    <article className="float-card ad ad-hero">{tag}<Img src={a.image_url} ratio="img-frame--banner" alt={a.title} />
      <div className="ad-cap">{logo}<h3>{a.title}</h3>{a.description ? <p>{a.description}</p> : null}{btn('')}</div></article>
  );
  if (a.format === 'small_panel') return (
    <article className="float-card ad ad-panel"><Img src={a.image_url || a.logo_url} ratio="img-frame--square" alt={a.title} />
      <div className="ad-panel-body"><small className="ad-mark">Publicité · {a.business_name}</small><strong>{a.title}</strong>{desc}</div>{btn('btn--ghost sm')}</article>
  );
  if (a.format === 'home_block') return (
    <article className="float-card ad ad-block">{tag}<Img src={a.image_url} ratio="img-frame--wide" alt={a.title} />
      <div className="ad-block-body">{logo}<strong>{a.title}</strong>{desc}{btn('')}</div></article>
  );
  return (
    <article className="float-card ad">{tag}<Img src={a.image_url} ratio="img-frame--wide" alt={a.title} />
      <div className="pcard-body"><strong>{a.title}</strong>{desc}</div>{btn('btn--ghost ad-btn')}</article>
  );
}

export function AdsBlock({ ads, title, format = '' }) {
  const list = format ? ads.filter((x) => x.format === format) : ads;
  const by = (f) => list.filter((x) => x.format === f);
  const heroes = by('hero_banner'), blocks = by('home_block'), panels = by('small_panel'), cars = by('carousel');
  if (!heroes.length && !blocks.length && !panels.length && !cars.length) return null;
  return (
    <section className="float-section ad-sec">
      {title ? <h2 className="sec-title">{title}</h2> : null}
      {heroes.length ? <div className="ad-stack">{heroes.map((a) => <AdCard key={a.id} a={a} />)}</div> : null}
      {blocks.length ? <div className="ad-stack">{blocks.map((a) => <AdCard key={a.id} a={a} />)}</div> : null}
      {panels.length ? <div className="ad-panels">{panels.map((a) => <AdCard key={a.id} a={a} />)}</div> : null}
      {cars.length ? <div className="carousel">{cars.map((a) => <AdCard key={a.id} a={a} />)}</div> : null}
    </section>
  );
}
