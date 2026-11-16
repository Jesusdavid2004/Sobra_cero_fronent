"use client";

import { useState } from "react";

import { ApiError, api } from "@/lib/api";
import type { GeocodeResult } from "@/lib/map-schemas";

type Props = {
  t: Record<string, string>;
  onPick: (result: GeocodeResult) => void;
};

const MIN_CHARACTERS = 3;

function errorKey(cause: unknown): string {
  if (cause instanceof ApiError && cause.code === "rate_limited") return "mapGeoRateLimited";
  if (cause instanceof ApiError && cause.code === "geocoding_query_invalid")
    return "mapGeoTooShort";
  return "mapGeoError";
}

/**
 * Place search by address or landmark. It runs only when the visitor submits, never while typing:
 * the geocoding provider's policy forbids autocomplete.
 */
export default function GeoSearch({ t, onPick }: Props) {
  const [text, setText] = useState("");
  const [results, setResults] = useState<GeocodeResult[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    if (text.trim().length < MIN_CHARACTERS) {
      setError(t.mapGeoTooShort);
      return;
    }
    setBusy(true);
    try {
      setResults(await api.geocode(text.trim()));
    } catch (cause) {
      setResults(null);
      setError(t[errorKey(cause)]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <form onSubmit={submit} className="flex items-end gap-2">
        <label className="flex-1 text-sm font-semibold">
          <span className="mb-1 block">{t.mapGeoSearchLabel}</span>
          <input
            type="text"
            value={text}
            maxLength={120}
            placeholder={t.mapGeoSearchPlaceholder}
            onChange={(event) => setText(event.target.value)}
            className="w-full rounded-xl border border-cdfe4da bg-cfbfcf9 px-4 py-3 text-sm"
          />
        </label>
        <button
          type="submit"
          disabled={busy}
          className="rounded-xl bg-c30442a px-4 py-3 text-sm font-bold text-white transition hover:bg-c253820 disabled:opacity-50"
        >
          {busy ? t.mapGeoSearching : t.mapGeoSearchButton}
        </button>
      </form>
      {error ? (
        <p role="alert" className="mt-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}
      {results && results.length === 0 ? (
        <p role="status" className="mt-2 text-sm text-c5b6257">
          {t.mapGeoNoResults}
        </p>
      ) : null}
      {results && results.length > 0 ? (
        <ul className="mt-2 grid gap-1">
          {results.map((result) => (
            <li key={`${result.latitude},${result.longitude},${result.display_name}`}>
              <button
                type="button"
                onClick={() => onPick(result)}
                className="w-full rounded-xl border border-ce3e5dc bg-white px-3 py-2 text-left text-sm hover:bg-cf3f5ef"
              >
                {result.display_name}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
