// Couleur, picto et libellé par type de risque (codes définis dans
// scripts/import-ppr.mjs et supabase/migrations/0001_init.sql, table
// risk_types). Dupliqué ici côté client pour afficher la légende
// immédiatement, sans attendre le premier chargement de données.

export const RISK_STYLES: Record<string, { color: string; icon: string; label: string }> = {
  INONDATION: { color: "#2563eb", icon: "🌊", label: "Inondation" },
  MOUVEMENT_TERRAIN: { color: "#92400e", icon: "⛰️", label: "Mouvement de terrain" },
  SEISME: { color: "#ea580c", icon: "🌋", label: "Séisme" },
  AVALANCHE: { color: "#0891b2", icon: "❄️", label: "Avalanche" },
  VOLCAN: { color: "#dc2626", icon: "🌋", label: "Éruption volcanique" },
  FEU_FORET: { color: "#c2410c", icon: "🔥", label: "Feu de forêt" },
  METEO: { color: "#7c3aed", icon: "⛈️", label: "Phénomène météorologique" },
  RADON: { color: "#65a30d", icon: "☢️", label: "Radon" },
  RISQUE_INDUSTRIEL: { color: "#b91c1c", icon: "🏭", label: "Risque industriel" },
  NUCLEAIRE: { color: "#facc15", icon: "☢️", label: "Nucléaire" },
  RUPTURE_BARRAGE: { color: "#0284c7", icon: "🚧", label: "Rupture de barrage" },
  TRANSPORT_MATIERES_DANGEREUSES: { color: "#d97706", icon: "🚚", label: "Transport de marchandises dangereuses" },
  ENGINS_GUERRE: { color: "#57534e", icon: "💣", label: "Engins de guerre" },
  RISQUE_MINIER: { color: "#78716c", icon: "⛏️", label: "Affaissement minier" },
  INONDATION_MINIERE: { color: "#1d4ed8", icon: "🌊", label: "Inondation minière" },
  GAZ_MINE: { color: "#4d7c0f", icon: "💨", label: "Émissions de gaz de mine" },
  TERRAINS_DEPOT: { color: "#a16207", icon: "⚠️", label: "Terrains de dépôt" },
  AUTRE: { color: "#6b7280", icon: "⚠️", label: "Autre risque" },
};

export const DEFAULT_RISK_STYLE = { color: "#6b7280", icon: "⚠️", label: "Risque" };

export const ALL_RISK_CODES = Object.keys(RISK_STYLES);

export function getRiskStyle(code: string) {
  return RISK_STYLES[code] ?? DEFAULT_RISK_STYLE;
}
