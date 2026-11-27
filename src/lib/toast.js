// Petites notifications discrètes (toasts), utilisables partout : toast('Message', { type, label, href, onAction, duration }).
let seq = 0, items = [];
const subs = new Set();
const emit = () => subs.forEach((f) => f(items));

export function toast(message, { type = 'info', label = '', href = '', onAction = null, duration = 4500 } = {}) {
  const t = { id: ++seq, message, type, label, href, onAction, out: false };
  const close = () => {
    if (!items.some((x) => x.id === t.id && !x.out)) return;
    items = items.map((x) => (x.id === t.id ? { ...x, out: true } : x)); emit();
    setTimeout(() => { items = items.filter((x) => x.id !== t.id); emit(); }, 250);
  };
  t.close = close;
  items = [...items.slice(-2), t]; // jamais plus de 3 à la fois
  emit();
  if (duration) setTimeout(close, duration);
  return close;
}
export function subscribe(f) { subs.add(f); f(items); return () => subs.delete(f); }
