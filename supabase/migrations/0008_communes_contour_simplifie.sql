-- Contour géographique simplifié par commune (Douglas-Peucker, ~30 points
-- par polygone, tolérance ~222m). Contrairement au contour brut
-- (~500 points, 359 Mo pour 32 500 communes — cf. migration 0006), cette
-- version pèse moins de 1 Mo par commune et permet d'afficher une zone
-- colorée par risque sur la carte sans dépasser notre quota Supabase.

alter table communes add column if not exists contour_simplifie jsonb;
