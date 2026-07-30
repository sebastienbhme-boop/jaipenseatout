import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SharedNav } from "../shared-nav";
import { SignOutButton } from "./sign-out-button";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  return (
    <div className="flex min-h-screen flex-col">
      <SharedNav right={<SignOutButton />} />
      <main className="flex-1">{children}</main>
    </div>
  );
}
