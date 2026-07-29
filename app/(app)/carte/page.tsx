import { createClient } from "@/lib/supabase/server";
import { RiskMapLoader } from "./risk-map-loader";

export default async function CartePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let inseeCode: string | null = null;
  if (user) {
    const { data: household } = await supabase
      .from("households")
      .select("insee_code")
      .eq("owner_user_id", user.id)
      .maybeSingle();
    inseeCode = household?.insee_code ?? null;
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-2xl font-semibold mb-4">Carte des risques</h1>
      <p className="mb-6 text-zinc-600 dark:text-zinc-400">
        Carte temps réel multi-risques, informative uniquement. Suivez
        toujours les consignes des autorités officielles (FR-Alert,
        gendarmerie, mairie, préfecture).
      </p>
      <RiskMapLoader inseeCode={inseeCode} />
      <p className="mt-4 text-xs text-zinc-500">
        Cliquez sur un picto pour filtrer la carte sur ce risque.
      </p>
    </div>
  );
}
