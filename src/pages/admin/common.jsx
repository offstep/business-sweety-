import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { sb } from '../../lib/supabase';
import { safe, useAsync } from '../../lib/utils';

// Toutes les écritures passent par la session de l'administratrice : Supabase les autorise ou les refuse (règles RLS, is_admin()).
export const AdminCtx = createContext({ note: () => {}, fail: () => {} });
export const useAdmin = () => useContext(AdminCtx);

export const slugify = (t) => `${t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'item'}-${Math.random().toString(36).slice(2, 6)}`;
export const iso = (v) => (v ? new Date(v).toISOString() : null);
export const period = (r) => (r.starts_at || r.ends_at
  ? ` · ${r.starts_at ? `du ${new Date(r.starts_at).toLocaleDateString('fr-FR')}` : ''}${r.ends_at ? ` au ${new Date(r.ends_at).toLocaleDateString('fr-FR')}` : ''}` : '');

export async function upload(file, folder) {
  if (!file || !file.size) return null;
  if (!file.type.startsWith('image/')) throw new Error('Le fichier doit être une image.');
  if (file.size > 5 * 1024 * 1024) throw new Error('Image trop lourde (5 Mo maximum).');
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '');
  const path = `${folder}/${crypto.randomUUID()}.${ext}`;
  const { error } = await sb.storage.from('media').upload(path, file, { contentType: file.type, cacheControl: '31536000' });
  if (error) throw new Error(error.message);
  return sb.storage.from('media').getPublicUrl(path).data.publicUrl;
}

// Chargement d'une vue : `reload()` relit les données, `version` change à chaque lecture (sert de key aux formulaires).
export function useLoad(fn, deps = []) {
  const { fail } = useAdmin();
  const [version, setVersion] = useState(0);
  const s = useAsync(fn, [...deps, version]);
  useEffect(() => { if (s.error) fail(s.error); }, [s.error]); // eslint-disable-line react-hooks/exhaustive-deps
  return { ...s, version, reload: () => setVersion((v) => v + 1) };
}

// <form> qui lit les champs, attend le traitement et affiche les erreurs en haut de page.
export function Form({ onSubmit, reset = false, children, ...p }) {
  const { fail } = useAdmin();
  const busy = useRef(false);
  return (
    <form {...p} onSubmit={async (e) => {
      e.preventDefault();
      if (busy.current) return;
      const el = e.currentTarget; busy.current = true;
      try { await onSubmit(new FormData(el), el); if (reset) el.reset(); } catch (x) { fail(x); } finally { busy.current = false; }
    }}>{children}</form>
  );
}

export function Del({ t, id, label = 'Supprimer', onDone }) {
  const { note, fail } = useAdmin();
  return (
    <button className="link-danger" type="button" onClick={async () => {
      if (!confirm('Supprimer définitivement ?')) return;
      const { error } = await sb.from(t).delete().eq('id', id);
      if (error) return fail(error);
      note('Supprimé.'); onDone();
    }}>{label}</button>
  );
}

export function Toggle({ t, id, on, onDone }) {
  const { fail } = useAdmin();
  return (
    <button className="btn btn--ghost sm" type="button" onClick={async () => {
      const { error } = await sb.from(t).update({ is_active: !on }).eq('id', id);
      if (error) fail(error); else onDone();
    }}>{on ? 'Désactiver' : 'Activer'}</button>
  );
}

export const Thumb = ({ u, c = 'img-frame--square' }) => (
  <div className={`img-frame ${c}`}>{safe(u) ? <img src={u} alt="" loading="lazy" /> : null}</div>
);
export const Badge = ({ on }) => <span className={`stock ${on ? 'stock--ok' : 'stock--low'}`}>{on ? 'active' : 'inactive'}</span>;
export const DateFields = () => (
  <div className="two">
    <label>Début (facultatif)<input name="starts_at" type="datetime-local" /></label>
    <label>Fin (facultatif)<input name="ends_at" type="datetime-local" /></label>
  </div>
);
export const Loading = () => <p className="empty">Chargement…</p>;
