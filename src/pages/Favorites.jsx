import { Link } from 'react-router-dom';
import ProductCard from '../components/ProductCard.jsx';
import { GridSkeleton } from '../components/Skeleton.jsx';
import { sb } from '../lib/supabase.js';
import { useShop } from '../contexts/ShopContext.jsx';
import { useFavs } from '../contexts/FavContext.jsx';
import { useAsync, must } from '../hooks/useAsync.js';
import { CARD_COLS } from '../lib/helpers.js';

export default function Favorites() {
  const { settings: s } = useShop();
  const { ids } = useFavs();
  const key = ids.join(',');
  const { data, loading, error } = useAsync(
    () => (ids.length ? must(sb.from('products').select(CARD_COLS).eq('is_active', true).in('id', ids)) : []),
    [key],
  );
  // L'ordre des favoris est conservé (le plus récent d'abord)
  const list = (data ?? []).slice().sort((a, b) => ids.indexOf(a.id) - ids.indexOf(b.id));
  return (
    <section className="float-section">
      <h1 className="sec-title">Mes favoris</h1>
      {loading && ids.length > 0 && <GridSkeleton n={Math.min(ids.length, 4)} />}
      {error && <p className="empty">Impossible de charger les favoris.<br /><small>{error.message}</small></p>}
      {!ids.length && <p className="empty">Touche le cœur d'un produit pour le retrouver ici.</p>}
      <div className="pgrid">{list.map((p) => <ProductCard key={p.id} p={p} s={s} />)}</div>
      {!ids.length && <Link className="btn" to="/catalogue">Découvrir les produits</Link>}
    </section>
  );
}
