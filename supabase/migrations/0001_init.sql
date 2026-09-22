-- Le direct de l'atelier : prototype "photos toutes les 2 s".
-- Tout l'accès passe par les routes serveur (clé service_role) : RLS activé, aucune policy.

create table public.sessions (
  id               uuid primary key default gen_random_uuid(),
  slug             text not null unique,            -- clé du lien public, non devinable
  order_name       text not null,
  client_name      text not null,
  status           text not null default 'pending'
                   check (status in ('pending', 'live', 'paused', 'ended')),
  created_at       timestamptz not null default now(),
  started_at       timestamptz,
  ended_at         timestamptz,
  last_frame_path  text,
  last_frame_at    timestamptz,
  last_archived_at timestamptz,
  archived_count   integer not null default 0
);

-- Une ligne par ouverture du lien. viewer_id est un identifiant aléatoire gardé
-- dans le navigateur, pour distinguer le client de ceux à qui il a partagé le lien.
create table public.views (
  id           uuid primary key default gen_random_uuid(),
  session_id   uuid not null references public.sessions(id) on delete cascade,
  viewer_id    text not null,
  mode         text not null check (mode in ('pending', 'live', 'paused', 'ended')),
  started_at   timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  seconds      integer not null default 0          -- secondes onglet visible
);
create index views_session_idx on public.views (session_id, started_at);

create table public.shares (
  id         uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  viewer_id  text not null,
  method     text not null,                        -- 'share' | 'copy'
  created_at timestamptz not null default now()
);
create index shares_session_idx on public.shares (session_id);

alter table public.sessions enable row level security;
alter table public.views    enable row level security;
alter table public.shares   enable row level security;

-- Bucket privé pour les images. Chemins : {session_id}/latest.jpg et {session_id}/a/{ms}.jpg
insert into storage.buckets (id, name, public)
values ('frames', 'frames', false)
on conflict (id) do nothing;
