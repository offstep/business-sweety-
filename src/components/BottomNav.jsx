import { Link, useLocation } from 'react-router-dom';
import Icon from './Icons.jsx';
import { useCart } from '../contexts/CartContext.jsx';
import { useShop } from '../contexts/ShopContext.jsx';
import { waLink } from '../lib/helpers.js';

export default function BottomNav() {
  const { pathname } = useLocation();
  const { count } = useCart();
  const { settings: s } = useShop();
  const on = (...hs) => (hs.some((h) => (h === '/' ? pathname === '/' : pathname.startsWith(h))) ? 'page' : undefined);
  return (
    <nav className="bnav" aria-label="Navigation principale">
      <Link to="/" aria-current={on('/')}><Icon n="home" />Accueil</Link>
      <Link to="/catalogue" aria-current={on('/catalogue', '/categories', '/produits')}><Icon n="grid" />Catalogue</Link>
      <Link to="/panier" aria-current={on('/panier')}><Icon n="bag" />Panier{count > 0 && <span className="badge">{count}</span>}</Link>
      {s.whatsapp_number && (
        <a className="wa" href={waLink(s.whatsapp_number, `Bonjour ${s.shop_name}, j'ai une question.`)} target="_blank" rel="noopener noreferrer">
          <Icon n="chat" />WhatsApp
        </a>
      )}
      <Link to="/compte" aria-current={on('/compte')}><Icon n="user" />Compte</Link>
    </nav>
  );
}
