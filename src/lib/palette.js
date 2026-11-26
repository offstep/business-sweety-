import { PALETTE } from '../config.js';

const KEY = 'sb_palette';
const KNOWN = ['aqua', 'royal', 'orchidee', 'rose'];

// Applique la palette : ?palette=nom dans l'adresse (aperçu mémorisé), sinon celle de src/config.js.
export function applyPalette() {
  let p = PALETTE;
  try {
    const q = new URLSearchParams(window.location.search).get('palette');
    if (q === 'reset') localStorage.removeItem(KEY);
    else if (KNOWN.includes(q)) localStorage.setItem(KEY, q);
    const saved = localStorage.getItem(KEY);
    if (KNOWN.includes(saved)) p = saved;
  } catch { /* stockage indisponible */ }
  const root = document.documentElement;
  if (p && p !== 'aqua') root.dataset.palette = p; else delete root.dataset.palette;
  const meta = document.querySelector('meta[name="theme-color"]');
  const dark = getComputedStyle(root).getPropertyValue('--dark').trim();
  if (meta && dark) meta.setAttribute('content', dark);
}
