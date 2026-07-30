"use client";

import dynamic from "next/dynamic";

const RiskMap = dynamic(() => import("./risk-map").then((m) => m.RiskMap), {
  ssr: false,
  loading: () => (
    <div className="flex h-[500px] w-full items-center justify-center rounded-lg border border-zinc-200 text-zinc-500 dark:border-zinc-800">
      Chargement de la carte…
    </div>
  ),
});

export function RiskMapLoader({ inseeCode }: { inseeCode: string | null }) {
  return <RiskMap inseeCode={inseeCode} />;
}
