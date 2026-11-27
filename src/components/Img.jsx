import { safe } from '../lib/utils';

// Cadre d'image avec ratio (img-frame--square, --wide, --banner…) ; vide si l'URL n'est pas valide.
export default function Img({ src, ratio = '', alt = '', extra = '' }) {
  return (
    <div className={['img-frame', ratio, extra].filter(Boolean).join(' ')}>
      {safe(src) ? <img src={src} alt={alt || ''} loading="lazy" decoding="async" /> : null}
    </div>
  );
}
