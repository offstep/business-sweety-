import { Link, useParams, useSearchParams } from 'react-router-dom';
import ProductCard from '../components/ProductCard.jsx';
import { sb } from '../lib/supabase.js';
import { useShop } from '../contexts/ShopContext.jsx';
import { useAsync, must } from '../hooks/useAsync.js';
import { CARD_COLS } from '../lib/helpers.js';

// Catalogue, recherche (?q=) et catégorie (/categories/:slug ou ?cat=).
export default function Catalogue() {
  const { settings: s } = useShop();
  const params = useParams();
  const [sp, setSp] = useSearchParams();
  const term = (sp.get('q') || '').replace(/[%_,()]/g, ' ').trim().slice(0, 60);
  const catSlug = params.slug || sp.get('cat') || '';

  const { data, error, loading } = useAsync(async () => {
    const cats = await must(sb.from('categories').select('id, name, slug').eq('is_active', true).order('position').order('name'));
    const cat = catSlug ? cats.find((c) => c.slug === catSlug) ?? null : null;
    if (catSlug && !cat) return { cats, cat: null, products: [] };
    let q = sb.from('products').select(CARD_COLS).eq('is_active', true).order('created_at', { ascending: false }).limit(60);
    if (cat) q = q.eq('category_id', cat.id);
    if (term) q = q.ilike('name', `%${term}%`);
    return { cats, cat, products: await must(q) };
  }, [catSlug, term]);

  const onSubmit = (e) => {
    e.preventDefault();
    const v = String(new FormData(e.currentTarget).get('q') || '').trim();
    const next = new URLSearchParams();
    if (v) next.set('q', v);
    setSp(next);
  };

  if (error) return <p className="empty">Impossible de charger le catalogue.<br /><small>{error.message}</small></p>;
  if (loading) return <p className="empty">Chargement…</p>;
  if (catSlug && !data.cat) return <p className="empty">Catégorie introuvable.</p>;

  return (
    <section className="float-section">
      <h1 className="sec-title">{data.cat ? data.cat.name : 'Catalogue'}</h1>
      <form className="search" onSubmit={onSubmit} key={term}>
        <input name="q" defaultValue={term} placeholder="Rechercher un produit" aria-label="Rechercher" />
        <button className="btn" type="submit">Chercher</button>
      </form>
      {!!data.cats.length && (
        <div className="chips">
          {data.cats.map((c) => <Link key={c.id} className="chip-link" to={`/categories/${encodeURIComponent(c.slug)}`}>{c.name}</Link>)}
        </div>
      )}
      <div className="pgrid">{data.products.map((p) => <ProductCard key={p.id} p={p} s={s} />)}</div>
      {!data.products.length && (
        <p className="empty">
          {term ? 'Aucun produit ne correspond à votre recherche.' : data.cat ? 'Aucun produit dans cette catégorie pour le moment.' : 'Aucun produit pour le moment.'}
        </p>
      )}
    </section>
  );
}
