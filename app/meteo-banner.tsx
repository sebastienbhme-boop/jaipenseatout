// Les intempéries (tempête, grêle, neige, foudre) concernent l'ensemble
// du territoire français, sans commune plus exposée qu'une autre — pas
// de donnée par commune à afficher, juste ce rappel fixe.
export function MeteoBanner() {
  return (
    <p className="text-xs text-zinc-500">
      ⛈️ Les intempéries (tempête, grêle, neige, foudre) concernent
      l&apos;ensemble du territoire.{" "}
      <a
        href="https://vigilance.meteofrance.fr"
        target="_blank"
        rel="noopener noreferrer"
        className="underline hover:no-underline"
      >
        Suivez la vigilance météo
      </a>
      .
    </p>
  );
}
