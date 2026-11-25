import Section from '../components/HomeSections.jsx';
import { sb } from '../lib/supabase.js';
import { useShop } from '../contexts/ShopContext.jsx';
import { useAsync, must } from '../hooks/useAsync.js';

export default function Home() {
  const { settings } = useShop();
  const { data, error, loading } = useAsync(() => must(sb.from('home_sections').select('*').eq('is_visible', true).order('position')), []);
  if (loading) return <p className="empty">Chargement…</p>;
  if (error) return <p className="empty">Impossible de charger la boutique.<br /><small>{error.message}</small></p>;
  if (!data?.length) return <p className="empty">Aucune section n'est encore configurée.</p>;
  return <>{data.map((x) => <Section key={x.id} x={x} s={settings} />)}</>;
}
