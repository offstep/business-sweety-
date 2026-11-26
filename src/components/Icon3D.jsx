import { ART, DEFS } from '../lib/icons3d.js';

// Dégradés partagés : à placer une seule fois dans la page (les icônes y font référence par id).
export function Icon3DDefs() {
  return (
    <svg aria-hidden="true" focusable="false" width="0" height="0"
      style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden' }}>
      <defs dangerouslySetInnerHTML={{ __html: DEFS }} />
    </svg>
  );
}

// Icône en relief. Les couleurs viennent du contexte (voir theme.css) : graphite, argent dans l'en-tête, aqua si actif.
export default function Icon3D({ n }) {
  if (!ART[n]) return null;
  return <svg className="i3" viewBox="0 0 48 48" width="30" height="30" aria-hidden="true" focusable="false" dangerouslySetInnerHTML={{ __html: ART[n] }} />;
}
