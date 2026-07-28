-- J'ai Pensé à Tout — schéma initial
-- 12 tables : communes, households, profiles, profile_attributes, risk_types,
-- commune_risks, profile_risks, retreat_points, kit_categories, kit_items,
-- reflex_cards, generated_pdfs

create extension if not exists postgis;

create type horizon_level as enum ('COURT', 'MOYEN', 'LONG');

-- ============================================================
-- Tables de référence publiques
-- ============================================================

create table communes (
  insee_code text primary key,
  name text not null,
  lat double precision,
  lng double precision,
  georisques_data jsonb,
  data_refreshed_at timestamptz
);

create table risk_types (
  code text primary key,
  label text not null,
  icon_name text,
  default_content text
);

create table kit_categories (
  code text primary key,
  label text not null,
  display_order int not null default 0
);

create table reflex_cards (
  id uuid primary key default gen_random_uuid(),
  risk_type_code text not null references risk_types(code),
  title text not null,
  content_markdown text not null,
  source_ref text,
  display_order int not null default 0,
  offline_available boolean not null default true,
  updated_at timestamptz not null default now()
);

create table commune_risks (
  id uuid primary key default gen_random_uuid(),
  insee_code text not null references communes(insee_code),
  risk_type_code text not null references risk_types(code),
  severity_level int not null check (severity_level between 1 and 5),
  source text not null check (source in ('georisques_api', 'manual')),
  last_updated timestamptz not null default now()
);

-- ============================================================
-- Tables foyer (RLS)
-- ============================================================

create table households (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  insee_code text references communes(insee_code),
  created_at timestamptz not null default now()
);

create table profiles (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  full_name text not null,
  birth_date date,
  blood_type text,
  is_primary boolean not null default false,
  created_at timestamptz not null default now()
);

create table profile_attributes (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  attribute_type text not null,
  value text not null,
  severity text check (severity in ('légère', 'sévère', 'critique'))
);

create table profile_risks (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  risk_type_code text not null references risk_types(code),
  acknowledged boolean not null default false,
  created_at timestamptz not null default now()
);

create table retreat_points (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  household_id uuid not null references households(id) on delete cascade,
  label text not null,
  address text not null,
  lat double precision,
  lng double precision,
  horizon_level horizon_level not null,
  contact_name text,
  contact_phone text,
  created_at timestamptz not null default now()
);

create table kit_items (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  household_id uuid not null references households(id) on delete cascade,
  category_code text not null references kit_categories(code),
  name text not null,
  quantity_target int not null default 1,
  quantity_current int not null default 0,
  expiry_date date,
  amazon_asin text,
  weight_grams int,
  last_checked timestamptz
);

create table generated_pdfs (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  household_id uuid not null references households(id) on delete cascade,
  storage_path text not null,
  version_hash text not null,
  generated_at timestamptz not null default now()
);

-- ============================================================
-- Index utiles
-- ============================================================

create index idx_profiles_household on profiles(household_id);
create index idx_profile_attributes_profile on profile_attributes(profile_id);
create index idx_profile_risks_profile on profile_risks(profile_id);
create index idx_retreat_points_household on retreat_points(household_id);
create index idx_kit_items_household on kit_items(household_id);
create index idx_generated_pdfs_household on generated_pdfs(household_id);
create index idx_commune_risks_insee on commune_risks(insee_code);

-- ============================================================
-- RLS
-- ============================================================

alter table households enable row level security;
alter table profiles enable row level security;
alter table profile_attributes enable row level security;
alter table profile_risks enable row level security;
alter table retreat_points enable row level security;
alter table kit_items enable row level security;
alter table generated_pdfs enable row level security;

-- households : accès direct via owner_user_id
create policy "households_owner_all" on households
  for all using (owner_user_id = auth.uid())
  with check (owner_user_id = auth.uid());

-- profiles : via household_id -> households.owner_user_id
create policy "profiles_owner_all" on profiles
  for all using (
    exists (
      select 1 from households h
      where h.id = profiles.household_id and h.owner_user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from households h
      where h.id = profiles.household_id and h.owner_user_id = auth.uid()
    )
  );

-- profile_attributes : via profile_id -> household_id (dénormalisé au niveau profile)
create policy "profile_attributes_owner_all" on profile_attributes
  for all using (
    exists (
      select 1 from profiles p
      join households h on h.id = p.household_id
      where p.id = profile_attributes.profile_id and h.owner_user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from profiles p
      join households h on h.id = p.household_id
      where p.id = profile_attributes.profile_id and h.owner_user_id = auth.uid()
    )
  );

-- profile_risks : idem
create policy "profile_risks_owner_all" on profile_risks
  for all using (
    exists (
      select 1 from profiles p
      join households h on h.id = p.household_id
      where p.id = profile_risks.profile_id and h.owner_user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from profiles p
      join households h on h.id = p.household_id
      where p.id = profile_risks.profile_id and h.owner_user_id = auth.uid()
    )
  );

-- retreat_points : household_id direct (dénormalisé)
create policy "retreat_points_owner_all" on retreat_points
  for all using (
    exists (
      select 1 from households h
      where h.id = retreat_points.household_id and h.owner_user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from households h
      where h.id = retreat_points.household_id and h.owner_user_id = auth.uid()
    )
  );

-- kit_items : household_id direct (dénormalisé)
create policy "kit_items_owner_all" on kit_items
  for all using (
    exists (
      select 1 from households h
      where h.id = kit_items.household_id and h.owner_user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from households h
      where h.id = kit_items.household_id and h.owner_user_id = auth.uid()
    )
  );

-- generated_pdfs : household_id direct (dénormalisé)
create policy "generated_pdfs_owner_all" on generated_pdfs
  for all using (
    exists (
      select 1 from households h
      where h.id = generated_pdfs.household_id and h.owner_user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from households h
      where h.id = generated_pdfs.household_id and h.owner_user_id = auth.uid()
    )
  );

-- Tables publiques (communes, commune_risks, risk_types, kit_categories, reflex_cards)
-- restent sans RLS activée : lecture publique via la clé anon, écriture réservée au service_role.
