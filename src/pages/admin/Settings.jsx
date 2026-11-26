import { useState } from 'react';
import Img from '../../components/Img.jsx';
import { sb } from '../../lib/supabase.js';
import { useAsync } from '../../hooks/useAsync.js';
import { isValidPhone, normalizePhone } from '../../lib/helpers.js';
import { uploadImage } from '../../lib/storage.js';

export default function Settings() {
  const [version, setVersion] = useState(0);
  const [msg, setMsg] = useState({ type: '', text: '' });
  const [busy, setBusy] = useState(false);
  const { data: s, error } = useAsync(async () => {
    const { data, error: e } = await sb.from('settings').select('*').eq('id', 1).maybeSingle();
    if (e) throw e;
    return data ?? {};
  }, [version], true);

  async function submit(e) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setMsg({ type: '', text: '' }); setBusy(true);
    try {
      const shop_name = String(fd.get('shop_name') || '').trim();
      const phone = normalizePhone(fd.get('whatsapp_number'));
      const threshold = Number.parseInt(fd.get('low_stock_threshold'), 10);
      if (!shop_name) throw new Error('Le nom de la boutique est obligatoire.');
      if (phone && !isValidPhone(phone)) throw new Error('Numéro WhatsApp invalide (avec l\'indicatif du pays, ex. 22507000000).');
      if (!Number.isInteger(threshold) || threshold < 0) throw new Error('Seuil de stock invalide.');
      const row = { id: 1, shop_name, whatsapp_number: phone, low_stock_threshold: threshold };
      const logo = await uploadImage(fd.get('logo'), 'branding');
      if (logo) row.logo_url = logo;
      const { error: err } = await sb.from('settings').upsert(row);
      if (err) throw err;
      setMsg({ type: 'ok', text: 'Réglages enregistrés. Recharge la boutique pour les voir.' });
      setVersion((v) => v + 1);
    } catch (x) {
      setMsg({ type: 'err', text: x.message || String(x) });
    } finally { setBusy(false); }
  }

  if (error) return <p className="msg msg--err">{error.message}</p>;
  if (!s) return <p className="empty">Chargement…</p>;
  return (
    <>
      <h1>Réglages de la boutique</h1>
      {msg.text && <p className={`msg msg--${msg.type}`}>{msg.text}</p>}
      <form className="float-card form-col" onSubmit={submit} key={version}>
        <label>Nom de la boutique<input name="shop_name" defaultValue={s.shop_name ?? 'Sweety Business'} required /></label>
        <label>Numéro WhatsApp (avec l'indicatif, chiffres uniquement)
          <input name="whatsapp_number" type="tel" inputMode="numeric" defaultValue={s.whatsapp_number ?? ''} placeholder="22507000000" />
        </label>
        <label>Seuil « Bientôt épuisé » (par défaut)
          <input name="low_stock_threshold" type="number" min="0" step="1" defaultValue={s.low_stock_threshold ?? 5} required />
        </label>
        <label>Logo
          {s.logo_url && <span style={{ width: 72 }}><Img src={s.logo_url} ratio="img-frame--square" alt="Logo actuel" /></span>}
          <input name="logo" type="file" accept="image/*" />
        </label>
        <button className="btn" type="submit" disabled={busy}>{busy ? 'Enregistrement…' : 'Enregistrer'}</button>
      </form>
    </>
  );
}
