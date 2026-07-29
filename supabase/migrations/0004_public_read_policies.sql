-- Supabase active RLS par défaut sur toute nouvelle table, même sans le
-- demander explicitement. Nos tables de référence (censées être publiques
-- en lecture selon supabase/migrations/0001_init.sql) étaient donc en
-- réalité bloquées pour tout le monde, y compris en lecture. On ajoute
-- ici les policies de lecture publique manquantes.

alter table communes enable row level security;
alter table risk_types enable row level security;
alter table commune_risks enable row level security;
alter table kit_categories enable row level security;
alter table reflex_cards enable row level security;

create policy "communes_public_read" on communes
  for select to anon, authenticated
  using (true);

create policy "risk_types_public_read" on risk_types
  for select to anon, authenticated
  using (true);

create policy "commune_risks_public_read" on commune_risks
  for select to anon, authenticated
  using (true);

create policy "kit_categories_public_read" on kit_categories
  for select to anon, authenticated
  using (true);

create policy "reflex_cards_public_read" on reflex_cards
  for select to anon, authenticated
  using (true);
