-- Colonne département, dérivée du code INSEE, pour charger la carte
-- département par département (évite le clignotement causé par une
-- limite de résultats sur une zone géographique dense en communes).

alter table communes add column if not exists departement_code text;

update communes
set departement_code = case
  when insee_code like '97%' or insee_code like '98%' then substring(insee_code from 1 for 3)
  else substring(insee_code from 1 for 2)
end
where departement_code is null;

create index if not exists idx_communes_departement on communes (departement_code);
