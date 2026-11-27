-- Migration 7 : popups gérés depuis l'administration.
create table if not exists public.popups (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text,
  image_url text,
  button_label text,
  link_url text,
  delay_seconds int not null default 3 check (delay_seconds between 0 and 60),
  frequency text not null default 'session' check (frequency in ('session', 'daily', 'once')),
  pages text not null default 'accueil' check (pages in ('accueil', 'tous')),
  starts_at timestamptz,
  ends_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.popups enable row level security;
drop policy if exists "public read" on public.popups;
create policy "public read" on public.popups for select using (is_active);
drop policy if exists "admin all" on public.popups;
create policy "admin all" on public.popups for all using (public.is_admin()) with check (public.is_admin());
