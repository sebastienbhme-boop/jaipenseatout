import { NextResponse } from "next/server";

const FRANCE_BBOX = "-5.5,41.2,9.7,51.5";
const DAY_RANGE = 1;

type FirePoint = {
  lat: number;
  lng: number;
  brightness: number;
  confidence: string;
  acq_date: string;
  acq_time: string;
};

function parseCsv(csv: string): FirePoint[] {
  const lines = csv.trim().split("\n");
  if (lines.length < 2) return [];

  const headers = lines[0].split(",");
  const latIdx = headers.indexOf("latitude");
  const lngIdx = headers.indexOf("longitude");
  const brightnessIdx = headers.indexOf("bright_ti4");
  const confidenceIdx = headers.indexOf("confidence");
  const dateIdx = headers.indexOf("acq_date");
  const timeIdx = headers.indexOf("acq_time");

  return lines.slice(1).map((line) => {
    const cols = line.split(",");
    return {
      lat: parseFloat(cols[latIdx]),
      lng: parseFloat(cols[lngIdx]),
      brightness: parseFloat(cols[brightnessIdx]),
      confidence: cols[confidenceIdx],
      acq_date: cols[dateIdx],
      acq_time: cols[timeIdx],
    };
  });
}

export async function GET() {
  const mapKey = process.env.NASA_FIRMS_MAP_KEY;
  if (!mapKey) {
    return NextResponse.json({ fires: [], error: "NASA_FIRMS_MAP_KEY manquante" });
  }

  const url = `https://firms.modaps.eosdis.nasa.gov/api/area/csv/${mapKey}/VIIRS_SNPP_NRT/${FRANCE_BBOX}/${DAY_RANGE}`;

  const res = await fetch(url, { next: { revalidate: 300 } });
  if (!res.ok) {
    return NextResponse.json({ fires: [], error: "Erreur NASA FIRMS" }, { status: 502 });
  }

  const csv = await res.text();
  const fires = parseCsv(csv);

  return NextResponse.json({ fires });
}
