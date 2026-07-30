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
    <div className="relative" style={{ height: "calc(100dvh - 65px)" }}>
      <RiskMapLoader inseeCode={inseeCode} />
    </div>
  );
}
