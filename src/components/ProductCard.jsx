import { Link } from 'react-router-dom';
import Img from './Img.jsx';
import FavButton from './FavButton.jsx';
import { cover, fcfa, isLow } from '../lib/helpers.js';

export default function ProductCard({ p, s, large = false }) {
  const low = isLow(p, s);
  return (
    <div className="pcard-wrap">
      <Link className="float-card pcard" to={`/produits/${encodeURIComponent(p.slug)}`}>
        <Img src={cover(p)} ratio={large ? '' : 'img-frame--square'} alt={p.name} />
        <div className="pcard-body">
          <strong>{p.name}</strong>
          <span className="price">{fcfa(p.price)}</span>
          <span className={`stock ${low ? 'stock--low' : 'stock--ok'}`}>{low ? 'Bientôt épuisé' : 'En stock'}</span>
        </div>
      </Link>
      <FavButton id={p.id} name={p.name} />
    </div>
  );
}
