import { useEffect, useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { sb } from '../lib/supabase';
import { useSettings } from '../lib/settings';
import { useCart } from '../lib/cart';
import { toast } from '../lib/toast';
import { safe, waLink } from '../lib/utils';
import Popups from './Popups';

const Svg = ({ d, children }) => <svg viewBox="0 0 24 24" aria-hidden="true">{d ? <path d={d} /> : children}</svg>;
const ICON = {
  bell: <Svg d="M6 17V11a6 6 0 0112 0v6l2 2H4zM10 21h4" />,
  bag: <Svg d="M5 8h14l-1 12H6zM9 8V6a3 3 0 016 0v2" />,
  search: <Svg><circle cx="11" cy="11" r="7" /><path d="M20 20l-4-4" /></Svg>,
  home: <Svg d="M3 11l9-8 9 8M5 10v10h5v-6h4v6h5V10" />,
  grid: <Svg d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z" />,
  chat: <Svg d="M4 5h16v11H9l-5 4z" />,
  user: <Svg><circle cx="12" cy="8" r="4" /><path d="M4 21c1-4 4-6 8-6s7 2 8 6" /></Svg>,
};

function activeTab(p) {
  if (p === '/' || p.startsWith('/notifications')) return 'home';
  if (p.startsWith('/catalogue') || p.startsWith('/produit')) return 'catalogue';
  if (/^\/(panier|checkout|confirmation)/.test(p)) return 'panier';
  if (p.startsWith('/compte')) return 'compte';
  return '';
}

export default function Layout() {
  const s = useSettings();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const count = useCart().reduce((n, i) => n + i.qty, 0);
  const [unread, setUnread] = useState(0);
  const active = activeTab(pathname);
  const cur = (k) => (k === active ? { 'aria-current': 'page' } : {});

  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);

  // Cloche : nombre de notifications non lues + petit rappel discret, une fois par visite
  useEffect(() => {
    let alive = true;
    if (pathname.startsWith('/notifications')) { setUnread(0); return undefined; }
    (async () => {
      const { data } = await sb.from('notifications').select('created_at').eq('is_active', true).order('created_at', { ascending: false }).limit(30);
      let seen = ''; try { seen = localStorage.getItem('sb_notif_seen') || ''; } catch {}
      const n = (data || []).filter((x) => !seen || new Date(x.created_at) > new Date(seen)).length;
      if (!alive) return;
      setUnread(n);
      try {
        if (n && !/^\/(checkout|confirmation)/.test(pathname) && !sessionStorage.getItem('sb_notif_toast')) {
          sessionStorage.setItem('sb_notif_toast', '1');
          toast(n > 1 ? `Tu as ${n} nouvelles notifications.` : 'Tu as 1 nouvelle notification.', { label: 'Voir', href: 'notifications.html' });
        }
      } catch {}
    })();
    return () => { alive = false; };
  }, [pathname]);

  const showPopups = pathname === '/' || pathname === '/catalogue' || pathname.startsWith('/produit/');

  return (
    <>
      <header className="site-header">
        <Link className="icon-btn" to="/notifications" aria-label="Notifications">{ICON.bell}<span className="badge" hidden={!unread}>{unread}</span></Link>
        <Link className="brand" to="/">
          {safe(s.logo_url) ? <img className="brand-logo" src={s.logo_url} alt="" width="36" height="36" /> : null}<b>{s.shop_name}</b>
        </Link>
        <Link className="icon-btn" to="/panier" aria-label="Panier">{ICON.bag}<span className="badge" hidden={!count}>{count}</span></Link>
      </header>
      <div className="shop shop-top">
        <form className="search search--top" role="search" onSubmit={(e) => {
          e.preventDefault();
          const q = String(new FormData(e.target).get('q') || '').trim();
          navigate(q ? `/catalogue?q=${encodeURIComponent(q)}` : '/catalogue');
        }}>
          <input name="q" placeholder="Rechercher un produit" aria-label="Rechercher un produit" />
          <button className="btn search-go" type="submit" aria-label="Lancer la recherche">{ICON.search}</button>
        </form>
      </div>

      <main className="shop" id="app"><Outlet /></main>

      <nav className="bnav" aria-label="Navigation principale">
        <Link to="/" {...cur('home')}>{ICON.home}Accueil</Link>
        <Link to="/catalogue" {...cur('catalogue')}>{ICON.grid}Catalogue</Link>
        <Link to="/panier" {...cur('panier')}>{ICON.bag}Panier<span className="badge" hidden={!count}>{count}</span></Link>
        {s.whatsapp_number ? <a className="wa" href={waLink(s.whatsapp_number, `Bonjour ${s.shop_name}, j'ai une question.`)} target="_blank" rel="noopener noreferrer">{ICON.chat}WhatsApp</a> : null}
        <Link to="/compte" {...cur('compte')}>{ICON.user}Compte</Link>
      </nav>

      {showPopups ? <Popups isHome={pathname === '/'} /> : null}
    </>
  );
}
