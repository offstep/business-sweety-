import { safe } from '../lib/helpers.js';

// Cadre d'image à proportions fixes : l'image remplit toujours son cadre sans déformation.
export default function Img({ src, ratio = '', alt = '', extra = '', eager = false }) {
  return (
    <div className={`img-frame ${ratio} ${extra}`.trim()}>
      {safe(src) ? <img src={src} alt={alt} loading={eager ? 'eager' : 'lazy'} decoding="async" /> : null}
    </div>
  );
}
