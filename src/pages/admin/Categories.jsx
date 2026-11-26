import { useState } from 'react';
import Img from '../../components/Img.jsx';
import { sb } from '../../lib/supabase.js';
import { useAsync, must } from '../../hooks/useAsync.js';
import { slugify } from '../../lib/helpers.js';
import { uploadImage } from '../../lib/storage.js';

export default function Categories() {
  const [version, setVersion] = useState(0);
  const [err, setErr] = useState('');
  const { data, error } = useAsync(() => must(sb.from('categories').select('*').order('position').order('name')), [version], true);
  const list = data ?? [];

  const run = async (fn) => {
    setErr('');
    try { await fn(); setVersion((v) => v + 1); } catch (x) { setErr(x.message || String(x)); }
  };
  const check = (r) => { if (r.error) throw r.error; };

  const add = (e) => {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    run(async () => {
      const name = String(fd.get('name') || '').trim();
      if (!name) throw new Error('Le nom est obligatoire.');
      const image_url = await uploadImage(fd.get('image'), 'categories');
      const position = list.reduce((m, c) => Math.max(m, c.position ?? 0), 0) + 1;
      const row = { name, slug: slugify(name), image_url, position, is_active: true };
      let res = await sb.from('categories').insert(row);
      if (res.error?.code === '23505') res = await sb.from('categories').insert({ ...row, slug: `${row.slug}-${Math.random().toString(36).slice(2, 6)}` });
      check(res);
      form.reset();
    });
  };
  const rename = (c) => (e) => {
    e.preventDefault();
    const name = String(new FormData(e.currentTarget).get('name') || '').trim();
    if (!name || name === c.name) return;
    run(async () => check(await sb.from('categories').update({ name }).eq('id', c.id)));
  };
  const toggle = (c) => run(async () => check(await sb.from('categories').update({ is_active: !c.is_active }).eq('id', c.id)));
  const remove = (c) => {
    if (!window.confirm(`Supprimer la catégorie « ${c.name} » ? Les produits ne sont pas supprimés.`)) return;
    run(async () => check(await sb.from('categories').delete().eq('id', c.id)));
  };
  const move = (i, d) => run(async () => {
    const order = list.slice();
    const j = i + d;
    if (j < 0 || j >= order.length) return;
    [order[i], order[j]] = [order[j], order[i]];
    const results = await Promise.all(order.map((c, k) => sb.from('categories').update({ position: k + 1 }).eq('id', c.id)));
    results.forEach(check);
  });
  const newImage = (c) => (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    run(async () => {
      const url = await uploadImage(file, 'categories');
      check(await sb.from('categories').update({ image_url: url }).eq('id', c.id));
    });
  };

  return (
    <>
      <h1>Catégories</h1>
      {(err || error) && <p className="msg msg--err">{err || error.message}</p>}
      <form className="float-card form-col" onSubmit={add}>
        <div className="two">
          <label>Nouvelle catégorie<input name="name" placeholder="Chaussures" required /></label>
          <label>Image (facultatif)<input name="image" type="file" accept="image/*" /></label>
        </div>
        <button className="btn" type="submit">Ajouter la catégorie</button>
      </form>

      <div className="cat-list">
        {list.map((c, i) => (
          <div key={c.id} className="float-card cat-row">
            <span className="cat-img"><Img src={c.image_url} ratio="img-frame--square" alt={c.name} /></span>
            <div className="cat-main">
              <form className="form-inline" onSubmit={rename(c)}>
                <input name="name" defaultValue={c.name} aria-label="Nom" required />
                <button className="btn btn--ghost" type="submit">Renommer</button>
              </form>
              <div className="cat-actions">
                <label className="check"><input type="checkbox" checked={!!c.is_active} onChange={() => toggle(c)} /> Visible</label>
                <button className="link-danger" style={{ color: 'inherit' }} onClick={() => move(i, -1)} disabled={i === 0} aria-label="Monter">↑</button>
                <button className="link-danger" style={{ color: 'inherit' }} onClick={() => move(i, 1)} disabled={i === list.length - 1} aria-label="Descendre">↓</button>
                <label className="link-img">Changer l'image<input type="file" accept="image/*" onChange={newImage(c)} hidden /></label>
                <button className="link-danger" onClick={() => remove(c)}>Supprimer</button>
              </div>
            </div>
          </div>
        ))}
        {data && !list.length && <p className="empty">Aucune catégorie pour le moment.</p>}
      </div>
    </>
  );
}
