-- Popup de bienvenue (facultatif, modifiable ou supprimable dans Admin > Popups).
insert into popups (title, body, button_label, link_url, delay_seconds, frequency, pages)
select 'Bienvenue sur Sweety Business', 'Découvre nos nouveautés et profite de nos promotions.', 'Voir le catalogue', 'catalogue.html', 3, 'daily', 'accueil'
where not exists (select 1 from popups);
