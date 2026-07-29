// Récupère le contour géographique (GeoJSON), le nom et les coordonnées
// de chaque commune française depuis geo.api.gouv.fr et les stocke en base
// (colonnes communes.contour/name/lat/lng), une fois pour toutes, pour ne
// plus avoir à appeler cette API à chaque chargement de la carte des risques.
//
// Usage : node scripts/import-contours.mjs
// Reprend automatiquement là où il s'était arrêté. Les communes en échec
// définitif (ex: fusionnées/disparues du référentiel actuel) sont marquées
// avec un contour sentinelle {"unavailable":true} pour ne pas être
// retentées indéfiniment à chaque exécution.

import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";

config({ path: ".env.local" });

const BATCH_SIZE = 10;
const DELAY_MS = 500;
const MAX_RETRIES = 3;
const UNAVAILABLE_CONTOUR = { unavailable: true };

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchCommuneDetails(inseeCode) {
  let lastError = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await fetch(
        `https://geo.api.gouv.fr/communes/${inseeCode}?fields=nom,centre,contour`
      );
      if (res.status === 404) {
        return { error: "commune introuvable (404, probablement fusionnée/obsolète)", permanent: true };
      }
      if (!res.ok) {
        lastError = `HTTP ${res.status}`;
        await sleep(500 * attempt);
        continue;
      }
      const data = await res.json();
      if (!data.contour) {
        return { error: "pas de contour dans la réponse", permanent: true };
      }
      return {
        details: {
          name: data.nom,
          lat: data.centre?.coordinates?.[1] ?? null,
          lng: data.centre?.coordinates?.[0] ?? null,
          contour: data.contour,
        },
      };
    } catch (e) {
      lastError = e.message;
      await sleep(500 * attempt);
    }
  }
  return { error: lastError ?? "échec inconnu", permanent: false };
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont requis (.env.local)");
  }
  const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });

  const { count: totalCount } = await supabase
    .from("communes")
    .select("*", { count: "exact", head: true });

  const { count: remainingCount } = await supabase
    .from("communes")
    .select("*", { count: "exact", head: true })
    .is("contour", null);

  console.log(`${totalCount} communes au total, ${remainingCount} sans contour à traiter.`);

  let processed = 0;
  let failed = 0;
  let consecutiveEmptyOrStuck = 0;
  const failedCodes = [];

  while (true) {
    const { data: communes, error } = await supabase
      .from("communes")
      .select("insee_code")
      .is("contour", null)
      .limit(BATCH_SIZE);

    if (error) {
      throw new Error(`Erreur lecture communes: ${error.message}`);
    }
    if (!communes || communes.length === 0) {
      break;
    }

    const results = await Promise.all(
      communes.map(async (c) => {
        const result = await fetchCommuneDetails(c.insee_code);
        return { insee_code: c.insee_code, ...result };
      })
    );

    let progressedThisBatch = false;

    for (const r of results) {
      if (!r.details) {
        failed++;
        failedCodes.push(`${r.insee_code} (${r.error})`);
        // Marque la commune comme "traitée en échec" pour ne pas la
        // retenter indéfiniment : sans ça, is("contour", null) la
        // renvoie à chaque boucle et le script ne progresse jamais.
        const { error: markError } = await supabase
          .from("communes")
          .update({ contour: UNAVAILABLE_CONTOUR })
          .eq("insee_code", r.insee_code);
        if (!markError) progressedThisBatch = true;
        continue;
      }
      const { error: updateError } = await supabase
        .from("communes")
        .update({
          name: r.details.name,
          lat: r.details.lat,
          lng: r.details.lng,
          contour: r.details.contour,
        })
        .eq("insee_code", r.insee_code);
      if (updateError) {
        failed++;
        failedCodes.push(`${r.insee_code} (upsert: ${updateError.message})`);
      } else {
        processed++;
        progressedThisBatch = true;
      }
    }

    if (!progressedThisBatch) {
      consecutiveEmptyOrStuck++;
      if (consecutiveEmptyOrStuck >= 5) {
        console.log("\nAucune progression sur 5 lots consécutifs, arrêt de sécurité.");
        break;
      }
    } else {
      consecutiveEmptyOrStuck = 0;
    }

    process.stdout.write(`\rTraitées: ${processed} | Échecs: ${failed}`);
    await sleep(DELAY_MS);
  }

  console.log(`\nTerminé. ${processed} contours importés, ${failed} échecs.`);
  if (failedCodes.length > 0) {
    console.log("Détail des échecs (premiers 20):");
    console.log(failedCodes.slice(0, 20).join("\n"));
  }
}

main().catch((err) => {
  console.error("Échec de l'import:", err);
  process.exit(1);
});
