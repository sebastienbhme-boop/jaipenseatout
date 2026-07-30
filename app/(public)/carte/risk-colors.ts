// Couleur et picto par type de risque (codes définis dans scripts/import-ppr.mjs
// et supabase/migrations/0001_init.sql, table risk_types).

export const RISK_STYLES: Record<string, { color: string; icon: string }> = {
  INONDATION: { color: "#2563eb", icon: "🌊" },
  MOUVEMENT_TERRAIN: { color: "#92400e", icon: "⛰️" },
  SEISME: { color: "#ea580c", icon: "🌋" },
  AVALANCHE: { color: "#0891b2", icon: "❄️" },
  VOLCAN: { color: "#dc2626", icon: "🌋" },
  FEU_FORET: { color: "#c2410c", icon: "🔥" },
  METEO: { color: "#7c3aed", icon: "⛈️" },
  RADON: { color: "#65a30d", icon: "☢️" },
  RISQUE_INDUSTRIEL: { color: "#b91c1c", icon: "🏭" },
  NUCLEAIRE: { color: "#facc15", icon: "☢️" },
  RUPTURE_BARRAGE: { color: "#0284c7", icon: "🚧" },
  TRANSPORT_MATIERES_DANGEREUSES: { color: "#d97706", icon: "🚚" },
  ENGINS_GUERRE: { color: "#57534e", icon: "💣" },
  RISQUE_MINIER: { color: "#78716c", icon: "⛏️" },
  INONDATION_MINIERE: { color: "#1d4ed8", icon: "🌊" },
  GAZ_MINE: { color: "#4d7c0f", icon: "💨" },
  TERRAINS_DEPOT: { color: "#a16207", icon: "⚠️" },
  AUTRE: { color: "#6b7280", icon: "⚠️" },
};

export const DEFAULT_RISK_STYLE = { color: "#6b7280", icon: "⚠️" };

export function getRiskStyle(code: string) {
  return RISK_STYLES[code] ?? DEFAULT_RISK_STYLE;
}
