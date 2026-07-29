-- La table communes est publique en lecture, mais RLS est activée par défaut
-- par Supabase sans policy d'écriture : impossible d'ajouter une nouvelle
-- commune, même connecté. On autorise l'insertion/mise à jour aux utilisateurs
-- authentifiés (l'onboarding upsert la commune choisie par le foyer).

create policy "communes_authenticated_insert" on communes
  for insert to authenticated
  with check (true);

create policy "communes_authenticated_update" on communes
  for update to authenticated
  using (true)
  with check (true);
