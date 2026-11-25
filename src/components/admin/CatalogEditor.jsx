import { useState } from 'react';
import Img from '../Img.jsx';
import { sb } from '../../lib/supabase.js';
import { fcfa } from '../../lib/helpers.js';
import { uploadImage } from '../../lib/storage.js';

const text = (fd, k) => String(fd.get(k) || '').trim();

export default function CatalogEditor({ productId, images, optionTypes, supplements, onChange }) {
  const [err, setErr] = useState('');
  const fail = (x) => setErr(x?.message || String(x));
  const check = (error) => { if (error) throw error; };

  // Soumission d'un petit formulaire : valide, écrit dans Supabase, vide le formulaire, recharge.
  const submit = (fn) => async (e) => {
    e.preventDefault();
    const form = e.currentTarget;
    setErr('');
    try { await fn(new FormData(form)); form.reset(); onChange(); } catch (x) { fail(x); }
  };
  const remove = (table, id) => async () => {
    setErr('');
    try { check((await sb.from(table).delete().eq('id', id)).error); onChange(); } catch (x) { fail(x); }
  };

  // ---------- Variantes ----------
  const addOptionType = submit(async (fd) => {
    const name = text(fd, 'name');
    if (!name) throw new Error('Le nom de la variante est obligatoire.');
    const kind = ['color', 'button', 'select'].includes(text(fd, 'kind')) ? text(fd, 'kind') : 'button';
    check((await sb.from('option_types').insert({ product_id: productId, name, kind })).error);
  });
  const addOptionValue = (typeId) => submit(async (fd) => {
    const label = text(fd, 'label');
    if (!label) throw new Error('Le nom de la valeur est obligatoire.');
    const color = text(fd, 'color_hex');
    check((await sb.from('option_values').insert({
      option_type_id: typeId, label,
      color_hex: /^#[0-9a-f]{6}$/i.test(color) ? color : null,
      image_id: text(fd, 'image_id') || null, // photo affichée quand le client choisit cette valeur
    })).error);
  });

  // ---------- Suppléments ----------
  const addSupplement = submit(async (fd) => {
    const name = text(fd, 'name');
    const price = Number.parseInt(fd.get('price'), 10);
    if (!name) throw new Error('Le nom du supplément est obligatoire.');
    if (!Number.isInteger(price) || price < 0) throw new Error('Prix du supplément invalide.');
    const image_url = await uploadImage(fd.get('image'), 'supplements');
    check((await sb.from('supplements').insert({
      product_id: productId, name, price, image_url,
      description: text(fd, 'description') || null,
      is_required: fd.get('is_required') === 'on',
    })).error);
  });
  const addSupplementOption = (supId) => submit(async (fd) => {
    const name = text(fd, 'name');
    const values = text(fd, 'values').split(',').map((v) => v.trim()).filter(Boolean);
    if (!name || !values.length) throw new Error('Indique un nom et au moins une valeur (séparées par des virgules).');
    check((await sb.from('supplement_option_types').insert({ supplement_id: supId, name, values })).error);
  });

  return (
    <section id="catalogue">
      {err && <p className="msg msg--err">{err}</p>}
      <h2>Variantes</h2>
      <p className="muted">Couleur, taille, marque, modèle, matière… Pour une couleur, associe une photo : elle s'affichera quand le client la choisit.</p>

      {optionTypes.map((t) => (
        <div key={t.id} className="float-card block">
          <div className="head">
            <strong>{t.name} <small className="muted">({t.kind === 'color' ? 'couleurs' : t.kind === 'select' ? 'menu' : 'boutons'})</small></strong>
            <button className="link-danger" onClick={remove('option_types', t.id)}>Supprimer la variante</button>
          </div>
          <ul className="chips">
            {(t.option_values ?? []).map((v) => {
              const im = images.find((i) => i.id === v.image_id);
              return (
                <li key={v.id} className="chip">
                  {v.color_hex && <i className="dot" style={{ background: v.color_hex }} />}
                  {im && <span className="mini"><Img src={im.url} ratio="img-frame--square" alt={v.label} /></span>}
                  {v.label}
                  <button className="link-danger" onClick={remove('option_values', v.id)} aria-label={`Retirer ${v.label}`}>×</button>
                </li>
              );
            })}
          </ul>
          <form className="form-inline" onSubmit={addOptionValue(t.id)}>
            <input name="label" placeholder={t.kind === 'color' ? 'Ex. Noir' : 'Ex. 42'} required />
            {t.kind === 'color' && <input name="color_hex" type="color" defaultValue="#000000" aria-label="Couleur" />}
            {t.kind === 'color' && (
              <select name="image_id" defaultValue="">
                <option value="">Photo liée (aucune)</option>
                {images.map((im, i) => <option key={im.id} value={im.id}>Photo {i + 1}</option>)}
              </select>
            )}
            <button className="btn btn--ghost" type="submit">Ajouter</button>
          </form>
        </div>
      ))}

      <form className="float-card form-inline block" onSubmit={addOptionType}>
        <input name="name" placeholder="Nouvelle variante (Couleur, Taille…)" required />
        <select name="kind" defaultValue="button">
          <option value="color">Couleurs</option><option value="button">Boutons</option><option value="select">Menu déroulant</option>
        </select>
        <button className="btn" type="submit">Créer</button>
      </form>

      <h2>Suppléments</h2>
      <p className="muted">Accessoires proposés avec ce produit : leur prix s'ajoute au total.</p>

      {supplements.map((s) => (
        <div key={s.id} className="float-card block">
          <div className="head">
            <div className="sup">
              <span className="mini mini--lg"><Img src={s.image_url} ratio="img-frame--square" alt={s.name} /></span>
              <div>
                <strong>{s.name}</strong> <span className="price">{fcfa(s.price)}</span>
                <div className="muted">{s.is_required ? 'Obligatoire' : 'Facultatif'}</div>
              </div>
            </div>
            <button className="link-danger" onClick={remove('supplements', s.id)}>Supprimer</button>
          </div>
          <ul className="chips">
            {(s.supplement_option_types ?? []).map((o) => (
              <li key={o.id} className="chip">
                {o.name} : {(o.values || []).join(' / ')}
                <button className="link-danger" onClick={remove('supplement_option_types', o.id)} aria-label={`Retirer ${o.name}`}>×</button>
              </li>
            ))}
          </ul>
          <form className="form-inline" onSubmit={addSupplementOption(s.id)}>
            <input name="name" placeholder="Variante (Couleur, Marque…)" required />
            <input name="values" placeholder="Valeurs : Noir, Blanc" required />
            <button className="btn btn--ghost" type="submit">Ajouter</button>
          </form>
        </div>
      ))}

      <form className="float-card form-col block" onSubmit={addSupplement}>
        <div className="two">
          <label>Nom<input name="name" placeholder="Chaussettes" required /></label>
          <label>Prix (FCFA)<input name="price" type="number" min="0" step="1" defaultValue="0" required /></label>
        </div>
        <label>Description<input name="description" /></label>
        <label>Image<input name="image" type="file" accept="image/*" /></label>
        <label className="check"><input name="is_required" type="checkbox" /> Supplément obligatoire</label>
        <button className="btn" type="submit">Ajouter le supplément</button>
      </form>
    </section>
  );
}
