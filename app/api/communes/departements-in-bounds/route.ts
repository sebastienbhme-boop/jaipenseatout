import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Renvoie la liste des codes département présents dans la zone visible
// de la carte — la carte charge ensuite chaque département en entier
// (voir /api/communes/departement/[code]) et les met en cache.
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

  const { data, error } = await supabase
    .from("communes")
    .select("departement_code")
    .gte("lat", south)
    .lte("lat", north)
    .gte("lng", west)
    .lte("lng", east)
    .not("lat", "is", null)
    .not("lng", "is", null)
    .not("departement_code", "is", null);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const departements = [...new Set((data ?? []).map((c) => c.departement_code))];

  return NextResponse.json({ departements });
}
