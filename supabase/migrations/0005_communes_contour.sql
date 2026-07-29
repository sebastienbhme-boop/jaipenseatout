-- Stocke le contour géographique (GeoJSON) de chaque commune en base,
-- pour afficher la carte des risques à l'échelle nationale sans dépendre
-- d'un appel à geo.api.gouv.fr à chaque chargement de page.

alter table communes add column if not exists contour jsonb;
