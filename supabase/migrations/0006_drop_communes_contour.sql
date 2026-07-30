-- La colonne contour (GeoJSON) représentait 359 Mo (87% de la base) pour
-- un usage qu'on a abandonné (affichage de polygones de communes). La
-- carte affiche désormais le fond de carte cadastre officiel (tuiles
-- vectorielles servies par data.gouv.fr) plutôt que de stocker et
-- afficher nos propres contours — plus besoin de cette colonne.

alter table communes drop column if exists contour;
