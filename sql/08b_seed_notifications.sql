-- Premières notifications (à exécuter après migration_8.sql). Modifiables ou supprimables dans Admin > Notifications.
insert into notifications (kind, title, body, link_url)
select * from (values
  ('nouveau',  'Bienvenue chez Sweety Business', 'Découvre nos produits et choisis tes préférés : ils t''attendent dans le catalogue.', 'catalogue.html'),
  ('promo',    'Les promotions s''appliquent toutes seules', 'Ajoute tes articles au panier : si une offre est disponible, elle se déclenche automatiquement.', 'catalogue.html'),
  ('info',     'Une question ? Écris-nous', 'Sur chaque fiche produit, un bouton te met en contact direct avec la vendeuse sur WhatsApp.', 'catalogue.html')
) as v(kind, title, body, link_url)
where not exists (select 1 from notifications);
