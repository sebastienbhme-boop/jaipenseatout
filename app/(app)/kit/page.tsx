export default function KitPage() {
  return (
    <div className="mx-auto max-w-xl px-6 py-16">
      <h1 className="text-2xl font-semibold mb-4">Kit de survie</h1>
      <p className="text-zinc-600 dark:text-zinc-400">
        Kit personnel par membre du foyer, sur 3 niveaux cumulatifs : 72h,
        1 semaine, 1 mois.
      </p>
      {/* TODO: kit_items par profil, groupés par kit_categories, rappels de roulement */}
    </div>
  );
}
