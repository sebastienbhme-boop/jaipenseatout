import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const MAX_COMMUNES = 300;
const COORD_PRECISION = 3; // ~111m de précision, largement suffisant pour une carte informative à l'échelle communale

type Point = [number, number];

function isPoint(value: unknown): value is Point {
  return Array.isArray(value) && value.length === 2 && typeof value[0] === "number" && typeof value[1] === "number";
}

function round(n: number) {
  return Math.round(n * 10 ** COORD_PRECISION) / 10 ** COORD_PRECISION;
}

// Réduit la taille du payload GeoJSON en arrondissant les coordonnées
// (geo.api.gouv.fr renvoie ~6 décimales, précision centimétrique inutile ici)
// et en supprimant les points consécutifs devenus identiques après arrondi.
function simplifyRing(ring: unknown): unknown {
  if (!Array.isArray(ring)) return ring;
  if (isPoint(ring[0])) {
    const points = ring as Point[];
    const result: Point[] = [];
    for (const [lng, lat] of points) {
      const rounded: Point = [round(lng), round(lat)];
      const last = result[result.length - 1];
      if (!last || last[0] !== rounded[0] || last[1] !== rounded[1]) {
        result.push(rounded);
      }
    }
    // Un polygone fermé doit garder au moins 4 points (dernier = premier).
    if (result.length >= 4) return result;
    return points.map(([lng, lat]) => [round(lng), round(lat)]);
  }
  return ring.map(simplifyRing);
}

function simplifyContour(contour: unknown) {
  if (!contour || typeof contour !== "object") return contour;
  const c = contour as { type: string; coordinates: unknown };
  return { type: c.type, coordinates: simplifyRing(c.coordinates) };
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const north = parseFloat(params.get("north") ?? "");
  const south = parseFloat(params.get("south") ?? "");
  const east = parseFloat(params.get("east") ?? "");
  const west = parseFloat(params.get("west") ?? "");

  if ([north, south, east, west].some(Number.isNaN)) {
    return NextResponse.json({ error: "Bounding box requise (north, south, east, west)" }, { status: 400 });
  }

  const supabase = await createClient();

  const { data: rawCommunes, error } = await supabase
    .from("communes")
    .select("insee_code, name, lat, lng, contour")
    .gte("lat", south)
    .lte("lat", north)
    .gte("lng", west)
    .lte("lng", east)
    .not("contour", "is", null)
    .limit(MAX_COMMUNES);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Les communes en échec définitif d'import (fusionnées/disparues) sont
  // marquées avec un contour sentinelle {"unavailable":true} — on les exclut.
  const communes = (rawCommunes ?? []).filter(
    (c) => c.contour && !(c.contour as { unavailable?: boolean }).unavailable
  );

  const inseeCodes = communes.map((c) => c.insee_code);

  const { data: risksData } = await supabase
    .from("commune_risks")
    .select("insee_code, risk_type_code, risk_types(label, icon_name)")
    .in("insee_code", inseeCodes);

  const risksByCommune = new Map<string, { code: string; label: string }[]>();
  for (const row of risksData ?? []) {
    const riskType = Array.isArray(row.risk_types) ? row.risk_types[0] : row.risk_types;
    const entry = { code: row.risk_type_code, label: riskType?.label ?? row.risk_type_code };
    const list = risksByCommune.get(row.insee_code) ?? [];
    list.push(entry);
    risksByCommune.set(row.insee_code, list);
  }

  return NextResponse.json({
    communes: communes.map((c) => ({
      insee_code: c.insee_code,
      name: c.name,
      lat: c.lat,
      lng: c.lng,
      contour: simplifyContour(c.contour),
      risks: risksByCommune.get(c.insee_code) ?? [],
    })),
    truncated: (rawCommunes ?? []).length >= MAX_COMMUNES,
  });
}
