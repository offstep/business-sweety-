import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { safe } from '../lib/helpers.js';

// Galerie de la fiche produit : défilement tactile, compteur, miniatures, plein écran avec zoom.
export default function Gallery({ images, index, onChange, name }) {
  const track = useRef(null);
  const timer = useRef(0);
  const [cur, setCur] = useState(index);
  const [open, setOpen] = useState(false);
  const list = images.filter((i) => safe(i.url));

  // L'extérieur (choix d'une couleur, miniature) demande une photo : on y fait défiler la galerie.
  useEffect(() => {
    const t = track.current;
    if (t && t.clientWidth) t.scrollTo({ left: index * t.clientWidth, behavior: 'smooth' });
    setCur(index);
  }, [index]);

  const onScroll = () => {
    const t = track.current;
    if (!t || !t.clientWidth) return;
    const i = Math.round(t.scrollLeft / t.clientWidth);
    setCur(i);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => onChange(i), 120);
  };
  useEffect(() => () => clearTimeout(timer.current), []);

  if (!list.length) return <div className="pg"><div className="pg-s pg-empty" /></div>;
  return (
    <div className="pgw">
      <div className="pg">
        <div className="pg-track" ref={track} onScroll={onScroll}>
          {list.map((im, i) => (
            <figure key={im.id} className="pg-s" onClick={() => setOpen(true)}>
              <img src={im.url} alt={`${name} — photo ${i + 1}`} loading={i === 0 ? 'eager' : 'lazy'} decoding="async" />
            </figure>
          ))}
        </div>
        {list.length > 1 && <span className="pg-count">{cur + 1} / {list.length}</span>}
      </div>
      {list.length > 1 && (
        <div className="pg-thumbs">
          {list.map((im, i) => (
            <button key={im.id} className={`pg-t${i === cur ? ' on' : ''}`} aria-label={`Photo ${i + 1}`} onClick={() => onChange(i)}>
              <img src={im.url} alt="" loading="lazy" />
            </button>
          ))}
        </div>
      )}
      {open && <Lightbox list={list} start={cur} name={name} onClose={() => setOpen(false)} />}
    </div>
  );
}

function Lightbox({ list, start, name, onClose }) {
  const track = useRef(null);
  const [cur, setCur] = useState(start);
  const [zoom, setZoom] = useState(false);

  useLayoutEffect(() => { const t = track.current; if (t) t.scrollLeft = start * t.clientWidth; }, [start]);
  useEffect(() => {
    const key = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', key);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', key); document.body.style.overflow = prev; };
  }, [onClose]);

  const onScroll = () => {
    const t = track.current;
    if (t && t.clientWidth) setCur(Math.round(t.scrollLeft / t.clientWidth));
  };
  return (
    <div className="lb" role="dialog" aria-modal="true" aria-label={`Photos de ${name}`}>
      <div className={`lb-track${zoom ? ' zoomed' : ''}`} ref={track} onScroll={onScroll}>
        {list.map((im, i) => (
          <div key={im.id} className={`lb-s${zoom && i === cur ? ' zoomed' : ''}`} onClick={() => setZoom((z) => !z)}>
            <img src={im.url} alt={`${name} — photo ${i + 1}`} draggable="false" />
          </div>
        ))}
      </div>
      <button className="lb-x" aria-label="Fermer" onClick={onClose}>×</button>
      <span className="lb-n">{cur + 1} / {list.length}{zoom ? '' : ' · touche pour zoomer'}</span>
    </div>
  );
}
