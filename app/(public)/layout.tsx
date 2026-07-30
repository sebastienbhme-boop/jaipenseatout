import Link from "next/link";
import { SharedNav } from "../shared-nav";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <SharedNav
        right={
          <Link
            href="/auth/login"
            className="ml-auto text-sm text-zinc-600 hover:underline dark:text-zinc-400"
          >
            Se connecter
          </Link>
        }
      />
      <main className="flex-1">{children}</main>
    </div>
  );
}
