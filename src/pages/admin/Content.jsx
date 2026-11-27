import { Link, useParams } from 'react-router-dom';
import { sb } from '../../lib/supabase';
import { fcfa } from '../../lib/utils';
import { Badge, DateFields, Del, Form, Loading, Thumb, Toggle, iso, period, upload, useAdmin, useLoad } from './common';

const SECTIONS = { hero_banner: 'Bannière principale', image_slider: "Slider d'images", carousel: 'Carrousel tactile', categories: 'Catégories', popular: 'Produits populaires', new_arrivals: 'Nouveautés', promotions: 'Promotions', recommendations: 'Recommandations', partner_ads: 'Publicités partenaires', text_image: 'Texte et image', custom_banner: 'Bannière personnalisée', marquee: 'Bandeau défilant', countdown: 'Vente flash (compte à rebours)', features: 'Atouts de la boutique', collage: "Collage d'images flottantes", spotlight: 'Produit à la une', ad_invite: 'Invitation à faire sa publicité' };

// ---------- Accueil (sections) ----------
export function Home() {
  const { fail } = useAdmin();
  const { data, reload } = useLoad(async () => (await sb.from('home_sections').select('*').order('position')).data ?? []);
  if (!data) return <Loading />;
  const list = data;

  const move = async (i, d) => {
    const a = list[i], b = list[i + d]; if (!b) return;
    const r = await Promise.all([sb.from('home_sections').update({ position: b.position }).eq('id', a.id), sb.from('home_sections').update({ position: a.position }).eq('id', b.id)]);
    const bad = r.find((x) => x.error); if (bad) return fail(bad.error);
    reload();
  };
  const toggleVisible = async (s) => { const { error } = await sb.from('home_sections').update({ is_visible: !s.is_visible }).eq('id', s.id); if (error) fail(error); else reload(); };

  return (
    <>
      <h1>Page d'accueil</h1><p className="muted">Ajoute, masque, déplace ou modifie les sections.</p>
      {list.length ? list.map((s, i) => (
        <div className="float-card block head" key={s.id}>
          <div><strong>{SECTIONS[s.type] || s.type}</strong> <span className="muted">{s.title || ''}</span>{s.is_visible ? '' : <> <span className="stock stock--low">masquée</span></>}</div>
          <div className="inline-actions">
            <button className="btn btn--ghost sm" disabled={i === 0} onClick={() => move(i, -1)} aria-label="Monter">↑</button>
            <button className="btn btn--ghost sm" disabled={i === list.length - 1} onClick={() => move(i, 1)} aria-label="Descendre">↓</button>
            <button className="btn btn--ghost sm" onClick={() => toggleVisible(s)}>{s.is_visible ? 'Masquer' : 'Afficher'}</button>
            <Link className="btn btn--ghost sm" to={`/admin/section/${s.id}`}>Modifier</Link>
            <Del t="home_sections" id={s.id} onDone={reload} />
          </div>
        </div>
      )) : <p className="muted">Aucune section.</p>}
      <h2>Ajouter une section</h2>
      <Form className="float-card form-inline block" reset onSubmit={async (f) => {
        const { error } = await sb.from('home_sections').insert({ type: f.get('type'), title: String(f.get('title')).trim() || null, config: {}, position: (list.at(-1)?.position ?? 0) + 1, is_visible: true });
        if (error) throw error; reload();
      }}>
        <select name="type">{Object.entries(SECTIONS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
        <input name="title" placeholder="Titre (facultatif)" /><button className="btn" type="submit">Ajouter</button>
      </Form>
    </>
  );
}

const HINT = { marquee: 'Une phrase par ligne : elles défilent en boucle.', features: 'Un atout par ligne, au format : Titre | Description' };
const loc = (v) => { if (!v) return ''; const d = new Date(v); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 16); };

export function SectionEdit() {
  const { id } = useParams();
  const { note } = useAdmin();
  const { data, version, reload } = useLoad(async () => {
    const { data: s } = await sb.from('home_sections').select('*').eq('id', id).maybeSingle();
    const { data: prods } = s?.type === 'spotlight' ? await sb.from('products').select('id, name').order('name') : { data: [] };
    return { s, prods };
  }, [id]);
  if (!data) return <Loading />;
  const { s, prods } = data;
  if (!s) return <p className="empty">Section introuvable.</p>;
  const c = { ...(s.config ?? {}) }; c.images = c.images ?? [];
  const sliders = ['image_slider', 'carousel', 'collage'].includes(s.type);

  const save = async (f) => {
    const out = { ...c, title: String(f.get('title')).trim(), subtitle: String(f.get('subtitle')).trim(), text: String(f.get('text')).trim(), button_label: String(f.get('button_label')).trim(), link_url: String(f.get('link_url')).trim(), style: f.get('style'), layout: f.get('layout') };
    if (s.type === 'countdown') out.ends_at = f.get('ends_at') ? new Date(f.get('ends_at')).toISOString() : '';
    if (s.type === 'partner_ads') out.ad_format = f.get('ad_format') || '';
    if (s.type === 'spotlight') out.product_id = f.get('product_id') || '';
    const main = f.get('image'); if (main?.size) out.image_url = await upload(main, 'home');
    if (sliders) {
      out.images = c.images.map((im, i) => ({ ...im, link: String(f.get(`imglink${i}`) || '').trim() })).filter((_, i) => f.get(`imgdel${i}`) !== 'on');
      for (const file of f.getAll('images').filter((x) => x?.size)) out.images.push({ url: await upload(file, 'home'), link: '' });
    }
    const { error } = await sb.from('home_sections').update({ title: String(f.get('stitle')).trim() || null, config: out }).eq('id', id);
    if (error) throw error; note('Section enregistrée.'); reload();
  };

  return (
    <>
      <p><Link className="link" to="/admin/home">← Retour</Link></p><h1>{SECTIONS[s.type] || s.type}</h1>
      <Form key={version} className="float-card form-col" onSubmit={save}>
        <label>Titre de la section<input name="stitle" defaultValue={s.title ?? ''} /></label>
        <label>Titre affiché (bannière, bloc)<input name="title" defaultValue={c.title ?? ''} /></label>
        <label>Sous-titre<input name="subtitle" defaultValue={c.subtitle ?? ''} /></label>
        <label>Texte{HINT[s.type] ? <> <small className="muted">{HINT[s.type]}</small></> : null}<textarea name="text" rows={HINT[s.type] ? 6 : 3} defaultValue={c.text ?? ''} /></label>
        {s.type === 'countdown' ? <label>Fin de l'offre (le compte à rebours s'arrête et la section disparaît)<input name="ends_at" type="datetime-local" defaultValue={loc(c.ends_at)} /></label> : null}
        {s.type === 'partner_ads' ? (
          <label>Format de publicité à afficher
            <select name="ad_format" defaultValue={c.ad_format ?? ''}><option value="">Tous les formats</option>
              {[['hero_banner', 'Bannière principale'], ['home_block', 'Bloc promotionnel'], ['small_panel', 'Petit panneau'], ['carousel', 'Carrousel']].map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></label>
        ) : null}
        {s.type === 'spotlight' ? (
          <label>Produit à mettre en avant
            <select name="product_id" defaultValue={c.product_id ?? ''}><option value="">Choisir</option>{(prods ?? []).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
        ) : null}
        <div className="two">
          <label>Texte du bouton<input name="button_label" defaultValue={c.button_label ?? ''} /></label>
          <label>Lien du bouton<input name="link_url" defaultValue={c.link_url ?? ''} placeholder="catalogue" /></label>
        </div>
        <div className="two">
          <label>Catégories : style<select name="style" defaultValue={c.style ?? ''}><option value="">Rond avec image</option><option value="chips">Pastilles</option><option value="tiles">Tuiles avec image</option></select></label>
          <label>Produits : disposition<select name="layout" defaultValue={c.layout ?? ''}><option value="">Grille</option><option value="large">Grandes cartes</option><option value="carousel">Carrousel</option></select></label>
        </div>
        {['hero_banner', 'custom_banner', 'text_image'].includes(s.type) ? <>
          <label>Image {c.image_url ? '(une image est définie)' : ''}<input name="image" type="file" accept="image/*" /></label>
          {c.image_url ? <Thumb u={c.image_url} c="img-frame--wide" /> : null}
        </> : null}
        {sliders ? <>
          <h2>Images</h2>
          {c.images.map((im, i) => (
            <div className="float-card block" key={i}><Thumb u={im.url} c="img-frame--wide" />
              <label>Lien<input name={`imglink${i}`} defaultValue={im.link ?? ''} /></label>
              <label className="check"><input type="checkbox" name={`imgdel${i}`} /> Retirer cette image</label></div>
          ))}
          <label>Ajouter des images<input name="images" type="file" accept="image/*" multiple /></label>
        </> : null}
        <button className="btn" type="submit">Enregistrer</button>
      </Form>
    </>
  );
}

// ---------- Notifications ----------
const KINDS = { info: 'Information', promo: 'Promotion', nouveau: 'Nouveauté', livraison: 'Livraison' };
export function Notifications() {
  const { note } = useAdmin();
  const { data, reload } = useLoad(async () => (await sb.from('notifications').select('*').order('created_at', { ascending: false })).data ?? []);
  if (!data) return <Loading />;
  return (
    <>
      <h1>Notifications</h1><p className="muted">Messages visibles par tous les clients dans la cloche.</p>
      <Form className="float-card form-col" reset onSubmit={async (f) => {
        const { error } = await sb.from('notifications').insert({ kind: f.get('kind'), title: String(f.get('title')).trim(), body: String(f.get('body')).trim() || null, link_url: String(f.get('link_url')).trim() || null });
        if (error) throw error; note('Publiée.'); reload();
      }}>
        <label>Type (icône et couleur)<select name="kind" defaultValue="info">{Object.entries(KINDS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></label>
        <label>Titre<input name="title" required maxLength={120} /></label>
        <label>Message<textarea name="body" rows={3} maxLength={500} /></label>
        <label>Lien (facultatif, ex. catalogue)<input name="link_url" /></label>
        <button className="btn" type="submit">Publier</button>
      </Form>
      <h2>Publiées</h2>
      {data.length ? data.map((n) => (
        <div className="float-card block head" key={n.id}><div><strong>{n.title}</strong> <small className="muted">· {KINDS[n.kind] || n.kind}</small><div className="muted">{n.body}</div></div><Del t="notifications" id={n.id} onDone={reload} /></div>
      )) : <p className="muted">Aucune notification.</p>}
    </>
  );
}

// ---------- Popups ----------
const FQ = { session: 'Une fois par visite', daily: 'Une fois par jour', once: 'Une seule fois par visiteur' };
export function Popups() {
  const { note } = useAdmin();
  const { data, reload } = useLoad(async () => (await sb.from('popups').select('*').order('created_at', { ascending: false })).data ?? []);
  if (!data) return <Loading />;
  return (
    <>
      <h1>Popups</h1><p className="muted">Une fenêtre d'annonce qui s'ouvre sur la boutique. Un seul popup à la fois, jamais pendant le panier ni la commande, toujours fermable.</p>
      {data.length ? data.map((p) => (
        <div className="float-card block head" key={p.id}>
          <div className="sup2"><span className="mini mini--lg"><Thumb u={p.image_url} /></span>
            <div><strong>{p.title}</strong> <Badge on={p.is_active} />
              <div className="muted">{FQ[p.frequency]} · {p.pages === 'tous' ? 'Accueil, catalogue, fiches produit' : "Page d'accueil"} · après {p.delay_seconds} s{period(p)}</div></div></div>
          <div className="inline-actions"><Toggle t="popups" id={p.id} on={p.is_active} onDone={reload} /><Del t="popups" id={p.id} onDone={reload} /></div>
        </div>
      )) : <p className="muted">Aucun popup.</p>}
      <h2>Nouveau popup</h2>
      <Form className="float-card form-col" reset onSubmit={async (f) => {
        const delay = parseInt(f.get('delay_seconds'), 10);
        const { error } = await sb.from('popups').insert({ title: String(f.get('title')).trim(), body: String(f.get('body')).trim() || null, image_url: await upload(f.get('image'), 'popups'),
          button_label: String(f.get('button_label')).trim() || null, link_url: String(f.get('link_url')).trim() || null, delay_seconds: Number.isInteger(delay) ? Math.min(60, Math.max(0, delay)) : 3,
          frequency: f.get('frequency'), pages: f.get('pages'), starts_at: iso(f.get('starts_at')), ends_at: iso(f.get('ends_at')), is_active: true });
        if (error) throw error; note('Popup créé.'); reload();
      }}>
        <label>Titre<input name="title" required maxLength={80} /></label>
        <label>Message<textarea name="body" rows={3} maxLength={300} /></label>
        <label>Image (facultatif)<input name="image" type="file" accept="image/*" /></label>
        <div className="two"><label>Texte du bouton<input name="button_label" placeholder="Voir les offres" /></label><label>Lien du bouton<input name="link_url" placeholder="catalogue" /></label></div>
        <div className="two">
          <label>S'ouvre après (secondes)<input name="delay_seconds" type="number" min="0" max="60" defaultValue="3" /></label>
          <label>Fréquence<select name="frequency" defaultValue="daily">{Object.entries(FQ).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></label>
        </div>
        <label>Où l'afficher<select name="pages"><option value="accueil">Page d'accueil seulement</option><option value="tous">Accueil, catalogue et fiches produit</option></select></label>
        <DateFields /><button className="btn" type="submit">Créer le popup</button>
      </Form>
    </>
  );
}

// ---------- Publicités partenaires ----------
const FL = { hero_banner: 'Bannière principale', small_panel: 'Petit panneau', carousel: 'Carrousel publicitaire', home_block: "Bloc promotionnel d'accueil" };
export function Ads() {
  const { note } = useAdmin();
  const { data, reload } = useLoad(async () => {
    const [{ data: list }, { data: ev }] = await Promise.all([sb.from('ads').select('*').order('business_name'), sb.from('ad_events').select('ad_id, type').limit(50000)]);
    const stats = {}; (ev ?? []).forEach((x) => { const s = (stats[x.ad_id] ??= { impression: 0, click: 0 }); s[x.type]++; });
    return { list: list ?? [], stats };
  });
  if (!data) return <Loading />;
  return (
    <>
      <h1>Publicités partenaires</h1>
      {data.list.length ? data.list.map((a) => {
        const s = data.stats[a.id] ?? { impression: 0, click: 0 };
        const ctr = s.impression ? ((s.click / s.impression) * 100).toFixed(1) : '0.0';
        return (
          <div className="float-card block head" key={a.id}>
            <div className="sup2"><span className="mini mini--lg"><Thumb u={a.image_url} /></span>
              <div><strong>{a.business_name}</strong> <Badge on={a.is_active} /><div>{a.title}</div>
                <div className="muted">{FL[a.format]} · {a.placement}{period(a)}</div><div className="muted">{s.impression} impressions · {s.click} clics · {ctr} %</div></div></div>
            <div className="inline-actions"><Toggle t="ads" id={a.id} on={a.is_active} onDone={reload} /><Del t="ads" id={a.id} onDone={reload} /></div>
          </div>
        );
      }) : <p className="muted">Aucune publicité.</p>}
      <h2>Nouvelle publicité</h2>
      <Form className="float-card form-col" reset onSubmit={async (f) => {
        const { error } = await sb.from('ads').insert({ business_name: String(f.get('business_name')).trim(), title: String(f.get('title')).trim(), description: String(f.get('description')).trim() || null,
          image_url: await upload(f.get('image'), 'ads'), logo_url: await upload(f.get('logo'), 'ads'), cta_label: String(f.get('cta_label')).trim() || null, link_url: String(f.get('link_url')).trim() || null,
          format: f.get('format'), placement: String(f.get('placement')).trim() || 'accueil', starts_at: iso(f.get('starts_at')), ends_at: iso(f.get('ends_at')), is_active: true });
        if (error) throw error; note('Publicité créée.'); reload();
      }}>
        <label>Nom du commerce<input name="business_name" required /></label>
        <label>Titre<input name="title" required /></label>
        <label>Description<textarea name="description" rows={3} /></label>
        <div className="two"><label>Image publicitaire<input name="image" type="file" accept="image/*" /></label><label>Logo<input name="logo" type="file" accept="image/*" /></label></div>
        <div className="two"><label>Texte du bouton<input name="cta_label" placeholder="Réserver" /></label><label>Lien de destination<input name="link_url" type="url" placeholder="https://" /></label></div>
        <div className="two">
          <label>Format<select name="format">{Object.entries(FL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></label>
          <label>Emplacement<select name="placement"><option value="accueil">Page d'accueil</option><option value="produit">Fiches produit</option><option value="catalogue">Catalogue</option></select></label>
        </div>
        <DateFields /><button className="btn" type="submit">Créer la publicité</button>
      </Form>
      <p className="muted">Les publicités dont la date de fin est dépassée ne s'affichent plus automatiquement sur la boutique.</p>
    </>
  );
}

// ---------- Paramètres ----------
export function Settings() {
  const { note } = useAdmin();
  const { data: s, version, reload } = useLoad(async () => (await sb.from('settings').select('*').eq('id', 1).maybeSingle()).data ?? {});
  if (!s) return <Loading />;
  return (
    <>
      <h1>Paramètres</h1>
      <Form key={version} className="float-card form-col" onSubmit={async (f) => {
        const phone = String(f.get('whatsapp_number')).replace(/\D/g, '');
        const logo = await upload(f.get('logo'), 'logo');
        const { error } = await sb.from('settings').update({ shop_name: String(f.get('shop_name')).trim(), whatsapp_number: phone || null, low_stock_threshold: parseInt(f.get('low_stock_threshold'), 10) || 0, ...(logo ? { logo_url: logo } : {}) }).eq('id', 1);
        if (error) throw error; note('Paramètres enregistrés.'); reload();
      }}>
        <label>Nom de la boutique<input name="shop_name" defaultValue={s.shop_name || 'Sweety Business'} required /></label>
        <label>Numéro WhatsApp (format international, sans +)<input name="whatsapp_number" inputMode="numeric" defaultValue={s.whatsapp_number ?? ''} placeholder="2250700000000" /></label>
        <label>Seuil global « Bientôt épuisé »<input name="low_stock_threshold" type="number" min="0" defaultValue={s.low_stock_threshold ?? 5} /></label>
        <label>Logo<input name="logo" type="file" accept="image/*" /></label>{s.logo_url ? <Thumb u={s.logo_url} /> : null}
        <button className="btn" type="submit">Enregistrer</button>
      </Form>
    </>
  );
}
