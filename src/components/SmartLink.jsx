import { Link } from 'react-router-dom';
import { toRoute } from '../lib/helpers.js';

// Lien saisi en admin : externe → <a>, interne → <Link> (compatible HashRouter).
export default function SmartLink({ to, children, ...rest }) {
  const r = toRoute(to);
  if (!r) return null;
  return r.external ? <a href={r.href} {...rest}>{children}</a> : <Link to={r.href} {...rest}>{children}</Link>;
}
