import { NextResponse } from "next/server";

const FRANCE_BBOX = "-5.5,41.2,9.7,51.5";
const DAY_RANGE = 1;

export async function GET() {
  const mapKey = process.env.NASA_FIRMS_MAP_KEY;
  if (!mapKey) {
    return NextResponse.json(
      { error: "NASA_FIRMS_MAP_KEY manquante" },
      { status: 500 }
    );
  }

  const url = `https://firms.modaps.eosdis.nasa.gov/api/area/csv/${mapKey}/VIIRS_SNPP_NRT/${FRANCE_BBOX}/${DAY_RANGE}`;

  const res = await fetch(url, { next: { revalidate: 300 } });
  if (!res.ok) {
    return NextResponse.json(
      { error: "Erreur NASA FIRMS" },
      { status: 502 }
    );
  }

  const csv = await res.text();
  return new NextResponse(csv, {
    headers: { "Content-Type": "text/csv" },
  });
}
