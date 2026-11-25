import { Link } from 'react-router-dom';
import Img from '../../components/Img.jsx';
import { sb } from '../../lib/supabase.js';
import { useAsync, must } from '../../hooks/useAsync.js';
import { cover, fcfa } from '../../lib/helpers.js';

export default function ProductsList() {
  const { data, error, loading } = useAsync(() => must(sb.from('products')
    .select('id, name, price, stock, is_active, product_images(url, position)').order('created_at', { ascending: false })), []);
  return (
    <>
      <div className="head">
        <h1>Produits</h1>
        <Link className="btn" to="/admin/produits/nouveau">Nouveau produit</Link>
      </div>
      {loading && <p className="empty">Chargement…</p>}
      {error && <p className="msg msg--err">{error.message}</p>}
      {data && !data.length && <p className="empty">Aucun produit pour le moment.</p>}
      <div className="grid">
        {(data ?? []).map((p) => (
          <Link key={p.id} className="float-card prod" to={`/admin/produits/${p.id}`}>
            <Img src={cover(p)} ratio="img-frame--square" alt={p.name} />
            <div className="prod-body">
              <strong>{p.name}</strong>
              <span className="price">{fcfa(p.price)}</span>
              <span className="muted">Stock : {p.stock}{p.is_active ? '' : ' · Masqué'}</span>
            </div>
          </Link>
        ))}
      </div>
    </>
  );
}
