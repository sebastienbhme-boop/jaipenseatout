// Import des risques par commune depuis la base GASPAR (DDRM) de Géorisques.
// Source bulk : http://files.georisques.fr/GASPAR/gaspar.zip
// On utilise le fichier ddrm_risq_gaspar_*.csv : liste officielle des risques
// majeurs par commune (code INSEE natif, pas de jointure géographique requise).
//
// Usage : node scripts/import-ppr.mjs
// Nécessite SUPABASE_SERVICE_ROLE_KEY et NEXT_PUBLIC_SUPABASE_URL dans .env.local

import { createClient } from "@supabase/supabase-js";
import { parse } from "csv-parse/sync";
import unzipper from "unzipper";
import { readFileSync, existsSync, mkdirSync, writeFileSync } from "fs";
import { config } from "dotenv";

config({ path: ".env.local" });

const GASPAR_URL = "http://files.georisques.fr/GASPAR/gaspar.zip";
const CACHE_DIR = ".cache/gaspar";
const CACHE_ZIP = `${CACHE_DIR}/gaspar.zip`;

const RISK_TYPES = [
  { code: "INONDATION", gasparRoot: "11", label: "Inondation", icon_name: "flood" },
  { code: "MOUVEMENT_TERRAIN", gasparRoot: "12", label: "Mouvement de terrain", icon_name: "landslide" },
  { code: "SEISME", gasparRoot: "13", label: "Séisme", icon_name: "earthquake" },
  { code: "AVALANCHE", gasparRoot: "14", label: "Avalanche", icon_name: "avalanche" },
  { code: "VOLCAN", gasparRoot: "15", label: "Éruption volcanique", icon_name: "volcano" },
  { code: "FEU_FORET", gasparRoot: "16", label: "Feu de forêt", icon_name: "wildfire" },
  { code: "METEO", gasparRoot: "17", label: "Phénomène météorologique (tempête, grêle, neige, foudre)", icon_name: "storm" },
  { code: "RADON", gasparRoot: "18", label: "Radon", icon_name: "radon" },
  { code: "RISQUE_INDUSTRIEL", gasparRoot: "21", label: "Risque industriel", icon_name: "factory" },
  { code: "NUCLEAIRE", gasparRoot: "22", label: "Nucléaire", icon_name: "nuclear" },
  { code: "RUPTURE_BARRAGE", gasparRoot: "23", label: "Rupture de barrage", icon_name: "dam" },
  { code: "TRANSPORT_MATIERES_DANGEREUSES", gasparRoot: "24", label: "Transport de marchandises dangereuses", icon_name: "truck" },
  { code: "ENGINS_GUERRE", gasparRoot: "25", label: "Engins de guerre", icon_name: "warning" },
  { code: "RISQUE_MINIER", gasparRoot: "31", label: "Affaissement minier", icon_name: "mine" },
  { code: "INONDATION_MINIERE", gasparRoot: "32", label: "Inondations de terrains miniers", icon_name: "flood" },
  { code: "GAZ_MINE", gasparRoot: "33", label: "Émissions en surface de gaz de mine", icon_name: "gas" },
  { code: "TERRAINS_DEPOT", gasparRoot: "34", label: "Échauffement des terrains de dépôts", icon_name: "warning" },
  { code: "AUTRE", gasparRoot: "AUTRE", label: "Autre risque", icon_name: "warning" },
];

const ROOT_TO_CODE = new Map(RISK_TYPES.map((r) => [r.gasparRoot, r.code]));

// METEO concerne ~27% des communes françaises (8600+) sans être
// discriminant — les intempéries touchent tout le territoire. On garde
// le risque dans risk_types (visible sur /risques) mais on ne l'associe
// à aucune commune : un bandeau générique renvoie vers Météo France.
const EXCLUDED_FROM_COMMUNE_RISKS = new Set(["METEO"]);

function riskRootFromNum(numRisque) {
  const trimmed = numRisque.trim();
  return trimmed === "AUTRE" ? "AUTRE" : trimmed.slice(0, 2);
}

async function downloadGaspar() {
  if (existsSync(CACHE_ZIP)) {
    console.log("Utilisation du zip GASPAR en cache:", CACHE_ZIP);
    return;
  }
  console.log("Téléchargement de", GASPAR_URL, "…");
  mkdirSync(CACHE_DIR, { recursive: true });
  const res = await fetch(GASPAR_URL);
  if (!res.ok) {
    throw new Error(`Échec du téléchargement GASPAR: ${res.status}`);
  }
  const buffer = Buffer.from(await res.arrayBuffer());
  writeFileSync(CACHE_ZIP, buffer);
  console.log(`Téléchargé (${(buffer.length / 1024 / 1024).toFixed(1)} Mo)`);
}

async function extractDdrmCsv() {
  const directory = await unzipper.Open.file(CACHE_ZIP);
  const entry = directory.files.find((f) => f.path.startsWith("ddrm_risq_gaspar"));
  if (!entry) {
    throw new Error("Fichier ddrm_risq_gaspar introuvable dans le zip");
  }
  const content = await entry.buffer();
  return content.toString("utf-8");
}

function parseDdrmCsv(csvText) {
  const records = parse(csvText, {
    delimiter: ";",
    columns: true,
    skip_empty_lines: true,
    relax_column_count: true,
  });

  // Une commune peut avoir plusieurs lignes pour le même risque racine
  // (ex: plusieurs sous-types d'inondation) : on déduplique par (commune, racine).
  const seen = new Set();
  const rows = [];

  for (const record of records) {
    const inseeCode = record.cod_commune?.trim();
    const numRisque = record.num_risque?.trim();
    if (!inseeCode || !numRisque) continue;

    const root = riskRootFromNum(numRisque);
    const riskTypeCode = ROOT_TO_CODE.get(root);
    if (!riskTypeCode) continue;
    if (EXCLUDED_FROM_COMMUNE_RISKS.has(riskTypeCode)) continue;

    const key = `${inseeCode}|${riskTypeCode}`;
    if (seen.has(key)) continue;
    seen.add(key);

    rows.push({ insee_code: inseeCode, risk_type_code: riskTypeCode });
  }

  return rows;
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont requis (.env.local)");
  }
  const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });

  await downloadGaspar();
  const csvText = await extractDdrmCsv();
  console.log("CSV extrait, taille:", (csvText.length / 1024 / 1024).toFixed(1), "Mo");

  const rows = parseDdrmCsv(csvText);
  console.log(`${rows.length} lignes (commune, risque) uniques à importer`);

  console.log("Upsert des types de risques (risk_types)…");
  const { error: riskTypesError } = await supabase.from("risk_types").upsert(
    RISK_TYPES.map(({ code, label, icon_name }) => ({ code, label, icon_name })),
    { onConflict: "code" }
  );
  if (riskTypesError) {
    throw new Error(`Erreur upsert risk_types: ${riskTypesError.message}`);
  }

  console.log("Import des communes présentes dans le CSV (référentiel minimal)…");
  const uniqueCommunes = [...new Set(rows.map((r) => r.insee_code))];
  const communeBatchSize = 1000;
  for (let i = 0; i < uniqueCommunes.length; i += communeBatchSize) {
    const batch = uniqueCommunes.slice(i, i + communeBatchSize);
    const { error } = await supabase
      .from("communes")
      .upsert(
        batch.map((insee_code) => ({ insee_code, name: insee_code })),
        { onConflict: "insee_code", ignoreDuplicates: true }
      );
    if (error) {
      throw new Error(`Erreur upsert communes (batch ${i}): ${error.message}`);
    }
    process.stdout.write(`\rCommunes: ${Math.min(i + communeBatchSize, uniqueCommunes.length)}/${uniqueCommunes.length}`);
  }
  console.log();

  console.log("Suppression des anciennes données commune_risks (source=georisques_api)…");
  const { error: deleteError } = await supabase
    .from("commune_risks")
    .delete()
    .eq("source", "georisques_api");
  if (deleteError) {
    throw new Error(`Erreur suppression commune_risks: ${deleteError.message}`);
  }

  console.log("Import des risques (commune_risks)…");
  const riskBatchSize = 1000;
  for (let i = 0; i < rows.length; i += riskBatchSize) {
    const batch = rows.slice(i, i + riskBatchSize);
    const { error } = await supabase.from("commune_risks").insert(
      batch.map((r) => ({
        insee_code: r.insee_code,
        risk_type_code: r.risk_type_code,
        severity_level: 1,
        source: "georisques_api",
      }))
    );
    if (error) {
      throw new Error(`Erreur insert commune_risks (batch ${i}): ${error.message}`);
    }
    process.stdout.write(`\rRisques: ${Math.min(i + riskBatchSize, rows.length)}/${rows.length}`);
  }
  console.log("\nImport terminé.");
}

main().catch((err) => {
  console.error("Échec de l'import:", err);
  process.exit(1);
});
