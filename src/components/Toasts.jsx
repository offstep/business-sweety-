import { useEffect, useState } from 'react';
import { subscribe } from '../lib/toast';
import Lnk from './Lnk';

export default function Toasts() {
  const [list, setList] = useState([]);
  useEffect(() => subscribe(setList), []);
  return (
    <div className="toasts" aria-live="polite">
      {list.map((t) => (
        <div key={t.id} className={`toast-item toast--${t.type}${t.out ? ' out' : ''}`} role="status">
          <span className="toast-msg">{t.message}</span>
          {t.label ? (t.href
            ? <Lnk u={t.href} className="toast-act">{t.label}</Lnk>
            : <button type="button" className="toast-act" onClick={() => { try { t.onAction?.(); } finally { t.close(); } }}>{t.label}</button>) : null}
          <button type="button" className="toast-x" aria-label="Fermer" onClick={t.close}>×</button>
        </div>
      ))}
    </div>
  );
}
