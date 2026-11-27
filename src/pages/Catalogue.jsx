import { Link, useSearchParams } from 'react-router-dom';
import { sb } from '../lib/supabase';
import { useSettings } from '../lib/settings';
import { CARD_COLS, useAsync } from '../lib/utils';
import { liveAds } from '../lib/ads';
import ProductCard from '../components/ProductCard';
import { AdsBlock } from '../components/Ads';

export default function Catalogue() {
  const s = useSettings();
  const [params] = useSearchParams();
  const term = (params.get('q') || '').replace(/[%_,()]/g, ' ').trim().slice(0, 60);
  const catSlug = params.get('cat');

  const { loading, data } = useAsync(async () => {
    const { data: cats } = await sb.from('categories').select('id, name, slug').eq('is_active', true).order('position').order('name');
    const cat = cats?.find((c) => c.slug === catSlug);
    let q = sb.from('products').select(CARD_COLS).eq('is_active', true).order('created_at', { ascending: false }).limit(60);
    if (cat) q = q.eq('category_id', cat.id);
    if (term) q = q.ilike('name', `%${term}%`);
    const [{ data: products, error }, ads] = await Promise.all([q, liveAds(['catalogue'])]);
    return { cats, cat, products, error, ads };
  }, [term, catSlug]);

  if (loading || !data) return <p className="empty">Chargement…</p>;
  const { cats, cat, products, error, ads } = data;
  return (
    <section className="float-section">
      <h1 className="sec-title">{cat?.name || (term ? `Recherche : ${term}` : 'Catalogue')}</h1>
      {cats?.length ? (
        <div className="chips">
          <Link className="chip-link" to="/catalogue">Tout</Link>
          {cats.map((c) => <Link key={c.id} className="chip-link" to={`/catalogue?cat=${encodeURIComponent(c.slug)}`}>{c.name}</Link>)}
        </div>
      ) : null}
      <AdsBlock ads={ads} title="" />
      <div className="pgrid">{(products ?? []).map((p) => <ProductCard key={p.id} p={p} s={s} />)}</div>
      {error ? <p className="empty">{error.message}</p>
        : !products?.length ? <p className="empty">{term ? 'Aucun produit ne correspond à votre recherche.' : 'Aucun produit pour le moment.'}</p> : null}
    </section>
  );
}
