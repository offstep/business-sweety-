import { useEffect } from 'react';

// Apparition douce des blocs qui entrent à l'écran (seulement ceux situés sous la ligne de flottaison).
export function useReveal() {
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) return undefined;
    const io = new IntersectionObserver((entries) => entries.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
    }), { rootMargin: '0px 0px -8% 0px' });
    const seen = new WeakSet();
    const scan = () => document.querySelectorAll('main .float-section, main .hero, main .pill-banner').forEach((el) => {
      if (seen.has(el)) return;
      seen.add(el);
      if (el.getBoundingClientRect().top < window.innerHeight) return; // déjà visible : on ne cache rien
      el.classList.add('rv'); io.observe(el);
    });
    scan();
    const mo = new MutationObserver(scan);
    mo.observe(document.body, { childList: true, subtree: true });
    return () => { io.disconnect(); mo.disconnect(); };
  }, []);
}
