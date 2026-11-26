import { useFavs } from '../contexts/FavContext.jsx';

export default function FavButton({ id, name, inline = false }) {
  const { has, toggle } = useFavs();
  const on = has(id);
  return (
    <button type="button" className={`fav${inline ? ' fav--inline' : ''}`} aria-pressed={on}
      aria-label={on ? `Retirer ${name || 'ce produit'} des favoris` : `Ajouter ${name || 'ce produit'} aux favoris`}
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggle(id); }}>
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20.5S4 15.6 4 9.8A4.3 4.3 0 0 1 8.3 5.5c1.5 0 2.9.8 3.7 2 .8-1.2 2.2-2 3.7-2A4.3 4.3 0 0 1 20 9.8c0 5.8-8 10.7-8 10.7z" /></svg>
    </button>
  );
}
