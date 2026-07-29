-- spatial_ref_sys est une table système créée par l'extension PostGIS
-- (systèmes de coordonnées de référence, aucune donnée applicative).
-- Supabase Advisor la signale car exposée par PostgREST sans RLS.
-- On active RLS avec une lecture publique, cohérent avec nos autres
-- tables de référence (communes, risk_types…).

alter table public.spatial_ref_sys enable row level security;

create policy "spatial_ref_sys_public_read" on public.spatial_ref_sys
  for select to anon, authenticated
  using (true);
