"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, TileLayer, GeoJSON, Marker, Popup, useMap, useMapEvents } from "react-leaflet";
import type { Feature, Geometry } from "geojson";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { getRiskStyle } from "./risk-colors";

const FRANCE_CENTER: [number, number] = [46.6, 2.5];
const FRANCE_ZOOM = 6;
const BORDER_COLOR = "#71717a";
const CONTOURS_MIN_ZOOM = 9; // en dessous, trop de communes : on ne charge pas les contours (évite les gros payloads)
const ICONS_MIN_ZOOM = 10; // en dessous, trop de communes affichées : les pictos surchargeraient la carte
const MOVE_DEBOUNCE_MS = 400;

function riskIcon(icon: string) {
  return L.divIcon({
    html: `<div style="
      display:flex;align-items:center;justify-content:center;
      width:26px;height:26px;border-radius:9999px;
      background:white;font-size:14px;
      border:1px solid #d4d4d8;box-shadow:0 1px 3px rgba(0,0,0,0.3);
    ">${icon}</div>`,
    className: "",
    iconSize: [26, 26],
    iconAnchor: [13, 13],
  });
}

type Risk = { code: string; label: string };

type CommuneArea = {
  insee_code: string;
  name: string;
  lat: number;
  lng: number;
  contour: Geometry | null;
  risks: Risk[];
};

type BoundsResponse = {
  communes: CommuneArea[];
  truncated: boolean;
};

type Bounds = { north: number; south: number; east: number; west: number };

function BoundsWatcher({ onChange }: { onChange: (bounds: Bounds, zoom: number) => void }) {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const map = useMapEvents({
    moveend: () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        const b = map.getBounds();
        onChange(
          { north: b.getNorth(), south: b.getSouth(), east: b.getEast(), west: b.getWest() },
          map.getZoom()
        );
      }, MOVE_DEBOUNCE_MS);
    },
  });

  useEffect(() => {
    const b = map.getBounds();
    onChange(
      { north: b.getNorth(), south: b.getSouth(), east: b.getEast(), west: b.getWest() },
      map.getZoom()
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}

function RecenterOnCenter({ center }: { center: [number, number] | null }) {
  const map = useMap();
  const done = useRef(false);
  useEffect(() => {
    if (center && !done.current) {
      map.setView(center, 12);
      done.current = true;
    }
  }, [center, map]);
  return null;
}

export function RiskMap({ inseeCode }: { inseeCode: string | null }) {
  const [initialCenter, setInitialCenter] = useState<[number, number] | null>(null);
  const [communes, setCommunes] = useState<CommuneArea[]>([]);
  const [truncated, setTruncated] = useState(false);
  const [zoom, setZoom] = useState(FRANCE_ZOOM);
  const [loading, setLoading] = useState(false);
  const [selectedRisk, setSelectedRisk] = useState<string | null>(null);

  useEffect(() => {
    if (!inseeCode) return;
    fetch(`/api/communes/risks?insee_code=${inseeCode}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.center) {
          setInitialCenter([data.center.lat, data.center.lng]);
        }
      })
      .catch(() => {});
  }, [inseeCode]);

  const handleBoundsChange = useCallback((bounds: Bounds, currentZoom: number) => {
    setZoom(currentZoom);

    if (currentZoom < CONTOURS_MIN_ZOOM) {
      setCommunes([]);
      setTruncated(false);
      return;
    }

    const params = new URLSearchParams({
      north: String(bounds.north),
      south: String(bounds.south),
      east: String(bounds.east),
      west: String(bounds.west),
    });
    setLoading(true);
    fetch(`/api/communes/in-bounds?${params}`)
      .then((res) => res.json())
      .then((data: BoundsResponse) => {
        setCommunes(data.communes ?? []);
        setTruncated(data.truncated ?? false);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const availableRisks = useMemo(() => {
    const map = new Map<string, string>();
    for (const commune of communes) {
      for (const risk of commune.risks) {
        map.set(risk.code, risk.label);
      }
    }
    return [...map.entries()].map(([code, label]) => ({ code, label }));
  }, [communes]);

  const selectedStyle = selectedRisk ? getRiskStyle(selectedRisk) : null;
  const showIcons = zoom >= ICONS_MIN_ZOOM;
  const showContours = zoom >= CONTOURS_MIN_ZOOM;

  return (
    <div className="relative h-full w-full">
      <MapContainer
        center={initialCenter ?? FRANCE_CENTER}
        zoom={initialCenter ? 12 : FRANCE_ZOOM}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <RecenterOnCenter center={initialCenter} />
        <BoundsWatcher onChange={handleBoundsChange} />

        {showContours &&
          communes.map((commune) => {
            if (!commune.contour) return null;

            const isCenter = commune.insee_code === inseeCode;
            const hasSelectedRisk = selectedRisk
              ? commune.risks.some((r) => r.code === selectedRisk)
              : false;

            const feature: Feature = {
              type: "Feature",
              geometry: commune.contour,
              properties: {},
            };

            return (
              <GeoJSON
                key={`${commune.insee_code}-${selectedRisk}`}
                data={feature}
                style={{
                  color: hasSelectedRisk ? selectedStyle!.color : BORDER_COLOR,
                  fillColor: hasSelectedRisk ? selectedStyle!.color : "transparent",
                  fillOpacity: hasSelectedRisk ? 0.4 : 0,
                  weight: isCenter ? 3 : 1,
                  opacity: isCenter ? 1 : 0.5,
                }}
              >
                <Popup>
                  <strong>{commune.name}</strong>
                  {commune.risks.length > 0 ? (
                    <ul className="mt-1 list-none pl-0">
                      {commune.risks.map((r) => {
                        const riskStyle = getRiskStyle(r.code);
                        return (
                          <li key={r.code}>
                            {riskStyle.icon} {r.label}
                          </li>
                        );
                      })}
                    </ul>
                  ) : (
                    <p>Aucun risque référencé.</p>
                  )}
                </Popup>
              </GeoJSON>
            );
          })}

        {showIcons &&
          communes.flatMap((commune) => {
            const risksToShow = selectedRisk
              ? commune.risks.filter((r) => r.code === selectedRisk)
              : commune.risks;

            return risksToShow.map((risk, i) => {
              const style = getRiskStyle(risk.code);
              const offset = (i - (risksToShow.length - 1) / 2) * 0.0025;
              return (
                <Marker
                  key={`${commune.insee_code}-${risk.code}`}
                  position={[commune.lat, commune.lng + offset]}
                  icon={riskIcon(style.icon)}
                >
                  <Popup>
                    <strong>{commune.name}</strong>
                    <p>
                      {style.icon} {risk.label}
                    </p>
                  </Popup>
                </Marker>
              );
            });
          })}
      </MapContainer>

      <div className="pointer-events-none absolute inset-x-0 top-0 z-[1000] flex flex-col gap-2 p-4">
        <div className="pointer-events-auto max-w-md rounded-lg bg-white/95 p-3 text-sm shadow-md backdrop-blur dark:bg-zinc-900/95">
          <p className="font-medium">Carte des risques</p>
          <p className="text-xs text-zinc-500">
            Informative uniquement. Suivez toujours les consignes des
            autorités officielles.
          </p>
          {!showContours && (
            <p className="mt-1 text-xs text-amber-600">
              Zoomez pour afficher le détail des risques par commune.
            </p>
          )}
          {loading && <p className="mt-1 text-xs text-zinc-400">Chargement…</p>}
          {truncated && (
            <p className="mt-1 text-xs text-amber-600">
              Trop de communes dans cette zone — zoomez pour tout afficher.
            </p>
          )}
        </div>
      </div>

      {availableRisks.length > 0 && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[1000] flex justify-center p-4">
          <div className="pointer-events-auto flex max-w-full flex-wrap justify-center gap-2 rounded-lg bg-white/95 p-2 shadow-md backdrop-blur dark:bg-zinc-900/95">
            <button
              onClick={() => setSelectedRisk(null)}
              className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
                selectedRisk === null
                  ? "border-zinc-900 bg-zinc-900 text-white dark:border-white dark:bg-white dark:text-black"
                  : "border-zinc-300 text-zinc-600 hover:border-zinc-400 dark:border-zinc-700 dark:text-zinc-400"
              }`}
            >
              Tous les risques
            </button>
            {availableRisks.map((r) => {
              const style = getRiskStyle(r.code);
              const active = selectedRisk === r.code;
              return (
                <button
                  key={r.code}
                  onClick={() => setSelectedRisk(active ? null : r.code)}
                  className="flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors"
                  style={{
                    borderColor: style.color,
                    backgroundColor: active ? style.color : "transparent",
                    color: active ? "white" : style.color,
                  }}
                >
                  <span>{style.icon}</span>
                  {r.label}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
