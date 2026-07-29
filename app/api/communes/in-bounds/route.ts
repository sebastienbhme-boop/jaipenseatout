import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const MAX_COMMUNES = 300;

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
      contour: c.contour,
      risks: risksByCommune.get(c.insee_code) ?? [],
    })),
    truncated: (rawCommunes ?? []).length >= MAX_COMMUNES,
  });
}
