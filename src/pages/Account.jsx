import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { sb } from '../lib/supabase';
import { useSession } from '../lib/auth';
import { canInstall, install, isIOS, isStandalone } from '../lib/pwa';
import { normalizePhone, phoneEmail, useAsync } from '../lib/utils';

const valid = (d) => d.length >= 8 && d.length <= 15;

function InstallButton() {
  const [can, setCan] = useState(canInstall());
  useEffect(() => { const h = () => setCan(true); window.addEventListener('sb-installable', h); return () => window.removeEventListener('sb-installable', h); }, []);
  if (isStandalone) return null;
  if (isIOS) return <p className="muted">Pour installer l'application : touche Partager puis « Sur l'écran d'accueil ».</p>;
  return <button className="btn btn--ghost" hidden={!can} onClick={async () => { await install(); setCan(canInstall()); }}>Installer l'application</button>;
}

function Profile({ session }) {
  const { data: p } = useAsync(async () => (await sb.from('profiles').select('full_name, phone, role').eq('id', session.user.id).maybeSingle()).data, [session.user.id]);
  return (
    <section className="float-section auth"><h1 className="sec-title">Mon compte</h1>
      <div className="float-card account"><strong>{p?.full_name || 'Client'}</strong><span className="muted">{p?.phone || ''}</span></div>
      {p?.role === 'admin' ? <Link className="btn btn--ghost" to="/admin">Espace administrateur</Link> : null}
      <button className="btn btn--ghost" onClick={() => sb.auth.signOut()}>Se déconnecter</button>
      <InstallButton />
    </section>
  );
}

function AuthForm({ mode }) {
  const nav = useNavigate();
  const [err, setErr] = useState('');
  const signup = mode === 'signup';

  const submit = async (ev) => {
    ev.preventDefault();
    const f = new FormData(ev.target);
    const phone = normalizePhone(f.get('phone')), password = String(f.get('password'));
    if (!valid(phone)) return setErr('Numéro de téléphone invalide.');
    setErr('');
    if (signup) {
      const name = String(f.get('name')).trim().slice(0, 120);
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
    nav('/compte');
  };

  return (
    <section className="float-section auth">
      <div className="tabs">
        <Link to="/compte" aria-current={!signup ? 'page' : undefined}>Connexion</Link>
        <Link to="/compte/inscription" aria-current={signup ? 'page' : undefined}>Inscription</Link>
      </div>
      <form className="auth" onSubmit={submit} key={mode}>
        {err ? <p className="msg msg--err">{err}</p> : null}
        {signup ? <label>Nom complet<input name="name" required autoComplete="name" /></label> : null}
        <label>Numéro de téléphone<input name="phone" type="tel" inputMode="tel" required autoComplete="tel" placeholder="07 00 00 00 00" /></label>
        <label>Mot de passe<input name="password" type="password" minLength={signup ? 8 : 1} required autoComplete={signup ? 'new-password' : 'current-password'} /></label>
        {signup ? <label>Confirmer le mot de passe<input name="confirm" type="password" minLength={8} required autoComplete="new-password" /></label> : null}
        <button className="btn" type="submit">{signup ? "S'inscrire" : 'Se connecter'}</button>
      </form>
      <InstallButton />
    </section>
  );
}

export default function Account() {
  const session = useSession();
  const { mode } = useParams();
  if (session === undefined) return <p className="empty">Chargement…</p>;
  return session ? <Profile session={session} /> : <AuthForm mode={mode === 'inscription' ? 'signup' : 'login'} />;
}
