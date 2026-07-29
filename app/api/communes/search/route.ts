import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim();
  if (!q || q.length < 2) {
    return NextResponse.json([]);
  }

  const url = `https://geo.api.gouv.fr/communes?nom=${encodeURIComponent(
    q
  )}&fields=code,nom,centre,population&boost=population&limit=10`;

  const res = await fetch(url);
  if (!res.ok) {
    return NextResponse.json({ error: "Erreur recherche commune" }, { status: 502 });
  }

  const communes = await res.json();
  return NextResponse.json(
    communes.map((c: { code: string; nom: string; centre?: { coordinates: [number, number] } }) => ({
      insee_code: c.code,
      name: c.nom,
      lat: c.centre?.coordinates[1] ?? null,
      lng: c.centre?.coordinates[0] ?? null,
    }))
  );
}
