import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Vigilance météo France par département, via l'API officielle
// (portail-api.meteofrance.fr, produit DonneesPubliquesVigilance).
// L'abonnement gratuit est limité à 60 requêtes/minute — on met la
// réponse en cache 15 minutes (la vigilance ne change pas seconde par
// seconde) pour ne jamais s'en approcher, quel que soit le nombre de
// visiteurs du site.
const VIGILANCE_URL = "https://public-api.meteofrance.fr/public/DPVigilance/v1/cartevigilance/encours";
const CACHE_SECONDS = 900;

type Department = {
  domain_id: string;
  max_color_id: number;
};

export async function GET() {
  const apiKey = process.env.METEOFRANCE_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ departments: [], error: "METEOFRANCE_API_KEY manquante" });
  }

  const res = await fetch(VIGILANCE_URL, {
    headers: { apikey: apiKey },
    next: { revalidate: CACHE_SECONDS },
  });

  if (!res.ok) {
    return NextResponse.json({ departments: [], error: "Erreur API vigilance" }, { status: 502 });
  }

  const data = await res.json();
  const currentPeriod = data.product?.periods?.find((p: { echeance: string }) => p.echeance === "J");
  const domainIds: Department[] = currentPeriod?.timelaps?.domain_ids ?? [];

  // domain_id est soit le code département brut ("14", "2A"...), soit —
  // pour les départements côtiers — un doublon avec suffixe "10" portant
  // le bulletin vagues-submersion (ex: "3010" pour le département 30).
  // On ignore ce doublon "10" : le code département seul suffit, il est
  // toujours présent séparément avec le même niveau ou plus précis.
  const vigilanceByCode = new Map<string, number>();
  for (const d of domainIds) {
    if (d.domain_id === "FRA" || d.domain_id.endsWith("10")) continue;
    vigilanceByCode.set(d.domain_id.padStart(2, "0"), d.max_color_id);
  }

  const supabase = await createClient();
  const { data: departementsData, error: dbError } = await supabase
    .from("departements")
    .select("code, name, contour");

  if (dbError) {
    return NextResponse.json({ departments: [], error: dbError.message }, { status: 500 });
  }

  const departments = (departementsData ?? []).map((d) => ({
    code: d.code,
    name: d.name,
    contour: d.contour,
    colorId: vigilanceByCode.get(d.code) ?? 1,
  }));

  return NextResponse.json({
    departments,
    updatedAt: data.product?.update_time ?? null,
  });
}
