"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function translateError(message: string): string {
  if (message.includes("Invalid login credentials")) {
    return "Email ou mot de passe incorrect.";
  }
  if (message.includes("User already registered")) {
    return "Un compte existe déjà avec cet email. Utilisez plutôt \"Se connecter\".";
  }
  if (message.includes("Password should be at least")) {
    return "Le mot de passe doit contenir au moins 6 caractères.";
  }
  if (message.includes("Unable to validate email address")) {
    return "Cette adresse email n'est pas valide.";
  }
  return message;
}

export function LoginForm() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function switchMode(newMode: "login" | "signup") {
    setMode(newMode);
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { error } =
      mode === "login"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password });

    setLoading(false);

    if (error) {
      setError(translateError(error.message));
      return;
    }

    router.push("/onboarding");
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex rounded-full bg-zinc-100 p-1 dark:bg-zinc-900">
        <button
          type="button"
          onClick={() => switchMode("login")}
          className={`flex-1 rounded-full py-2 text-sm font-medium transition-colors ${
            mode === "login"
              ? "bg-white text-black shadow-sm dark:bg-zinc-800 dark:text-white"
              : "text-zinc-500"
          }`}
        >
          Se connecter
        </button>
        <button
          type="button"
          onClick={() => switchMode("signup")}
          className={`flex-1 rounded-full py-2 text-sm font-medium transition-colors ${
            mode === "signup"
              ? "bg-white text-black shadow-sm dark:bg-zinc-800 dark:text-white"
              : "text-zinc-500"
          }`}
        >
          Créer un compte
        </button>
      </div>

      <p className="text-sm text-zinc-500">
        {mode === "login"
          ? "Vous avez déjà un compte ? Connectez-vous pour retrouver votre foyer."
          : "Première visite ? Créez votre compte pour configurer votre foyer."}
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <label htmlFor="email" className="text-sm text-zinc-600 dark:text-zinc-400">
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="password" className="text-sm text-zinc-600 dark:text-zinc-400">
            Mot de passe
          </label>
          <input
            id="password"
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
          />
          {mode === "signup" && (
            <span className="text-xs text-zinc-500">
              6 caractères minimum.
            </span>
          )}
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="mt-2 flex h-11 items-center justify-center rounded-full bg-foreground text-background transition-colors hover:bg-[#383838] disabled:opacity-50 dark:hover:bg-[#ccc]"
        >
          {loading
            ? "Chargement…"
            : mode === "login"
              ? "Se connecter"
              : "Créer mon compte"}
        </button>
      </form>
    </div>
  );
}
