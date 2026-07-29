import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function FoyerPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data: household } = await supabase
    .from("households")
    .select("*, profiles(*), communes(name)")
    .eq("owner_user_id", user.id)
    .single();

  if (!household) {
    redirect("/onboarding");
  }

  const profiles = [...household.profiles].sort(
    (a, b) => Number(b.is_primary) - Number(a.is_primary)
  );

  const { data: communeRisks } = household.insee_code
    ? await supabase
        .from("commune_risks")
        .select("risk_type_code, risk_types(label, icon_name)")
        .eq("insee_code", household.insee_code)
    : { data: null };

  return (
    <div className="mx-auto max-w-xl px-6 py-16">
      <h1 className="text-2xl font-semibold mb-1">{household.name}</h1>
      <p className="mb-8 text-zinc-600 dark:text-zinc-400">
        {profiles.length} membre{profiles.length > 1 ? "s" : ""} du foyer
        {household.communes?.name && <> · {household.communes.name}</>}
      </p>

      {communeRisks && communeRisks.length > 0 && (
        <div className="mb-8">
          <h2 className="mb-3 text-sm font-medium text-zinc-600 dark:text-zinc-400">
            Risques identifiés pour votre commune
          </h2>
          <ul className="flex flex-wrap gap-2">
            {communeRisks.map((cr) => {
              const riskType = Array.isArray(cr.risk_types)
                ? cr.risk_types[0]
                : cr.risk_types;
              return (
                <li
                  key={cr.risk_type_code}
                  className="rounded-full border border-zinc-200 px-3 py-1 text-sm dark:border-zinc-800"
                >
                  {riskType?.label ?? cr.risk_type_code}
                </li>
              );
            })}
          </ul>
          <p className="mt-3 text-xs text-zinc-500">
            Source : Géorisques (DDRM). Cette liste est informative — suivez
            toujours les consignes des autorités officielles.
          </p>
        </div>
      )}

      <ul className="flex flex-col gap-3">
        {profiles.map((profile) => (
          <li
            key={profile.id}
            className="flex items-center justify-between rounded-md border border-zinc-200 px-4 py-3 dark:border-zinc-800"
          >
            <div>
              <p className="font-medium">
                {profile.full_name}
                {profile.is_primary && (
                  <span className="ml-2 text-xs text-zinc-500">
                    Responsable
                  </span>
                )}
              </p>
              {profile.birth_date && (
                <p className="text-sm text-zinc-500">
                  Né(e) le{" "}
                  {new Date(profile.birth_date).toLocaleDateString("fr-FR")}
                </p>
              )}
            </div>
          </li>
        ))}
      </ul>

      <Link
        href="/points-de-repli"
        className="mt-8 inline-block text-sm text-zinc-600 hover:underline dark:text-zinc-400"
      >
        Continuer vers les points de repli →
      </Link>
    </div>
  );
}
