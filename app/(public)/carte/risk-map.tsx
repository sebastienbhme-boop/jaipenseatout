"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import MapGL, { Marker, Popup, Source, Layer, type MapRef } from "react-map-gl/maplibre";
import { setWorkerUrl } from "maplibre-gl";
import type { Feature, FeatureCollection, Geometry } from "geojson";
import "maplibre-gl/dist/maplibre-gl.css";
import { getRiskStyle } from "./risk-colors";
import { MeteoBanner } from "../../meteo-banner";

// Next.js réécrit import.meta.url d'une façon qui casse la résolution
// automatique du worker MapLibre (il pointe vers l'URL de la page
// courante au lieu du fichier réel) — on fixe l'URL explicitement vers
// une copie statique du worker dans /public.
if (typeof window !== "undefined") {
  setWorkerUrl("/maplibre-gl-worker.mjs");
}

const FRANCE_CENTER = { longitude: 2.5, latitude: 46.6 };
const FRANCE_ZOOM = 5.5;
const MAX_ZOOM = 13; // pas besoin de zoomer plus près, la carte reste informative à l'échelle communale
const ICONS_MIN_ZOOM = 10; // en dessous, trop de communes affichées : les pictos surchargeraient la carte
const MOVE_DEBOUNCE_MS = 400;

const BASE_STYLE = "https://openmaptiles.geo.data.gouv.fr/styles/osm-bright/style.json";

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

export function RiskMap({ inseeCode }: { inseeCode: string | null }) {
  const mapRef = useRef<MapRef>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [initialCenter, setInitialCenter] = useState<{ longitude: number; latitude: number } | null>(null);
  const [communes, setCommunes] = useState<CommuneArea[]>([]);
  const [truncated, setTruncated] = useState(false);
  const [zoom, setZoom] = useState(FRANCE_ZOOM);
  const [loading, setLoading] = useState(false);
  const [selectedRisk, setSelectedRisk] = useState<string | null>(null);
  const [popupCommune, setPopupCommune] = useState<CommuneArea | null>(null);

  useEffect(() => {
    if (!inseeCode) return;
    fetch(`/api/communes/risks?insee_code=${inseeCode}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.center) {
          setInitialCenter({ latitude: data.center.lat, longitude: data.center.lng });
        }
      })
      .catch(() => {});
  }, [inseeCode]);

  const fetchCommunes = useCallback(() => {
    const map = mapRef.current?.getMap();
    if (!map) return;
    const bounds = map.getBounds();
    const params = new URLSearchParams({
      north: String(bounds.getNorth()),
      south: String(bounds.getSouth()),
      east: String(bounds.getEast()),
      west: String(bounds.getWest()),
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

  const handleMoveEnd = useCallback(() => {
    const map = mapRef.current?.getMap();
    if (!map) return;
    setZoom(map.getZoom());

    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(fetchCommunes, MOVE_DEBOUNCE_MS);
  }, [fetchCommunes]);

  const availableRisks = useMemo(() => {
    const map = new Map<string, string>();
    for (const commune of communes) {
      for (const risk of commune.risks) {
        map.set(risk.code, risk.label);
      }
    }
    return [...map.entries()].map(([code, label]) => ({ code, label }));
  }, [communes]);

  const showIcons = zoom >= ICONS_MIN_ZOOM;

  const selectedRiskGeoJson: FeatureCollection | null = useMemo(() => {
    if (!selectedRisk) return null;
    const features: Feature[] = communes
      .filter((c) => c.contour && c.risks.some((r) => r.code === selectedRisk))
      .map((c) => ({
        type: "Feature",
        geometry: c.contour as Geometry,
        properties: { insee_code: c.insee_code },
      }));
    return { type: "FeatureCollection", features };
  }, [communes, selectedRisk]);

  const selectedStyle = selectedRisk ? getRiskStyle(selectedRisk) : null;

  return (
    <div className="relative h-full w-full">
      <MapGL
        ref={mapRef}
        initialViewState={{
          longitude: initialCenter?.longitude ?? FRANCE_CENTER.longitude,
          latitude: initialCenter?.latitude ?? FRANCE_CENTER.latitude,
          zoom: initialCenter ? 13 : FRANCE_ZOOM,
        }}
        mapStyle={BASE_STYLE}
        maxZoom={MAX_ZOOM}
        style={{ width: "100%", height: "100%" }}
        onLoad={(e) => {
          fetchCommunes();
          setZoom(e.target.getZoom());
        }}
        onMoveEnd={handleMoveEnd}
      >
        {selectedRiskGeoJson && selectedStyle && (
          <Source id="selected-risk" type="geojson" data={selectedRiskGeoJson}>
            <Layer
              id="selected-risk-fill"
              type="fill"
              paint={{ "fill-color": selectedStyle.color, "fill-opacity": 0.35 }}
            />
            <Layer
              id="selected-risk-outline"
              type="line"
              paint={{ "line-color": selectedStyle.color, "line-width": 1.5 }}
            />
          </Source>
        )}

        {showIcons &&
          communes.map((commune) => {
            const risksToShow = selectedRisk
              ? commune.risks.filter((r) => r.code === selectedRisk)
              : commune.risks;
            if (selectedRisk && risksToShow.length === 0) return null;

            return (
              <Marker
                key={commune.insee_code}
                longitude={commune.lng}
                latitude={commune.lat}
                onClick={(e) => {
                  e.originalEvent.stopPropagation();
                  setPopupCommune(commune);
                }}
              >
                <div className="flex cursor-pointer gap-0.5">
                  {risksToShow.slice(0, 4).map((r) => (
                    <span
                      key={r.code}
                      className="flex h-5 w-5 items-center justify-center rounded-full border border-zinc-300 bg-white text-[11px] shadow-sm"
                    >
                      {getRiskStyle(r.code).icon}
                    </span>
                  ))}
                  {risksToShow.length > 4 && (
                    <span className="flex h-5 w-5 items-center justify-center rounded-full border border-zinc-300 bg-white text-[9px] font-medium shadow-sm">
                      +{risksToShow.length - 4}
                    </span>
                  )}
                </div>
              </Marker>
            );
          })}

        {popupCommune && (
          <Popup
            longitude={popupCommune.lng}
            latitude={popupCommune.lat}
            onClose={() => setPopupCommune(null)}
            closeButton
            closeOnClick={false}
            offset={20}
          >
            <strong>{popupCommune.name}</strong>
            {popupCommune.risks.length > 0 ? (
              <ul className="mt-1 list-none pl-0">
                {popupCommune.risks.map((r) => {
                  const style = getRiskStyle(r.code);
                  return (
                    <li key={r.code}>
                      {style.icon} {r.label}
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p>Aucun risque référencé.</p>
            )}
          </Popup>
        )}
      </MapGL>

      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex flex-col gap-2 p-4">
        <div className="pointer-events-auto max-w-md rounded-lg bg-white/95 p-3 text-sm shadow-md backdrop-blur dark:bg-zinc-900/95">
          <p className="font-medium">Carte des risques</p>
          <p className="text-xs text-zinc-500">
            Informative uniquement. Suivez toujours les consignes des
            autorités officielles.
          </p>
          <p className="mt-1 font-mono text-xs text-zinc-400">
            zoom: {zoom.toFixed(2)} (pictos ≥{ICONS_MIN_ZOOM}, max {MAX_ZOOM})
          </p>
          {!showIcons && (
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
          <div className="mt-2 border-t border-zinc-200 pt-2 dark:border-zinc-700">
            <MeteoBanner />
          </div>
        </div>
      </div>

      {availableRisks.length > 0 && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex justify-center p-4">
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
