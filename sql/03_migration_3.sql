-- Migration 3 : statistiques publicitaires depuis le site statique.
-- Le navigateur ne peut pas écrire dans ad_events : il appelle cette fonction, qui vérifie que la pub est active
-- et n'accepte que « impression » ou « click ».
create or replace function public.record_ad_event(p_ad uuid, p_type text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_type not in ('impression', 'click') then return; end if;
  insert into ad_events (ad_id, type)
  select id, p_type from ads
  where id = p_ad and is_active
    and (starts_at is null or starts_at <= now()) and (ends_at is null or ends_at >= now());
end $$;
revoke all on function public.record_ad_event(uuid, text) from public;
grant execute on function public.record_ad_event(uuid, text) to anon, authenticated;
