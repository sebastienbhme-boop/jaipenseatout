import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-col flex-1 items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex flex-1 w-full max-w-2xl flex-col items-center justify-center gap-8 py-32 px-6 text-center">
        <div className="flex flex-col gap-3">
          <h1 className="text-4xl font-semibold tracking-tight text-black dark:text-zinc-50">
            J&apos;ai Pensé à Tout
          </h1>
          <p className="text-lg text-zinc-600 dark:text-zinc-400">
            J&apos;ai pensé à tout. Pour eux.
          </p>
        </div>
        <p className="max-w-md text-zinc-500 dark:text-zinc-400">
          Préparez votre foyer aux crises : points de repli, kits de survie
          par personne, fiches réflexes hors-ligne. En complément des
          autorités officielles, jamais à leur place.
        </p>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Link
            href="/auth/login"
            className="flex h-12 items-center justify-center rounded-full bg-foreground px-8 text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc]"
          >
            Créer mon compte
          </Link>
          <Link
            href="/carte"
            className="flex h-12 items-center justify-center rounded-full border border-zinc-300 px-8 text-zinc-700 transition-colors hover:border-zinc-400 dark:border-zinc-700 dark:text-zinc-300"
          >
            Voir la carte des risques
          </Link>
        </div>

        <Link
          href="/risques"
          className="text-sm text-zinc-500 hover:underline"
        >
          Comprendre les 18 types de risques →
        </Link>
      </main>
    </div>
  );
}
