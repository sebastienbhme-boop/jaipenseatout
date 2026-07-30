import Link from "next/link";

const NAV_ITEMS = [
  { href: "/foyer", label: "Mon foyer" },
  { href: "/points-de-repli", label: "Points de repli" },
  { href: "/fiches-reflexes", label: "Fiches réflexes" },
  { href: "/kit", label: "Kit de survie" },
  { href: "/carte", label: "Carte" },
  { href: "/risques", label: "Comprendre les risques" },
];

export function SharedNav({ right }: { right?: React.ReactNode }) {
  return (
    <nav className="flex items-center gap-6 border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
      <Link href="/" className="font-semibold">
        J&apos;ai Pensé à Tout
      </Link>
      {NAV_ITEMS.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className="text-sm text-zinc-600 hover:text-black dark:text-zinc-400 dark:hover:text-white"
        >
          {item.label}
        </Link>
      ))}
      {right}
    </nav>
  );
}
