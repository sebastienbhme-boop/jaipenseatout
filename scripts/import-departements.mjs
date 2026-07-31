// Importe les 101 départements français (contour simplifié, ~168 points
// chacun, tolérance ~555m) depuis le référentiel communautaire
// gregoiredavid/france-geojson, pour permettre de colorier la carte de
// vigilance météo par département.
//
// Usage : node scripts/import-departements.mjs

import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";

config({ path: ".env.local" });

const SOURCE_URL = "https://france-geojson.gregoiredavid.fr/repo/departements.geojson";
const SIMPLIFY_TOLERANCE = 0.005; // ~555m, validé visuellement sur la Sarthe (308 -> 168 points)

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

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont requis (.env.local)");
  }
  const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });

  console.log("Téléchargement du GeoJSON des départements…");
  const res = await fetch(SOURCE_URL);
  if (!res.ok) {
    throw new Error(`Échec du téléchargement: ${res.status}`);
  }
  const data = await res.json();
  console.log(`${data.features.length} départements trouvés.`);

  const rows = data.features.map((f) => ({
    code: f.properties.code,
    name: f.properties.nom,
    contour: simplifyGeometry(f.geometry),
  }));

  console.log("Import en base…");
  const { error } = await supabase.from("departements").upsert(rows, { onConflict: "code" });
  if (error) {
    throw new Error(`Erreur upsert departements: ${error.message}`);
  }

  console.log(`Terminé. ${rows.length} départements importés.`);
}

main().catch((err) => {
  console.error("Échec de l'import:", err);
  process.exit(1);
});
