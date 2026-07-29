import { createClient } from "@/lib/supabase/server";
import { getRiskStyle } from "../carte/risk-colors";

export default async function RisquesPage() {
  const supabase = await createClient();
  const { data: riskTypes } = await supabase
    .from("risk_types")
    .select("code, label, default_content")
    .order("label");

  return (
    <div className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="text-2xl font-semibold mb-2">Comprendre les risques</h1>
      <p className="mb-8 text-zinc-600 dark:text-zinc-400">
        Les 18 types de risques majeurs recensés en France par les
        autorités (DDRM). Cette page est informative — suivez toujours les
        consignes officielles en cas d&apos;alerte.
      </p>

      <ul className="flex flex-col gap-3">
        {(riskTypes ?? []).map((risk) => {
          const style = getRiskStyle(risk.code);
          return (
            <li
              key={risk.code}
              className="flex gap-3 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800"
            >
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg"
                style={{ backgroundColor: `${style.color}22` }}
              >
                {style.icon}
              </div>
              <div>
                <h2 className="font-medium">{risk.label}</h2>
                {risk.default_content && (
                  <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                    {risk.default_content}
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
