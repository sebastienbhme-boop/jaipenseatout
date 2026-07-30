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

export function RiskMap({ inseeCode }: { inseeCode: string | null }) {
  const mapRef = useRef<MapRef>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Cache des communes par département — un département chargé une fois
  // n'est jamais retéléchargé, et surtout ne "disparaît" plus au fil des
  // déplacements de la carte (contrairement à une requête par zone
  // géographique bornée, sujette au clignotement quand une zone dense
  // dépasse la limite de résultats).
  const departementCacheRef = useRef<Map<string, CommuneArea[]>>(new Map());
  const loadingDepartementsRef = useRef<Set<string>>(new Set());

  const [initialCenter, setInitialCenter] = useState<{ longitude: number; latitude: number } | null>(null);
  const [communes, setCommunes] = useState<CommuneArea[]>([]);
  const [zoom, setZoom] = useState(FRANCE_ZOOM);
  const [loadProgress, setLoadProgress] = useState<{ loaded: number; total: number } | null>(null);
  const [selectedRisk, setSelectedRisk] = useState<string | null>(null);
  const [popupCommune, setPopupCommune] = useState<CommuneArea | null>(null);
  const [labelledRiskInfo, setLabelledRiskInfo] = useState<{ label: string; top: number } | null>(null);
  const legendRef = useRef<HTMLDivElement>(null);
  const labelTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showRiskLabel = useCallback((label: string, buttonEl: HTMLElement) => {
    const containerRect = legendRef.current?.getBoundingClientRect();
    const buttonRect = buttonEl.getBoundingClientRect();
    const top = containerRect ? buttonRect.top - containerRect.top : 0;
    setLabelledRiskInfo({ label, top });
    if (labelTimeoutRef.current) clearTimeout(labelTimeoutRef.current);
    labelTimeoutRef.current = setTimeout(() => setLabelledRiskInfo(null), 2000);
  }, []);

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

  const refreshVisibleCommunes = useCallback(() => {
    const cache = departementCacheRef.current;
    const all = [...cache.values()].flat();
    setCommunes(all);
  }, []);

  const loadDepartement = useCallback(
    async (code: string) => {
      if (departementCacheRef.current.has(code) || loadingDepartementsRef.current.has(code)) {
        return;
      }
      loadingDepartementsRef.current.add(code);
      try {
        const res = await fetch(`/api/communes/departement/${code}`);
        const data = await res.json();
        departementCacheRef.current.set(code, data.communes ?? []);
        refreshVisibleCommunes();
      } catch {
        // laisse la possibilité de retenter au prochain déplacement
      } finally {
        loadingDepartementsRef.current.delete(code);
      }
    },
    [refreshVisibleCommunes]
  );

  const fetchDepartementsInBounds = useCallback(() => {
    const map = mapRef.current?.getMap();
    if (!map) return;
    const bounds = map.getBounds();
    const params = new URLSearchParams({
      north: String(bounds.getNorth()),
      south: String(bounds.getSouth()),
      east: String(bounds.getEast()),
      west: String(bounds.getWest()),
    });

    fetch(`/api/communes/departements-in-bounds?${params}`)
      .then((res) => res.json())
      .then(async (data: { departements: string[] }) => {
        const departements = data.departements ?? [];
        const toLoad = departements.filter((code) => !departementCacheRef.current.has(code));

        if (toLoad.length === 0) return;

        let loaded = 0;
        setLoadProgress({ loaded: 0, total: toLoad.length });
        await Promise.all(
          toLoad.map(async (code) => {
            await loadDepartement(code);
            loaded += 1;
            setLoadProgress({ loaded, total: toLoad.length });
          })
        );
      })
      .catch(() => {})
      .finally(() => setLoadProgress(null));
  }, [loadDepartement]);

  const handleMoveEnd = useCallback(() => {
    const map = mapRef.current?.getMap();
    if (!map) return;
    setZoom(map.getZoom());

    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(fetchDepartementsInBounds, MOVE_DEBOUNCE_MS);
  }, [fetchDepartementsInBounds]);

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
          fetchDepartementsInBounds();
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
                      className="flex h-4 w-4 items-center justify-center rounded-full border border-zinc-300 bg-white text-[9px] shadow-sm"
                    >
                      {getRiskStyle(r.code).icon}
                    </span>
                  ))}
                  {risksToShow.length > 4 && (
                    <span className="flex h-4 w-4 items-center justify-center rounded-full border border-zinc-300 bg-white text-[7px] font-medium shadow-sm">
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
          {loadProgress && (
            <div>
              <div className="flex items-center justify-between text-xs text-zinc-400">
                <span>Chargement des risques…</span>
                <span className="font-mono tabular-nums">
                  {loadProgress.loaded}/{loadProgress.total}
                </span>
              </div>
              <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700">
                <div
                  className="h-full rounded-full bg-zinc-900 transition-all duration-300 dark:bg-white"
                  style={{
                    width: `${(loadProgress.loaded / loadProgress.total) * 100}%`,
                  }}
                />
              </div>
            </div>
          )}
          <div className={loadProgress ? "mt-2 border-t border-zinc-200 pt-2 dark:border-zinc-700" : ""}>
            <MeteoBanner />
          </div>
        </div>
      </div>

      {availableRisks.length > 0 && (
        <div ref={legendRef} className="pointer-events-none absolute inset-y-0 right-0 z-10 flex items-center p-3">
          <div className="pointer-events-auto flex max-h-full flex-col gap-1.5 overflow-y-auto rounded-xl bg-white/95 p-1.5 shadow-md backdrop-blur dark:bg-zinc-900/95">
            <button
              onClick={() => setSelectedRisk(null)}
              title="Tous les risques"
              aria-label="Tous les risques"
              aria-pressed={selectedRisk === null}
              className={`flex h-8 w-8 items-center justify-center rounded-md border text-sm transition-colors ${
                selectedRisk === null
                  ? "border-zinc-900 bg-zinc-900 text-white dark:border-white dark:bg-white dark:text-black"
                  : "border-zinc-300 text-zinc-600 hover:border-zinc-400 dark:border-zinc-700 dark:text-zinc-400"
              }`}
            >
              ✳️
            </button>
            {availableRisks.map((r) => {
              const style = getRiskStyle(r.code);
              const active = selectedRisk === r.code;
              return (
                <button
                  key={r.code}
                  onClick={(e) => {
                    setSelectedRisk(active ? null : r.code);
                    showRiskLabel(r.label, e.currentTarget);
                  }}
                  aria-label={r.label}
                  aria-pressed={active}
                  className="flex h-8 w-8 items-center justify-center rounded-md border text-sm transition-colors"
                  style={{
                    borderColor: style.color,
                    backgroundColor: active ? style.color : "transparent",
                  }}
                >
                  {style.icon}
                </button>
              );
            })}
          </div>

          {labelledRiskInfo && (
            <span
              className="pointer-events-none absolute -translate-y-1/2 whitespace-nowrap rounded-md bg-white/95 px-2 py-1 text-xs font-medium text-zinc-800 shadow-md backdrop-blur dark:bg-zinc-900/95 dark:text-zinc-100"
              style={{ right: "3.25rem", top: labelledRiskInfo.top + 16 }}
            >
              {labelledRiskInfo.label}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
