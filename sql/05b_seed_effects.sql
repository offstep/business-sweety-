-- Exemples de sections avec effets (à exécuter après migration_5.sql).
-- Elles s'ajoutent à la fin de l'accueil : réorganise-les avec les flèches dans Admin > Accueil.
insert into home_sections (type, title, config, position, is_visible)
select 'marquee', null,
  jsonb_build_object('text', E'Livraison rapide\nPaiement sécurisé\nNouveautés chaque semaine\nCommande facile sur WhatsApp'),
  coalesce((select max(position) from home_sections), 0) + 1, true
where not exists (select 1 from home_sections where type = 'marquee');

insert into home_sections (type, title, config, position, is_visible)
select 'features', 'Pourquoi Sweety Business ?',
  jsonb_build_object('text', E'Livraison rapide | Reçois ta commande là où tu es\nPaiement sécurisé | Tes informations restent protégées\nUne vendeuse à l''écoute | Réponse directe sur WhatsApp'),
  coalesce((select max(position) from home_sections), 0) + 2, true
where not exists (select 1 from home_sections where type = 'features');

insert into home_sections (type, title, config, position, is_visible)
select 'countdown', 'Vente flash',
  jsonb_build_object('title', 'Offre limitée', 'subtitle', 'Profite de nos prix avant la fin du compte à rebours',
    'button_label', 'Découvrir', 'link_url', 'catalogue.html',
    'ends_at', to_char((now() + interval '7 days') at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')),
  coalesce((select max(position) from home_sections), 0) + 3, true
where not exists (select 1 from home_sections where type = 'countdown');

insert into home_sections (type, title, config, position, is_visible)
select 'spotlight', 'Coup de cœur',
  jsonb_build_object('product_id', (select id from products where is_active order by created_at desc limit 1)),
  coalesce((select max(position) from home_sections), 0) + 4, true
where not exists (select 1 from home_sections where type = 'spotlight')
  and exists (select 1 from products where is_active);
