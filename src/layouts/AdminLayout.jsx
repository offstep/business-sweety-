import { useEffect, useState } from 'react';
import { Link, Outlet, useNavigate } from 'react-router-dom';
import { sb } from '../lib/supabase.js';
import '../styles/admin.css';

// Garde d'accès : session Supabase + profiles.role = 'admin'.
// La vraie protection reste les politiques RLS : ce contrôle ne sert qu'à l'affichage.
export default function AdminLayout() {
  const [state, setState] = useState('loading'); // loading | denied | ok
  const navigate = useNavigate();

  useEffect(() => {
    let on = true;
    (async () => {
      const { data: { session } } = await sb.auth.getSession();
      if (!session) return on && setState('denied');
      const { data: pr } = await sb.from('profiles').select('role').eq('id', session.user.id).maybeSingle();
      if (on) setState(pr?.role === 'admin' ? 'ok' : 'denied');
    })();
    return () => { on = false; };
  }, []);

  if (state === 'loading') return <div className="admin"><p className="empty">Chargement…</p></div>;
  if (state === 'denied') {
    return (
      <div className="admin">
        <section className="float-section">
          <p className="empty">Accès réservé à l'administration.</p>
          <Link className="btn" to="/compte">Se connecter</Link>
        </section>
      </div>
    );
  }
  return (
    <div className="admin">
      <nav className="float-card admin-nav">
        <Link to="/admin">Produits</Link>
        <Link to="/">Voir la boutique</Link>
        <button className="link-danger" style={{ marginLeft: 'auto' }}
          onClick={async () => { await sb.auth.signOut(); navigate('/compte'); }}>Déconnexion</button>
      </nav>
      <Outlet />
    </div>
  );
}
