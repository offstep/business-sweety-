import { useEffect, useRef, useState } from 'react';
import { sb } from '../lib/supabase';
import Img from './Img';
import Lnk from './Lnk';
import { resolveLink, safe } from '../lib/utils';

// Popup d'annonce géré depuis Admin > Popups : un seul à la fois, fermable, fréquence limitée.
const seen = (p) => {
  const k = `sb_popup_${p.id}`;
  try {
    if (p.frequency === 'session') return !!sessionStorage.getItem(k);
    const t = Number(localStorage.getItem(k) || 0);
    return p.frequency === 'once' ? !!t : Date.now() - t < 86400000;
  } catch { return false; }
};
const mark = (p) => { try { (p.frequency === 'session' ? sessionStorage : localStorage).setItem(`sb_popup_${p.id}`, String(Date.now())); } catch {} };

export default function Popups({ isHome }) {
  const [p, setP] = useState(null);
  useEffect(() => {
    let timer, alive = true;
    (async () => {
      const { data } = await sb.from('popups').select('*').eq('is_active', true).order('created_at', { ascending: false });
      const now = Date.now();
      const f = (data ?? []).find((x) => (!x.starts_at || new Date(x.starts_at) <= now) && (!x.ends_at || new Date(x.ends_at) >= now)
        && (x.pages === 'tous' || isHome) && !seen(x));
      if (f && alive) timer = setTimeout(() => { mark(f); setP(f); }, (f.delay_seconds ?? 3) * 1000);
    })();
    return () => { alive = false; clearTimeout(timer); };
  }, [isHome]);
  return p ? <PopupView p={p} onClose={() => setP(null)} /> : null;
}

function PopupView({ p, onClose }) {
  const [on, setOn] = useState(false);
  const back = useRef(null);
  const prev = useRef(document.activeElement);
  const closeRef = useRef();
  closeRef.current = () => { setOn(false); setTimeout(onClose, 250); prev.current?.focus?.(); };

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    const raf = requestAnimationFrame(() => setOn(true));
    back.current?.querySelector('.popup-x')?.focus();
    const onKey = (e) => {
      if (e.key === 'Escape') return closeRef.current();
      if (e.key !== 'Tab') return;
      const f = [...back.current.querySelectorAll('a[href],button')]; const a = f[0], z = f.at(-1);
      if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); }
      else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); }
    };
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = ''; cancelAnimationFrame(raf); };
  }, []);

  return (
    <div ref={back} className={`popup-back${on ? ' in' : ''}`}
      onClick={(e) => { if (e.target === back.current || e.target.closest('.popup-x,.popup-later,.btn')) closeRef.current(); }}>
      <div className="popup" role="dialog" aria-modal="true" aria-labelledby="pp-t">
        <button className="popup-x" type="button" aria-label="Fermer">×</button>
        {safe(p.image_url) ? <Img src={p.image_url} ratio="img-frame--wide" alt={p.title} /> : null}
        <div className="popup-body">
          <h2 id="pp-t">{p.title}</h2>
          {p.body ? <p>{p.body}</p> : null}
          {p.button_label && resolveLink(p.link_url) ? <Lnk u={p.link_url} className="btn">{p.button_label}</Lnk> : null}
          <button className="popup-later" type="button">Plus tard</button>
        </div>
      </div>
    </div>
  );
}
