import { Link, useNavigate, useParams } from 'react-router-dom';
import { sb } from '../../lib/supabase';
import { fcfa, sortBy } from '../../lib/utils';
import { Del, Form, Loading, Thumb, slugify, upload, useAdmin, useLoad } from './common';

// ---------- Tableau de bord ----------
export function Dashboard() {
  const { data } = useLoad(async () => {
    const [{ count: np }, { count: nc }, { data: set }, { data: prods }, { data: ords }] = await Promise.all([
      sb.from('products').select('*', { count: 'exact', head: true }), sb.from('categories').select('*', { count: 'exact', head: true }),
      sb.from('settings').select('low_stock_threshold').eq('id', 1).maybeSingle(),
      sb.from('products').select('id, name, stock, low_stock_threshold').order('stock').limit(50),
      sb.from('orders').select('total, status').limit(5000)]);
    return { np, nc, set, prods, ords };
  });
  if (!data) return <Loading />;
  const { np, nc, set, prods, ords } = data;
  const g = set?.low_stock_threshold ?? 5;
  const low = (prods ?? []).filter((p) => p.stock <= (p.low_stock_threshold ?? g));
  const live = (ords ?? []).filter((o) => o.status !== 'cancelled');
  const revenue = live.reduce((n, o) => n + o.total, 0);
  const pending = (ords ?? []).filter((o) => ['new', 'preparing', 'shipped'].includes(o.status)).length;
  const done = (ords ?? []).filter((o) => o.status === 'delivered').length;
  return (
    <>
      <h1>Tableau de bord</h1>
      <div className="stats">
        <Link className="float-card stat" to="/admin/products"><b>{np ?? 0}</b><span>Produits</span></Link>
        <Link className="float-card stat" to="/admin/categories"><b>{nc ?? 0}</b><span>Catégories</span></Link>
        <div className="float-card stat"><b>{low.length}</b><span>Bientôt épuisés</span></div>
        <Link className="float-card stat" to="/admin/orders"><b>{live.length}</b><span>Commandes</span></Link>
        <div className="float-card stat"><b>{fcfa(revenue)}</b><span>Chiffre d'affaires</span></div>
        <div className="float-card stat"><b>{pending}</b><span>En cours</span></div>
        <div className="float-card stat"><b>{done}</b><span>Livrées</span></div>
      </div>
      {low.length ? <>
        <h2>À réapprovisionner</h2>
        {low.map((p) => <Link key={p.id} className="float-card block" to={`/admin/product/${p.id}`} style={{ display: 'block', color: 'inherit' }}>{p.name} <span className="stock stock--low">Bientôt épuisé</span></Link>)}
      </> : null}
    </>
  );
}

// ---------- Catégories ----------
export function Categories() {
  const { note } = useAdmin();
  const { data, reload } = useLoad(async () => (await sb.from('categories').select('id, name, image_url, products(count)').order('position').order('name')).data ?? []);
  if (!data) return <Loading />;

  const save = (isNew) => async (f, el) => {
    const url = await upload(f.get('image'), 'categories');
    const name = String(f.get('name')).trim();
    const { error } = isNew
      ? await sb.from('categories').insert({ name, slug: slugify(name), ...(url ? { image_url: url } : {}) })
      : await sb.from('categories').update({ name, ...(url ? { image_url: url } : {}) }).eq('id', f.get('id'));
    if (error) throw error;
    note('Enregistré.'); if (isNew) el.reset(); reload();
  };

  return (
    <>
      <h1>Catégories</h1>
      <Form className="float-card form-row" onSubmit={save(true)}>
        <input name="name" placeholder="Nouvelle catégorie" required /><input name="image" type="file" accept="image/*" /><button className="btn" type="submit">Ajouter la catégorie</button>
      </Form>
      <div className="grid">
        {data.map((c) => (
          <article className="float-card cat" key={c.id}>
            <Thumb u={c.image_url} c="img-frame--wide" />
            <Form className="cat-body" onSubmit={save(false)}>
              <input type="hidden" name="id" value={c.id} /><input name="name" defaultValue={c.name} required />
              <input name="image" type="file" accept="image/*" /><button className="btn btn--ghost" type="submit">Enregistrer</button>
            </Form>
            <div className="cat-actions">
              <Link to={`/admin/products/${c.id}`}>{c.products?.[0]?.count ?? 0} produit(s)</Link>
              <Link to={`/admin/product/new/${c.id}`}>Ajouter un produit</Link>
              <Del t="categories" id={c.id} onDone={reload} />
            </div>
          </article>
        ))}
        {data.length ? null : <p className="muted">Aucune catégorie.</p>}
      </div>
    </>
  );
}

// ---------- Produits ----------
export function Products() {
  const { cat } = useParams();
  const { data } = useLoad(async () => {
    let q = sb.from('products').select('id, name, price, stock, low_stock_threshold, is_active, product_images(url, position)').order('created_at', { ascending: false });
    if (cat) q = q.eq('category_id', cat);
    const [{ data: list }, { data: set }] = await Promise.all([q, sb.from('settings').select('low_stock_threshold').eq('id', 1).maybeSingle()]);
    return { list: list ?? [], g: set?.low_stock_threshold ?? 5 };
  }, [cat]);
  if (!data) return <Loading />;
  return (
    <>
      <div className="head"><h1>Produits</h1><Link className="btn" to={`/admin/product/new${cat ? `/${cat}` : ''}`}>Nouveau produit</Link></div>
      <div className="grid">
        {data.list.map((p) => {
          const low = p.stock <= (p.low_stock_threshold ?? data.g);
          return (
            <Link key={p.id} className="float-card prod" to={`/admin/product/${p.id}`}>
              <Thumb u={sortBy(p.product_images)[0]?.url} />
              <div className="prod-body"><strong>{p.name}</strong><span className="price">{fcfa(p.price)}</span>
                <span className={`stock ${low ? 'stock--low' : 'stock--ok'}`}>{low ? 'Bientôt épuisé' : 'En stock'}{p.is_active ? '' : ' · masqué'}</span></div>
            </Link>
          );
        })}
        {data.list.length ? null : <p className="muted">Aucun produit.</p>}
      </div>
    </>
  );
}

// ---------- Fiche produit (création / modification) ----------
export function ProductEdit({ id, cat }) {
  const nav = useNavigate();
  const { note } = useAdmin();
  const isNew = !id;
  const { data, version, reload } = useLoad(async () => {
    const [{ data: cats }, prodRes] = await Promise.all([sb.from('categories').select('id, name').order('name'),
      id ? sb.from('products').select('*, product_images(*), option_types(*, option_values(*)), supplements(*, supplement_option_types(*))').eq('id', id).maybeSingle() : { data: null }]);
    return { cats, prod: prodRes.data };
  }, [id]);
  if (!data) return <Loading />;
  if (id && !data.prod) return <p className="empty">Produit introuvable.</p>;

  const { cats } = data;
  const p = data.prod ?? { is_active: true, price: 0, stock: 0, category_id: cat || null };
  const images = sortBy(p.product_images);
  const types = sortBy(p.option_types).map((t) => ({ ...t, values: sortBy(t.option_values, 'position') }));
  const sups = p.supplements ?? [];

  const saveProduct = async (f) => {
    const price = parseInt(f.get('price'), 10), stock = parseInt(f.get('stock'), 10);
    if (!Number.isInteger(price) || price < 0 || !Number.isInteger(stock) || stock < 0) throw new Error('Prix ou stock invalide.');
    const th = f.get('low_stock_threshold');
    const fields = { name: String(f.get('name')).trim(), description: String(f.get('description')).trim() || null, price, stock, category_id: f.get('category_id') || null,
      video_url: String(f.get('video_url')).trim() || null, low_stock_threshold: th === '' ? null : parseInt(th, 10), is_active: f.get('is_active') === 'on', is_popular: f.get('is_popular') === 'on' };
    let pid = id;
    if (id) { const { error } = await sb.from('products').update(fields).eq('id', id); if (error) throw error; }
    else { const { data: d, error } = await sb.from('products').insert({ ...fields, slug: slugify(fields.name) }).select('id').single(); if (error) throw error; pid = d.id; }
    let pos = images.length;
    for (const file of f.getAll('images').filter((x) => x && x.size)) {
      const url = await upload(file, `products/${pid}`);
      const { error } = await sb.from('product_images').insert({ product_id: pid, url, alt: fields.name, position: pos++ }); if (error) throw error;
    }
    note('Produit enregistré.');
    if (isNew) nav(`/admin/product/${pid}`); else reload();
  };
  const sub = (fn) => async (f, el) => { const r = await fn(f); if (r?.error) throw r.error; el.reset(); reload(); };

  return (
    <>
      <h1>{isNew ? 'Nouveau produit' : p.name}</h1>
      <Form key={version} className="float-card form-col" onSubmit={saveProduct}>
        <label>Nom<input name="name" defaultValue={p.name ?? ''} required /></label>
        <label>Description<textarea name="description" rows={5} defaultValue={p.description ?? ''} /></label>
        <div className="two">
          <label>Prix (FCFA)<input name="price" type="number" min="0" step="1" defaultValue={p.price} required /></label>
          <label>Stock<input name="stock" type="number" min="0" step="1" defaultValue={p.stock} required /></label>
        </div>
        <div className="two">
          <label>Catégorie<select name="category_id" defaultValue={p.category_id ?? ''}><option value="">Sans catégorie</option>{(cats ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
          <label>Seuil « Bientôt épuisé »<input name="low_stock_threshold" type="number" min="0" defaultValue={p.low_stock_threshold ?? ''} placeholder="Seuil global" /></label>
        </div>
        <label>Vidéo (lien, facultatif)<input name="video_url" type="url" defaultValue={p.video_url ?? ''} /></label>
        <label>Ajouter des photos<input name="images" type="file" accept="image/*" multiple /></label>
        <label className="check"><input name="is_active" type="checkbox" defaultChecked={!!p.is_active} /> Visible dans la boutique</label>
        <label className="check"><input name="is_popular" type="checkbox" defaultChecked={!!p.is_popular} /> Produit populaire</label>
        <button className="btn" type="submit">Enregistrer le produit</button>
      </Form>

      {isNew ? <p className="muted">Enregistre le produit pour ajouter ensuite variantes et suppléments.</p> : (
        <>
          <h2>Galerie</h2>
          <div className="grid grid--thumbs">
            {images.length ? images.map((im) => (
              <div className="float-card thumb" key={im.id}><Thumb u={im.url} /><div style={{ padding: 8, textAlign: 'center' }}><Del t="product_images" id={im.id} label="Retirer" onDone={reload} /></div></div>
            )) : <p className="muted">Aucune photo.</p>}
          </div>

          <h2>Variantes</h2>
          <p className="muted">Pour une couleur, associe une photo : elle s'affichera quand le client la choisit.</p>
          {types.map((t) => (
            <div className="float-card block" key={t.id}>
              <div className="head"><strong>{t.name} <small className="muted">({t.kind === 'color' ? 'couleurs' : t.kind === 'select' ? 'menu' : 'boutons'})</small></strong><Del t="option_types" id={t.id} label="Supprimer la variante" onDone={reload} /></div>
              <ul className="chips">
                {t.values.map((v) => {
                  const im = images.find((i) => i.id === v.image_id);
                  return (
                    <li className="chip" key={v.id}>
                      {v.color_hex ? <i className="dot" style={{ background: v.color_hex }} /> : null}
                      {im ? <span className="mini"><Thumb u={im.url} /></span> : null}{v.label} <Del t="option_values" id={v.id} label="×" onDone={reload} />
                    </li>
                  );
                })}
              </ul>
              <Form className="form-inline" reset onSubmit={sub(async (f) => {
                const c = String(f.get('color_hex') || '');
                return sb.from('option_values').insert({ option_type_id: f.get('type'), label: String(f.get('label')).trim(), color_hex: /^#[0-9a-f]{6}$/i.test(c) ? c : null, image_id: f.get('image_id') || null });
              })}>
                <input type="hidden" name="type" value={t.id} /><input name="label" placeholder={t.kind === 'color' ? 'Ex. Noir' : 'Ex. 42'} required />
                {t.kind === 'color' ? <>
                  <input name="color_hex" type="color" defaultValue="#000000" />
                  <select name="image_id"><option value="">Photo liée (aucune)</option>{images.map((im, i) => <option key={im.id} value={im.id}>Photo {i + 1}</option>)}</select>
                </> : null}
                <button className="btn btn--ghost" type="submit">Ajouter</button>
              </Form>
            </div>
          ))}
          <Form className="float-card form-inline block" onSubmit={sub((f) => sb.from('option_types').insert({ product_id: id, name: String(f.get('name')).trim(), kind: ['color', 'button', 'select'].includes(f.get('kind')) ? f.get('kind') : 'button' }))}>
            <input name="name" placeholder="Nouvelle variante (Couleur, Taille…)" required />
            <select name="kind" defaultValue="button"><option value="color">Couleurs</option><option value="button">Boutons</option><option value="select">Menu déroulant</option></select>
            <button className="btn" type="submit">Créer</button>
          </Form>

          <h2>Suppléments</h2>
          {sups.map((x) => (
            <div className="float-card block" key={x.id}>
              <div className="head">
                <div className="sup2"><span className="mini mini--lg"><Thumb u={x.image_url} /></span>
                  <div><strong>{x.name}</strong> <span className="price">{fcfa(x.price)}</span><div className="muted">{x.is_required ? 'Obligatoire' : 'Facultatif'}</div></div></div>
                <Del t="supplements" id={x.id} onDone={reload} />
              </div>
              <ul className="chips">
                {(x.supplement_option_types ?? []).map((o) => <li className="chip" key={o.id}>{o.name} : {(o.values ?? []).join(' / ')} <Del t="supplement_option_types" id={o.id} label="×" onDone={reload} /></li>)}
              </ul>
              <Form className="form-inline" reset onSubmit={sub(async (f) => {
                const values = String(f.get('values')).split(',').map((v) => v.trim()).filter(Boolean);
                if (!values.length) throw new Error('Indique au moins une valeur.');
                return sb.from('supplement_option_types').insert({ supplement_id: f.get('sup'), name: String(f.get('name')).trim(), values });
              })}>
                <input type="hidden" name="sup" value={x.id} /><input name="name" placeholder="Variante (Couleur, Marque…)" required /><input name="values" placeholder="Valeurs : Noir, Blanc" required />
                <button className="btn btn--ghost" type="submit">Ajouter</button>
              </Form>
            </div>
          ))}
          <Form className="float-card form-col block" onSubmit={sub(async (f) => {
            const price = parseInt(f.get('price'), 10); if (!Number.isInteger(price) || price < 0) throw new Error('Prix du supplément invalide.');
            return sb.from('supplements').insert({ product_id: id, name: String(f.get('name')).trim(), price, description: String(f.get('description')).trim() || null, image_url: await upload(f.get('image'), 'supplements'), is_required: f.get('is_required') === 'on' });
          })}>
            <div className="two"><label>Nom<input name="name" placeholder="Chaussettes" required /></label><label>Prix (FCFA)<input name="price" type="number" min="0" step="1" defaultValue="0" required /></label></div>
            <label>Description<input name="description" /></label><label>Image<input name="image" type="file" accept="image/*" /></label>
            <label className="check"><input name="is_required" type="checkbox" /> Supplément obligatoire</label>
            <button className="btn" type="submit">Ajouter le supplément</button>
          </Form>
          <p><Del t="products" id={id} label="Supprimer ce produit" onDone={() => nav('/admin/products')} /></p>
        </>
      )}
    </>
  );
}
