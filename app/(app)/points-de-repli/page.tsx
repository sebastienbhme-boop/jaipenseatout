export default function PointsDeRepliPage() {
  return (
    <div className="mx-auto max-w-xl px-6 py-16">
      <h1 className="text-2xl font-semibold mb-4">Points de repli</h1>
      <p className="text-zinc-600 dark:text-zinc-400">
        Définissez vos points de repli sur 3 niveaux : quelques heures,
        quelques jours, long terme. Ces points sont saisis par vous, sans
        validation officielle.
      </p>
      {/* TODO: CRUD retreat_points par profil, groupés par horizon_level */}
    </div>
  );
}
