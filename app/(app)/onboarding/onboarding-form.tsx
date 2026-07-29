"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CommuneSearch, type Commune } from "./commune-search";
import { createHousehold } from "./actions";

type Member = {
  full_name: string;
  birth_date: string;
  is_primary: boolean;
};

export function OnboardingForm() {
  const router = useRouter();
  const [householdName, setHouseholdName] = useState("");
  const [commune, setCommune] = useState<Commune | null>(null);
  const [members, setMembers] = useState<Member[]>([
    { full_name: "", birth_date: "", is_primary: true },
  ]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function updateMember(index: number, patch: Partial<Member>) {
    setMembers((prev) =>
      prev.map((m, i) => (i === index ? { ...m, ...patch } : m))
    );
  }

  function addMember() {
    setMembers((prev) => [
      ...prev,
      { full_name: "", birth_date: "", is_primary: false },
    ]);
  }

  function removeMember(index: number) {
    setMembers((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!commune) {
      setError("Sélectionnez votre commune.");
      return;
    }
    if (members.some((m) => !m.full_name.trim())) {
      setError("Chaque membre doit avoir un nom.");
      return;
    }

    setLoading(true);
    const result = await createHousehold(householdName, commune, members);
    setLoading(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    router.push("/foyer");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <label htmlFor="household_name" className="text-sm text-zinc-600 dark:text-zinc-400">
          Nom du foyer
        </label>
        <input
          id="household_name"
          type="text"
          required
          placeholder="Ex: Famille Martin"
          value={householdName}
          onChange={(e) => setHouseholdName(e.target.value)}
          className="rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm text-zinc-600 dark:text-zinc-400">Commune</label>
        <CommuneSearch value={commune} onChange={setCommune} />
      </div>

      <div className="flex flex-col gap-3">
        <label className="text-sm text-zinc-600 dark:text-zinc-400">
          Membres du foyer
        </label>
        {members.map((member, index) => (
          <div
            key={index}
            className="flex items-end gap-2 rounded-md border border-zinc-200 p-3 dark:border-zinc-800"
          >
            <div className="flex flex-1 flex-col gap-1">
              <span className="text-xs text-zinc-500">Nom</span>
              <input
                type="text"
                required
                value={member.full_name}
                onChange={(e) =>
                  updateMember(index, { full_name: e.target.value })
                }
                className="rounded-md border border-zinc-300 px-2 py-1.5 dark:border-zinc-700 dark:bg-zinc-900"
              />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs text-zinc-500">Date de naissance</span>
              <input
                type="date"
                value={member.birth_date}
                onChange={(e) =>
                  updateMember(index, { birth_date: e.target.value })
                }
                className="rounded-md border border-zinc-300 px-2 py-1.5 dark:border-zinc-700 dark:bg-zinc-900"
              />
            </div>
            {members.length > 1 && !member.is_primary && (
              <button
                type="button"
                onClick={() => removeMember(index)}
                className="px-2 py-1.5 text-sm text-red-600 hover:underline"
              >
                Retirer
              </button>
            )}
          </div>
        ))}
        <button
          type="button"
          onClick={addMember}
          className="self-start text-sm text-zinc-600 hover:underline dark:text-zinc-400"
        >
          + Ajouter un membre
        </button>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="flex h-11 items-center justify-center rounded-full bg-foreground text-background transition-colors hover:bg-[#383838] disabled:opacity-50 dark:hover:bg-[#ccc]"
      >
        {loading ? "Création…" : "Créer mon foyer"}
      </button>
    </form>
  );
}
