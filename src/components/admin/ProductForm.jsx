import { useState } from 'react';
import Img from '../Img.jsx';
import { sb } from '../../lib/supabase.js';
import { slugify } from '../../lib/helpers.js';
import { uploadImage } from '../../lib/storage.js';

export default function ProductForm({ product, categories, images = [], onSaved, onChanged, onDeleted }) {
  const p = product ?? { is_active: true, stock: 0, price: 0 };
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    setErr(''); setBusy(true);
    try {
      const name = String(fd.get('name') || '').trim();
      const price = Number.parseInt(fd.get('price'), 10);
      const stock = Number.parseInt(fd.get('stock'), 10);
      const th = fd.get('low_stock_threshold');
      if (!name) throw new Error('Le nom est obligatoire.');
      if (!Number.isInteger(price) || price < 0) throw new Error('Prix invalide.');
      if (!Number.isInteger(stock) || stock < 0) throw new Error('Stock invalide.');
      const fields = {
        name,
        description: String(fd.get('description') || '').trim() || null,
        price, stock,
        category_id: fd.get('category_id') || null,
        video_url: String(fd.get('video_url') || '').trim() || null,
        low_stock_threshold: th === '' || th === null ? null : Number.parseInt(th, 10),
        is_active: fd.get('is_active') === 'on',
        is_popular: fd.get('is_popular') === 'on',
      };

      let productId = product?.id;
      if (productId) {
        const { error } = await sb.from('products').update(fields).eq('id', productId);
        if (error) throw error;
      } else {
        let slug = slugify(name);
        let res = await sb.from('products').insert({ ...fields, slug }).select('id').single();
        if (res.error?.code === '23505') { // slug déjà pris : on suffixe
          slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`;
          res = await sb.from('products').insert({ ...fields, slug }).select('id').single();
        }
        if (res.error) throw res.error;
        productId = res.data.id;
      }

      // Photos : plusieurs fichiers, ajoutées à la suite de la galerie existante
      const files = fd.getAll('images').filter((f) => f && f.size);
      if (files.length) {
        const { count } = await sb.from('product_images').select('*', { count: 'exact', head: true }).eq('product_id', productId);
        let position = count ?? 0;
        for (const file of files) {
          const url = await uploadImage(file, `products/${productId}`);
          const { error } = await sb.from('product_images').insert({ product_id: productId, url, alt: name, position: position++ });
          if (error) throw error;
        }
        if (form.elements.images) form.elements.images.value = '';
      }
      onSaved(productId, !product);
    } catch (x) {
      setErr(x.message || String(x));
    } finally { setBusy(false); }
  }

  async function removeImage(id) {
    const { error } = await sb.from('product_images').delete().eq('id', id);
    if (error) setErr(error.message); else onChanged();
  }
  async function removeProduct() {
    if (!window.confirm('Supprimer ce produit définitivement ?')) return;
    const { error } = await sb.from('products').delete().eq('id', product.id);
    if (error) setErr(error.message); else onDeleted();
  }

  return (
    <>
      {err && <p className="msg msg--err">{err}</p>}
      <form className="float-card form-col" onSubmit={submit}>
        <label>Nom<input name="name" defaultValue={p.name} required /></label>
        <label>Description<textarea name="description" rows={5} defaultValue={p.description ?? ''} /></label>
        <div className="two">
          <label>Prix (FCFA)<input name="price" type="number" min="0" step="1" defaultValue={p.price} required /></label>
          <label>Stock<input name="stock" type="number" min="0" step="1" defaultValue={p.stock} required /></label>
        </div>
        <div className="two">
          <label>Catégorie
            <select name="category_id" defaultValue={p.category_id ?? ''}>
              <option value="">Sans catégorie</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </label>
          <label>Seuil « Bientôt épuisé »
            <input name="low_stock_threshold" type="number" min="0" defaultValue={p.low_stock_threshold ?? ''} placeholder="Seuil global" />
          </label>
        </div>
        <label>Vidéo (lien, facultatif)<input name="video_url" type="url" defaultValue={p.video_url ?? ''} /></label>
        <label>Ajouter des photos<input name="images" type="file" accept="image/*" multiple /></label>
        <label className="check"><input name="is_active" type="checkbox" defaultChecked={p.is_active} /> Visible dans la boutique</label>
        <label className="check"><input name="is_popular" type="checkbox" defaultChecked={!!p.is_popular} /> Produit populaire</label>
        <button className="btn" type="submit" disabled={busy}>{busy ? 'Enregistrement…' : 'Enregistrer le produit'}</button>
      </form>

      {product && (
        <>
          <h2>Galerie</h2>
          <div className="grid grid--thumbs">
            {images.map((im) => (
              <div key={im.id} className="float-card thumb">
                <Img src={im.url} ratio="img-frame--square" alt={im.alt ?? ''} />
                <div style={{ padding: 8, textAlign: 'center' }}>
                  <button className="link-danger" onClick={() => removeImage(im.id)}>Retirer</button>
                </div>
              </div>
            ))}
            {!images.length && <p className="muted">Aucune photo pour le moment.</p>}
          </div>
          <button className="link-danger" onClick={removeProduct}>Supprimer ce produit</button>
        </>
      )}
    </>
  );
}
