import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Danger feu de forêt par département, via l'API officielle Météo France
// "Météo des forêts" (portail-api.meteofrance.fr, produit
// DonneesPubliquesMeteoForets). Actif seulement en saison (juin à
// septembre) — hors saison, l'API ne renvoie aucune donnée.
// Même échelle que la vigilance météo classique (1=vert à 4=rouge).
const METEO_FORETS_URL =
  "https://public-api.meteofrance.fr/public/DPMeteoForets/v1/carte/departement/encours?format=json&departement=all&echeance=J1";
const CACHE_SECONDS = 900;

type MeteoForetRow = {
  dep_code: string;
  niveau_j1: string;
  dep_nom: string;
};

export async function GET() {
  const apiKey = process.env.METEOFRANCE_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ departments: [], error: "METEOFRANCE_API_KEY manquante" });
  }

  const res = await fetch(METEO_FORETS_URL, {
    headers: { apikey: apiKey },
    next: { revalidate: CACHE_SECONDS },
  });

  if (!res.ok) {
    // Hors saison (juin-septembre) l'API peut ne rien renvoyer : ce n'est
    // pas une erreur applicative, juste l'absence de données.
    return NextResponse.json({ departments: [], seasonal: true });
  }

  const rows: MeteoForetRow[] = await res.json();
  const colorByCode = new Map(rows.map((r) => [r.dep_code, parseInt(r.niveau_j1, 10)]));

  const supabase = await createClient();
  const { data: departementsData, error: dbError } = await supabase
    .from("departements")
    .select("code, name, contour");

  if (dbError) {
    return NextResponse.json({ departments: [], error: dbError.message }, { status: 500 });
  }

  const departments = (departementsData ?? [])
    .filter((d) => colorByCode.has(d.code))
    .map((d) => ({
      code: d.code,
      name: d.name,
      contour: d.contour,
      colorId: colorByCode.get(d.code)!,
    }));

  return NextResponse.json({ departments });
}
