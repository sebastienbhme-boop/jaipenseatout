import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Client service_role — ne jamais importer depuis un composant client.
// Réservé aux écritures sur les tables de référence publiques (communes,
// commune_risks…) où l'utilisateur authentifié n'a pas de droit RLS direct.
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}
