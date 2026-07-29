import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { OnboardingForm } from "./onboarding-form";

export default async function OnboardingPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data: household } = await supabase
    .from("households")
    .select("id")
    .eq("owner_user_id", user.id)
    .maybeSingle();

  if (household) {
    redirect("/foyer");
  }

  return (
    <div className="mx-auto max-w-xl px-6 py-16">
      <h1 className="text-2xl font-semibold mb-2">Bienvenue</h1>
      <p className="mb-8 text-zinc-600 dark:text-zinc-400">
        Indiquez votre commune et les membres de votre foyer. Chacun aura son
        propre profil, son kit et son PDF.
      </p>
      <OnboardingForm />
    </div>
  );
}
