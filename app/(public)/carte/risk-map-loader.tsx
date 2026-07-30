"use client";

import dynamic from "next/dynamic";

const RiskMap = dynamic(() => import("./risk-map").then((m) => m.RiskMap), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center text-zinc-500">
      Chargement de la carte…
    </div>
  ),
});

export function RiskMapLoader({ inseeCode }: { inseeCode: string | null }) {
  return <RiskMap inseeCode={inseeCode} />;
}
