export default function CartePage() {
  return (
    <div className="mx-auto max-w-xl px-6 py-16">
      <h1 className="text-2xl font-semibold mb-4">Carte des risques</h1>
      <p className="text-zinc-600 dark:text-zinc-400">
        Carte temps réel multi-risques, informative uniquement. Suivez
        toujours les consignes des autorités officielles (FR-Alert,
        gendarmerie, mairie, préfecture).
      </p>
      {/* TODO: carte avec feux actifs (app/api/fires) + risques par commune */}
    </div>
  );
}
