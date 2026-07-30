-- La route /api/communes/in-bounds filtre communes par lat/lng à chaque
-- déplacement de la carte, sans index dédié — ça finissait par scanner
-- toute la table et dépasser le timeout HTTP. Un index composite couvre
-- ce filtre.

create index if not exists idx_communes_lat_lng on communes (lat, lng);
