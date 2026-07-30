import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Renvoie toutes les communes d'un département avec leurs risques.
// Chargé une fois par département et mis en cache côté carte (voir
// risk-map.tsx) — évite le clignotement causé par une limite de
// résultats sur une zone géographique dense en communes.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const supabase = await createClient();

  const { data: rawCommunes, error } = await supabase
    .from("communes")
    .select("insee_code, name, lat, lng, contour_simplifie")
    .eq("departement_code", code)
    .not("lat", "is", null)
    .not("lng", "is", null);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const communes = (rawCommunes ?? []).map((c) => ({
    ...c,
    contour_simplifie:
      c.contour_simplifie && !(c.contour_simplifie as { unavailable?: boolean }).unavailable
        ? c.contour_simplifie
        : null,
  }));

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
      contour: c.contour_simplifie,
      risks: risksByCommune.get(c.insee_code) ?? [],
    })),
  });
}
