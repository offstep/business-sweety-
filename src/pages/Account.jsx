import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { sb } from '../lib/supabase.js';
import { isValidPhone, normalizePhone, phoneEmail } from '../lib/helpers.js';

export default function Account() {
  const [sp, setSp] = useSearchParams();
  const mode = sp.get('mode') === 'inscription' ? 'signup' : 'login';
  const [session, setSession] = useState(undefined);   // undefined = chargement
  const [profile, setProfile] = useState(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    sb.auth.getSession().then(({ data }) => setSession(data.session ?? null));
    const { data: sub } = sb.auth.onAuthStateChange((_e, sess) => setSession(sess ?? null));
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) { setProfile(null); return; }
    let on = true;
    sb.from('profiles').select('full_name, phone, role').eq('id', session.user.id).maybeSingle()
      .then(({ data }) => on && setProfile(data));
    return () => { on = false; };
  }, [session]);

  const setMode = (m) => { setErr(''); setSp(m === 'signup' ? { mode: 'inscription' } : {}); };

  async function submit(e) {
    e.preventDefault();
    setErr('');
    const f = new FormData(e.currentTarget);
    const phone = normalizePhone(f.get('phone'));
    const password = String(f.get('password') || '');
    if (!isValidPhone(phone)) return setErr('Numéro de téléphone invalide.');
    setBusy(true);
    try {
      if (mode === 'signup') {
        const name = String(f.get('name') || '').trim().slice(0, 120);
        if (name.length < 2) return setErr('Indique ton nom complet.');
        if (password.length < 8) return setErr('Le mot de passe doit faire au moins 8 caractères.');
        if (password !== f.get('confirm')) return setErr('Les mots de passe ne correspondent pas.');
        const { data, error } = await sb.auth.signUp({ email: phoneEmail(phone), password, options: { data: { full_name: name, phone } } });
        if (error) return setErr(/registered|exists/i.test(error.message) ? 'Un compte existe déjà avec ce numéro. Connecte-toi.' : "L'inscription a échoué. Réessaie dans un instant.");
        if (!data.session) return setErr('Inscription enregistrée, mais la confirmation par e-mail est encore activée dans Supabase : désactive « Confirm email ».');
      } else {
        const { error } = await sb.auth.signInWithPassword({ email: phoneEmail(phone), password });
        if (error) return setErr('Numéro ou mot de passe incorrect.');
      }
    } finally { setBusy(false); }
  }

  if (session === undefined) return <p className="empty">Chargement…</p>;

  if (session) {
    return (
      <section className="float-section auth">
        <h1 className="sec-title">Mon compte</h1>
        <div className="float-card account">
          <strong>{profile?.full_name || 'Client'}</strong>
          <span className="muted">{profile?.phone || ''}</span>
        </div>
        {profile?.role === 'admin' && <Link className="btn btn--ghost" to="/admin">Espace administrateur</Link>}
        <button className="btn btn--ghost" onClick={() => sb.auth.signOut()}>Se déconnecter</button>
      </section>
    );
  }

  return (
    <section className="float-section auth">
      <div className="tabs">
        <a href="#/compte" aria-current={mode === 'login' ? 'page' : undefined} onClick={(e) => { e.preventDefault(); setMode('login'); }}>Connexion</a>
        <a href="#/compte?mode=inscription" aria-current={mode === 'signup' ? 'page' : undefined} onClick={(e) => { e.preventDefault(); setMode('signup'); }}>Inscription</a>
      </div>
      <form className="auth" onSubmit={submit} key={mode}>
        {err && <p className="msg msg--err">{err}</p>}
        {mode === 'signup' && <label>Nom complet<input name="name" required autoComplete="name" /></label>}
        <label>Numéro de téléphone<input name="phone" type="tel" inputMode="tel" required autoComplete="tel" placeholder="07 00 00 00 00" /></label>
        <label>Mot de passe<input name="password" type="password" minLength={mode === 'signup' ? 8 : 1} required autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} /></label>
        {mode === 'signup' && <label>Confirmer le mot de passe<input name="confirm" type="password" minLength={8} required autoComplete="new-password" /></label>}
        <button className="btn" type="submit" disabled={busy}>{mode === 'signup' ? "S'inscrire" : 'Se connecter'}</button>
      </form>
    </section>
  );
}
