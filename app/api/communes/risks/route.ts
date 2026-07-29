import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Renvoie uniquement le centre de la commune, pour initialiser la position
// de la carte. Les risques et contours affichés sont chargés séparément
// via /api/communes/in-bounds selon la zone visible à l'écran.
export async function GET(request: NextRequest) {
  const inseeCode = request.nextUrl.searchParams.get("insee_code");
  if (!inseeCode) {
    return NextResponse.json({ error: "insee_code requis" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: commune } = await supabase
    .from("communes")
    .select("insee_code, lat, lng")
    .eq("insee_code", inseeCode)
    .single();

  if (!commune?.lat || !commune?.lng) {
    return NextResponse.json({ center: null });
  }

  return NextResponse.json({
    center: { insee_code: commune.insee_code, lat: commune.lat, lng: commune.lng },
  });
}
