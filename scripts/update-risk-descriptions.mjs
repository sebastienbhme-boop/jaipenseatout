// Renseigne le champ risk_types.default_content : une description courte
// et neutre de chaque risque, affichée sur la page "Comprendre les risques".
// Usage : node scripts/update-risk-descriptions.mjs

import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";

config({ path: ".env.local" });

const DESCRIPTIONS = {
  INONDATION:
    "Montée des eaux d'un cours d'eau, ruissellement ou submersion marine, pouvant isoler des habitations ou les endommager.",
  MOUVEMENT_TERRAIN:
    "Glissement, effondrement ou éboulement de terrain pouvant endommager des bâtiments et des voies de circulation.",
  SEISME:
    "Secousse du sol due à une activité tectonique, pouvant endommager des constructions selon son intensité.",
  AVALANCHE:
    "Masse de neige qui se détache d'une pente en montagne, menaçant les zones habitées ou fréquentées en contrebas.",
  VOLCAN:
    "Éruption volcanique pouvant projeter cendres, gaz ou coulées, avec un impact sur la respiration et les habitations proches.",
  FEU_FORET:
    "Incendie qui se propage dans une zone boisée, pouvant menacer des habitations proches et nécessiter une évacuation.",
  METEO:
    "Tempête, grêle, neige ou verglas, foudre : phénomènes météorologiques pouvant couper l'électricité ou bloquer les déplacements.",
  RADON:
    "Gaz radioactif naturel qui peut s'accumuler dans les habitations mal ventilées, avec un risque pour la santé à long terme.",
  RISQUE_INDUSTRIEL:
    "Accident sur un site industriel (incendie, explosion, fuite toxique) pouvant affecter les environs.",
  NUCLEAIRE:
    "Incident sur une installation nucléaire pouvant nécessiter une mise à l'abri ou une évacuation des zones proches.",
  RUPTURE_BARRAGE:
    "Rupture d'un barrage entraînant une vague de submersion soudaine en aval, sur un périmètre parfois large.",
  TRANSPORT_MATIERES_DANGEREUSES:
    "Accident impliquant un véhicule transportant des matières dangereuses (chimiques, inflammables), sur route, rail ou canalisation.",
  ENGINS_GUERRE:
    "Découverte de munitions ou engins explosifs non explosés, hérités des conflits passés, nécessitant un périmètre de sécurité.",
  RISQUE_MINIER:
    "Affaissement du sol lié à d'anciennes exploitations minières souterraines, pouvant endommager les constructions en surface.",
  INONDATION_MINIERE:
    "Remontée d'eau dans d'anciens terrains miniers, pouvant provoquer des inondations ou déstabiliser le sol.",
  GAZ_MINE:
    "Émanation de gaz (grisou, CO2...) depuis d'anciennes galeries minières, pouvant s'accumuler dans des espaces clos.",
  TERRAINS_DEPOT:
    "Échauffement ou combustion lente de terrains de dépôt (déchets, mines), pouvant dégager des fumées toxiques.",
  AUTRE:
    "Autre risque local identifié par les autorités, non classé dans les catégories ci-dessus.",
};

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont requis (.env.local)");
  }
  const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });

  for (const [code, default_content] of Object.entries(DESCRIPTIONS)) {
    const { error } = await supabase.from("risk_types").update({ default_content }).eq("code", code);
    if (error) {
      console.error(`Erreur pour ${code}: ${error.message}`);
    } else {
      console.log(`OK: ${code}`);
    }
  }
}

main();
