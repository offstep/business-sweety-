// Application installable : service worker, mises à jour, invitation à installer, état hors ligne.
import { toast } from './toast';

export const isStandalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
export const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream;
let deferred = null;
export const canInstall = () => !!deferred;
export async function install() {
  if (!deferred) return false;
  deferred.prompt();
  const { outcome } = await deferred.userChoice;
  deferred = null;
  return outcome === 'accepted';
}

// Invitation discrète : à partir de la 2e visite, une fois tous les 14 jours
function suggest() {
  if (isStandalone) return;
  try {
    if (!sessionStorage.getItem('sb_visit')) { sessionStorage.setItem('sb_visit', '1'); localStorage.setItem('sb_visits', String(Number(localStorage.getItem('sb_visits') || 0) + 1)); }
    if (Number(localStorage.getItem('sb_visits')) < 2) return;
    if (Date.now() - Number(localStorage.getItem('sb_install_seen') || 0) < 14 * 86400000) return;
    if (/panier|checkout|confirmation|admin/.test(location.hash)) return;
    if (deferred) { localStorage.setItem('sb_install_seen', String(Date.now())); toast("Installe l'application sur ton écran d'accueil.", { label: 'Installer', duration: 10000, onAction: install }); }
    else if (isIOS) { localStorage.setItem('sb_install_seen', String(Date.now())); toast("Pour installer : touche Partager puis « Sur l'écran d'accueil ».", { duration: 12000 }); }
  } catch {}
}

let started = false;
export function initPwa() {
  if (started) return; started = true;
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferred = e; window.dispatchEvent(new Event('sb-installable')); setTimeout(suggest, 4000); });
  window.addEventListener('appinstalled', () => { deferred = null; toast('Application installée.', { type: 'success' }); });
  if (isIOS) setTimeout(suggest, 4000);

  window.addEventListener('offline', () => toast('Tu es hors ligne : certaines fonctions sont indisponibles.', { duration: 6000 }));
  window.addEventListener('online', () => toast('De retour en ligne.', { type: 'success' }));

  // Service worker + mise à jour proposée à l'utilisateur
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
    const hadController = !!navigator.serviceWorker.controller;
    const go = async () => {
      try {
        const reg = await navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`);
        const ask = (w) => toast('Nouvelle version disponible.', { label: 'Mettre à jour', duration: 0, onAction: () => w.postMessage('SKIP_WAITING') });
        if (reg.waiting && navigator.serviceWorker.controller) ask(reg.waiting);
        reg.addEventListener('updatefound', () => {
          const w = reg.installing;
          w?.addEventListener('statechange', () => { if (w.state === 'installed' && navigator.serviceWorker.controller) ask(w); });
        });
      } catch {}
    };
    if (document.readyState === 'complete') go(); else window.addEventListener('load', go);
    let reloaded = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => { if (hadController && !reloaded) { reloaded = true; location.reload(); } });
  }
}
