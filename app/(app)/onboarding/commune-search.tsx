"use client";

import { useEffect, useState } from "react";

export type Commune = {
  insee_code: string;
  name: string;
  lat: number | null;
  lng: number | null;
};

export function CommuneSearch({
  value,
  onChange,
}: {
  value: Commune | null;
  onChange: (commune: Commune | null) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Commune[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (value || query.trim().length < 2) {
      setResults([]);
      return;
    }

    const controller = new AbortController();
    setLoading(true);

    const timeout = setTimeout(() => {
      fetch(`/api/communes/search?q=${encodeURIComponent(query)}`, {
        signal: controller.signal,
      })
        .then((res) => res.json())
        .then((data) => setResults(data))
        .catch(() => {})
        .finally(() => setLoading(false));
    }, 250);

    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [query, value]);

  if (value) {
    return (
      <div className="flex items-center justify-between rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-700">
        <span>{value.name}</span>
        <button
          type="button"
          onClick={() => onChange(null)}
          className="text-sm text-zinc-500 hover:underline"
        >
          Changer
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <input
        type="text"
        placeholder="Rechercher votre commune…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="w-full rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
      />
      {loading && (
        <p className="mt-1 text-sm text-zinc-500">Recherche…</p>
      )}
      {results.length > 0 && (
        <ul className="absolute z-10 mt-1 w-full rounded-md border border-zinc-300 bg-white shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
          {results.map((c) => (
            <li key={c.insee_code}>
              <button
                type="button"
                onClick={() => {
                  onChange(c);
                  setQuery("");
                  setResults([]);
                }}
                className="block w-full px-3 py-2 text-left hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                {c.name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
