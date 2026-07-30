// Récupère le contour géographique de chaque commune depuis
// geo.api.gouv.fr, le simplifie (Douglas-Peucker, tolérance ~222m,
// ~30 points par commune au lieu de ~500) et le stocke dans
// communes.contour_simplifie. Poids total estimé : ~20-30 Mo pour les
// 32 500 communes, contre 359 Mo avec les contours bruts (abandonnés,
// cf. migration 0006).
//
// Usage : node scripts/import-contours-simplifies.mjs
// Reprend automatiquement là où il s'était arrêté (ignore les communes
// qui ont déjà un contour_simplifie en base).

import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";

config({ path: ".env.local" });

const BATCH_SIZE = 15;
const DELAY_MS = 400;
const MAX_RETRIES = 3;
const SIMPLIFY_TOLERANCE = 0.002; // ~222m, validé visuellement (30 points sur Coulans-sur-Gée)
const UNAVAILABLE_CONTOUR = { unavailable: true };

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Douglas-Peucker
function sqSegDist(p, p1, p2) {
  let [x, y] = p1;
  let dx = p2[0] - x;
  let dy = p2[1] - y;
  if (dx !== 0 || dy !== 0) {
    const t = ((p[0] - x) * dx + (p[1] - y) * dy) / (dx * dx + dy * dy);
    if (t > 1) {
      x = p2[0];
      y = p2[1];
    } else if (t > 0) {
      x += dx * t;
      y += dy * t;
    }
  }
  dx = p[0] - x;
  dy = p[1] - y;
  return dx * dx + dy * dy;
}

function simplifyRing(points, sqTolerance) {
  const len = points.length;
  if (len <= 4) return points;
  const markers = new Uint8Array(len);
  markers[0] = markers[len - 1] = 1;
  const stack = [[0, len - 1]];
  while (stack.length) {
    const [first, last] = stack.pop();
    let maxSqDist = 0;
    let index = -1;
    for (let i = first + 1; i < last; i++) {
      const d = sqSegDist(points[i], points[first], points[last]);
      if (d > maxSqDist) {
        index = i;
        maxSqDist = d;
      }
    }
    if (maxSqDist > sqTolerance) {
      markers[index] = 1;
      stack.push([first, index], [index, last]);
    }
  }
  const result = points.filter((_, i) => markers[i]);
  return result.length >= 4 ? result : points;
}

function simplifyGeometry(geometry) {
  const sqTolerance = SIMPLIFY_TOLERANCE * SIMPLIFY_TOLERANCE;
  if (geometry.type === "Polygon") {
    return {
      type: "Polygon",
      coordinates: geometry.coordinates.map((ring) => simplifyRing(ring, sqTolerance)),
    };
  }
  if (geometry.type === "MultiPolygon") {
    return {
      type: "MultiPolygon",
      coordinates: geometry.coordinates.map((polygon) =>
        polygon.map((ring) => simplifyRing(ring, sqTolerance))
      ),
    };
  }
  return geometry;
}

async function fetchContour(inseeCode) {
  let lastError = null;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await fetch(`https://geo.api.gouv.fr/communes/${inseeCode}?fields=contour`);
      if (res.status === 404) {
        return { error: "commune introuvable (404, fusionnée/obsolète)", permanent: true };
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
      return { contour: simplifyGeometry(data.contour) };
    } catch (e) {
      lastError = e.message;
      await sleep(500 * attempt);
    }
  }
  return { error: lastError ?? "échec inconnu" };
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont requis (.env.local)");
  }
  const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });

  const { count: remainingCount } = await supabase
    .from("communes")
    .select("*", { count: "exact", head: true })
    .is("contour_simplifie", null);

  console.log(`${remainingCount} communes sans contour simplifié à traiter.`);

  let processed = 0;
  let failed = 0;

  while (true) {
    const { data: communes, error } = await supabase
      .from("communes")
      .select("insee_code")
      .is("contour_simplifie", null)
      .limit(BATCH_SIZE);

    if (error) throw new Error(`Erreur lecture communes: ${error.message}`);
    if (!communes || communes.length === 0) break;

    const results = await Promise.all(
      communes.map(async (c) => {
        const result = await fetchContour(c.insee_code);
        return { insee_code: c.insee_code, ...result };
      })
    );

    for (const r of results) {
      const contourToStore = r.contour ?? UNAVAILABLE_CONTOUR;
      const { error: updateError } = await supabase
        .from("communes")
        .update({ contour_simplifie: contourToStore })
        .eq("insee_code", r.insee_code);
      if (updateError) {
        failed++;
      } else if (r.contour) {
        processed++;
      } else {
        failed++;
      }
    }

    process.stdout.write(`\rTraitées: ${processed} | Échecs: ${failed}`);
    await sleep(DELAY_MS);
  }

  console.log(`\nTerminé. ${processed} contours importés, ${failed} échecs.`);
}

main().catch((err) => {
  console.error("Échec de l'import:", err);
  process.exit(1);
});
