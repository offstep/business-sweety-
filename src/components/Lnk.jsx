import { Link } from 'react-router-dom';
import { resolveLink } from '../lib/utils';

// Lien saisi en administration : route interne (React Router) ou lien externe. Rien n'est affiché si le lien est invalide.
export default function Lnk({ u, children, ...p }) {
  const r = resolveLink(u);
  if (!r) return null;
  return r.external
    ? <a href={r.href} target="_blank" rel="noopener noreferrer" {...p}>{children}</a>
    : <Link to={r.to} {...p}>{children}</Link>;
}
