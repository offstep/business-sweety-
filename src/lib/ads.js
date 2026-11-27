import { sb } from './supabase';

export async function liveAds(placements) {
  const { data } = await sb.from('ads').select('id, business_name, logo_url, title, description, image_url, cta_label, link_url, format, placement, starts_at, ends_at').eq('is_active', true);
  const now = Date.now();
  return (data ?? []).filter((x) => (!x.starts_at || new Date(x.starts_at) <= now) && (!x.ends_at || new Date(x.ends_at) >= now) && placements.includes(x.placement || 'accueil'));
}

// Statistiques : la base vérifie que la pub est active (fonction record_ad_event, migration 3).
export const trackAd = (id, type) => sb.rpc('record_ad_event', { p_ad: id, p_type: type }).then(() => {}, () => {});

// 1 impression par pub et par visite
export function trackImpression(id) {
  const k = `ad_seen_${id}`;
  try { if (sessionStorage.getItem(k)) return; sessionStorage.setItem(k, '1'); } catch {}
  trackAd(id, 'impression');
}
