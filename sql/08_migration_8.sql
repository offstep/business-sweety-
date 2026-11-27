-- Migration 8 : type de notification (icône et couleur dans le centre de notifications).
alter table public.notifications add column if not exists kind text not null default 'info';
alter table public.notifications drop constraint if exists notifications_kind_check;
alter table public.notifications add constraint notifications_kind_check check (kind in ('info', 'promo', 'nouveau', 'livraison'));
