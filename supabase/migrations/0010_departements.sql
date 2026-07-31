-- Table de référence des départements français, avec leur contour
-- géographique simplifié — nécessaire pour colorier la carte de
-- vigilance météo par département. Contrairement aux communes (32 500,
-- abandonné pour raison d'espace disque, cf. migrations 0005/0006), les
-- départements ne sont que 101 : même avec un contour détaillé, le poids
-- total reste négligeable (quelques centaines de Ko).

create table if not exists departements (
  code text primary key,
  name text not null,
  contour jsonb not null
);

alter table departements enable row level security;

create policy "departements_public_read" on departements
  for select to anon, authenticated
  using (true);
