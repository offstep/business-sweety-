import { useEffect } from 'react';

// Effet « lac » d'OFFSTEP : les cartes visibles flottent doucement (12 au maximum, seulement transform).
export function useLake() {
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    const MAX = 12;
    const live = new Set();
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting && live.size < MAX) { live.add(e.target); e.target.classList.add('fl', 'in-view'); }
        else if (!e.isIntersecting) { live.delete(e.target); e.target.classList.remove('in-view'); }
      });
    }, { rootMargin: '80px' });
    const seen = new WeakSet();
    const scan = () => document.querySelectorAll('.pcard-wrap, .catlink').forEach((el, i) => {
      if (seen.has(el)) return;
      seen.add(el); el.style.setProperty('--i', i % 9); io.observe(el);
    });
    scan();
    const mo = new MutationObserver(scan);
    mo.observe(document.body, { childList: true, subtree: true });
    const onVis = () => document.documentElement.classList.toggle('paused', document.hidden);
    document.addEventListener('visibilitychange', onVis);
    return () => { io.disconnect(); mo.disconnect(); document.removeEventListener('visibilitychange', onVis); };
  }, []);
}
