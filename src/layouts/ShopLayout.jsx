import { Link, Outlet, useNavigate } from 'react-router-dom';
import Icon from '../components/Icons.jsx';
import BottomNav from '../components/BottomNav.jsx';
import { useCart } from '../contexts/CartContext.jsx';
import { useShop } from '../contexts/ShopContext.jsx';
import { useUnread } from '../hooks/useUnread.js';
import { safe } from '../lib/helpers.js';

export default function ShopLayout() {
  const { settings: s, ready } = useShop();
  const { count } = useCart();
  const unread = useUnread();
  const navigate = useNavigate();

  const onSearch = (e) => {
    e.preventDefault();
    const q = String(new FormData(e.currentTarget).get('q') || '').trim();
    navigate(q ? `/catalogue?q=${encodeURIComponent(q)}` : '/catalogue');
  };

  return (
    <>
      <header className="site-header">
        <Link className="icon-btn" to="/notifications" aria-label="Notifications">
          <Icon n="bell" />{unread > 0 && <span className="badge">{unread}</span>}
        </Link>
        <Link className="brand" to="/">
          {safe(s.logo_url) && <img className="brand-logo" src={s.logo_url} alt="" width="36" height="36" />}
          <b>{s.shop_name}</b>
        </Link>
        <Link className="icon-btn" to="/panier" aria-label="Panier">
          <Icon n="bag" />{count > 0 && <span className="badge">{count}</span>}
        </Link>
      </header>
      <div className="shop shop-top">
        <form className="search search--top" role="search" onSubmit={onSearch}>
          <input name="q" placeholder="Rechercher un produit" aria-label="Rechercher un produit" />
          <button className="btn search-go" type="submit" aria-label="Lancer la recherche"><Icon n="search" /></button>
        </form>
      </div>
      <main className="shop">{ready ? <Outlet /> : <p className="empty">Chargement…</p>}</main>
      <BottomNav />
    </>
  );
}
