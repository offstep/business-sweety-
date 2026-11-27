-- Sections publicité / produits / catégories (à exécuter après migration_6.sql).
-- 1) Bannière « Faire sa publicité » (visible tout de suite, sans aucune pub créée)
insert into home_sections (type, title, config, position, is_visible)
select 'ad_invite', null, '{}'::jsonb, coalesce((select max(position) from home_sections), 0) + 1, true
where not exists (select 1 from home_sections where type = 'ad_invite');

-- 2) Emplacement des publicités partenaires sur l'accueil
insert into home_sections (type, title, config, position, is_visible)
select 'partner_ads', 'Nos partenaires', '{}'::jsonb, coalesce((select max(position) from home_sections), 0) + 1, true
where not exists (select 1 from home_sections where type = 'partner_ads');

-- 3) Présentation plus soignée : catégories en tuiles, produits populaires et recommandations en carrousel
update home_sections set config = config || '{"style":"tiles"}'::jsonb
 where type = 'categories' and coalesce(config->>'style', '') in ('', 'chips');
update home_sections set config = config || '{"layout":"carousel"}'::jsonb
 where type in ('popular', 'recommendations') and coalesce(config->>'layout', '') = '';
