import { Link } from 'react-router-dom';
import Img from './Img';
import { cover, fcfa, isLow } from '../lib/utils';

export default function ProductCard({ p, s, large = false }) {
  const low = isLow(p, s);
  return (
    <Link className="float-card pcard" to={`/produit/${encodeURIComponent(p.slug)}`}>
      <Img src={cover(p)} ratio={large ? '' : 'img-frame--square'} alt={p.name} />
      <div className="pcard-body">
        <strong>{p.name}</strong>
        <span className="price">{fcfa(p.price)}</span>
        <span className={`stock ${low ? 'stock--low' : 'stock--ok'}`}>{low ? 'Bientôt épuisé' : 'En stock'}</span>
      </div>
    </Link>
  );
}
