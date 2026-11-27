-- Migration 5 : nouveaux types de sections d'accueil (avec effets).
do $$
declare c text;
begin
  for c in select conname from pg_constraint
           where conrelid = 'public.home_sections'::regclass and contype = 'c'
             and pg_get_constraintdef(oid) ilike '%type%'
  loop
    execute format('alter table public.home_sections drop constraint %I', c);
  end loop;
end $$;

alter table public.home_sections add constraint home_sections_type_check check (type in (
  'hero_banner','image_slider','carousel','categories','popular','new_arrivals','promotions',
  'recommendations','partner_ads','text_image','custom_banner',
  'marquee','countdown','features','collage','spotlight'));
