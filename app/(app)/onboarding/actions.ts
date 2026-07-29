"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

type Commune = {
  insee_code: string;
  name: string;
  lat: number | null;
  lng: number | null;
};

type Member = {
  full_name: string;
  birth_date: string;
  is_primary: boolean;
};

export async function createHousehold(
  householdName: string,
  commune: Commune,
  members: Member[]
) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Vous devez être connecté." };
  }

  // La commune est une table de référence publique : on l'upsert pour que
  // les prochains foyers de la même commune la retrouvent directement en base.
  // Écriture via le client admin (service_role) car les utilisateurs n'ont
  // pas de droit RLS direct sur cette table de référence.
  const admin = createAdminClient();
  const { error: communeError } = await admin
    .from("communes")
    .upsert(
      {
        insee_code: commune.insee_code,
        name: commune.name,
        lat: commune.lat,
        lng: commune.lng,
      },
      { onConflict: "insee_code" }
    );

  if (communeError) {
    return { error: communeError.message };
  }

  const { data: household, error: householdError } = await supabase
    .from("households")
    .insert({
      owner_user_id: user.id,
      name: householdName,
      insee_code: commune.insee_code,
    })
    .select()
    .single();

  if (householdError || !household) {
    return { error: householdError?.message ?? "Erreur de création du foyer." };
  }

  const { error: profilesError } = await supabase.from("profiles").insert(
    members.map((m) => ({
      household_id: household.id,
      full_name: m.full_name,
      birth_date: m.birth_date || null,
      is_primary: m.is_primary,
    }))
  );

  if (profilesError) {
    return { error: profilesError.message };
  }

  return { success: true };
}
