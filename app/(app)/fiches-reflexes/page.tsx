export default function FichesReflexesPage() {
  return (
    <div className="mx-auto max-w-xl px-6 py-16">
      <h1 className="text-2xl font-semibold mb-4">Fiches réflexes</h1>
      <p className="text-zinc-600 dark:text-zinc-400">
        Consultables hors-ligne, par type de risque.
      </p>
      {/* TODO: liste reflex_cards filtrée par les risques du foyer, mise en cache offline */}
    </div>
  );
}
