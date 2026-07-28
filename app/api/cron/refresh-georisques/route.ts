import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  // TODO: télécharger les CSV Géorisques (PPR, ICPE, zonage sismique, argiles, CASIAS)
  // et upsert dans communes / commune_risks via le client Supabase service_role.

  return NextResponse.json({ status: "ok" });
}
