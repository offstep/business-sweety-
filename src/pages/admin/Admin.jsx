import { useCallback, useEffect, useMemo, useState } from 'react';
import { Navigate, NavLink, Route, Routes, useLocation, useParams } from 'react-router-dom';
import { sb } from '../../lib/supabase';
import { useSession } from '../../lib/auth';
import { useAsync } from '../../lib/utils';
import { AdminCtx, Loading } from './common';
import { Categories, Dashboard, ProductEdit, Products } from './Catalog';
import { Ads, Home, Notifications, Popups, SectionEdit, Settings } from './Content';
import { Codes, Delivery, Orders, Promotions } from './Sales';
import '../../styles/admin.css';

const NAV = [['dashboard', 'Tableau de bord'], ['orders', 'Commandes'], ['products', 'Produits'], ['categories', 'Catégories'], ['home', 'Accueil'], ['promotions', 'Promotions'], ['codes', 'Codes promo'], ['delivery', 'Livraison'], ['ads', 'Publicités'], ['popups', 'Popups'], ['notifications', 'Notifications'], ['settings', 'Paramètres']];

function Login({ msg = '', signedIn = false }) {
  const [err, setErr] = useState('');
  return (
    <main className="login">
      <form className="float-card login-card" onSubmit={async (e) => {
        e.preventDefault();
        const f = new FormData(e.target);
        const { error } = await sb.auth.signInWithPassword({ email: String(f.get('email')).trim(), password: String(f.get('password')) });
        if (error) setErr('E-mail ou mot de passe incorrect.');
      }}>
        <h1>Espace administrateur</h1>
        {msg ? <p className="msg msg--err">{msg}</p> : null}
        {err ? <p className="msg msg--err">{err}</p> : null}
        {signedIn ? <button className="btn btn--ghost" type="button" onClick={() => sb.auth.signOut()}>Se déconnecter</button> : (
          <>
            <label>E-mail<input name="email" type="email" required autoComplete="email" /></label>
            <label>Mot de passe<input name="password" type="password" required autoComplete="current-password" /></label>
            <button className="btn" type="submit">Se connecter</button>
          </>
        )}
      </form>
    </main>
  );
}

function ProductEditRoute() {
  const { id, cat } = useParams();
  return <ProductEdit key={id || `new-${cat || ''}`} id={id} cat={cat} />;
}

function Shell() {
  const [msg, setMsg] = useState(null);
  const { pathname } = useLocation();
  const note = useCallback((text, bad = false) => { setMsg({ text, bad }); window.scrollTo({ top: 0, behavior: 'smooth' }); }, []);
  const fail = useCallback((e) => note(e?.message || String(e), true), [note]);
  const ctx = useMemo(() => ({ note, fail }), [note, fail]);
  useEffect(() => { setMsg(null); }, [pathname]);

  return (
    <AdminCtx.Provider value={ctx}>
      <div className="admin">
        <nav className="admin-nav float-card">
          {NAV.map(([h, l]) => <NavLink key={h} to={`/admin/${h}`}>{l}</NavLink>)}
          <button className="btn btn--ghost" style={{ marginLeft: 'auto' }} onClick={() => sb.auth.signOut()}>Déconnexion</button>
        </nav>
        {msg ? <p className={`msg ${msg.bad ? 'msg--err' : 'msg--ok'}`}>{msg.text}</p> : null}
        <main className="admin-main">
          <Routes>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="orders" element={<Orders />} />
            <Route path="products" element={<Products />} />
            <Route path="products/:cat" element={<Products />} />
            <Route path="product/new/:cat?" element={<ProductEditRoute />} />
            <Route path="product/:id" element={<ProductEditRoute />} />
            <Route path="categories" element={<Categories />} />
            <Route path="home" element={<Home />} />
            <Route path="section/:id" element={<SectionEdit />} />
            <Route path="promotions" element={<Promotions />} />
            <Route path="codes" element={<Codes />} />
            <Route path="delivery" element={<Delivery />} />
            <Route path="ads" element={<Ads />} />
            <Route path="popups" element={<Popups />} />
            <Route path="notifications" element={<Notifications />} />
            <Route path="settings" element={<Settings />} />
            <Route path="*" element={<Navigate to="dashboard" replace />} />
          </Routes>
        </main>
      </div>
    </AdminCtx.Provider>
  );
}

export default function Admin() {
  const session = useSession();
  const uid = session?.user?.id;
  const { loading, data: profile } = useAsync(async () => (uid ? (await sb.from('profiles').select('role').eq('id', uid).maybeSingle()).data : null), [uid]);
  let body;
  if (session === undefined || (session && loading)) body = <Loading />;
  else if (!session) body = <Login />;
  else if (profile?.role !== 'admin') body = <Login msg="Ce compte n'a pas accès à l'administration." signedIn />;
  else body = <Shell />;
  return <div className="admin-root">{body}</div>;
}
