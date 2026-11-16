"use client";

import { useState } from "react";

import { api } from "@/lib/api";
import { scannerErrorMessage } from "@/lib/scanner";
import { SOURCE_KINDS, type Source } from "@/lib/scanner-schemas";

type Props = { t: Record<string, string>; onCreated: (source: Source) => void };

const FIELD = "w-full rounded-xl border border-cdfe4da bg-cfbfcf9 px-4 py-3 text-sm";
const EMPTY = { key: "", name: "", kind: SOURCE_KINDS[0], base_url: "", license_note: "" };

export default function SourceForm({ t, onCreated }: Props) {
  const [form, setForm] = useState<{
    key: string;
    name: string;
    kind: (typeof SOURCE_KINDS)[number];
    base_url: string;
    license_note: string;
  }>(EMPTY);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const source = await api.registerSource(form);
      setForm(EMPTY);
      onCreated(source);
    } catch (cause) {
      setError(scannerErrorMessage(t, cause));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form
      onSubmit={submit}
      aria-labelledby="source-form-title"
      className="rounded-3xl border border-ce3e5dc bg-white p-5"
    >
      <h3 id="source-form-title" className="text-lg font-black">
        {t.scannerSourceFormTitle}
      </h3>
      <p className="mt-1 text-xs text-c5b6257">{t.scannerSourceHint}</p>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <label className="text-sm font-semibold">
          <span className="mb-1 block">{t.scannerSourceKey}</span>
          <input
            required
            pattern="[a-z0-9][a-z0-9\-]{1,58}"
            value={form.key}
            onChange={(event) => setForm({ ...form, key: event.target.value })}
            className={FIELD}
          />
        </label>
        <label className="text-sm font-semibold">
          <span className="mb-1 block">{t.scannerSourceName}</span>
          <input
            required
            minLength={2}
            maxLength={160}
            value={form.name}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
            className={FIELD}
          />
        </label>
        <label className="text-sm font-semibold">
          <span className="mb-1 block">{t.scannerSourceKind}</span>
          <select
            value={form.kind}
            onChange={(event) =>
              setForm({ ...form, kind: event.target.value as (typeof SOURCE_KINDS)[number] })
            }
            className={FIELD}
          >
            {SOURCE_KINDS.map((kind) => (
              <option key={kind} value={kind}>
                {t[`scannerKind_${kind}`]}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-semibold">
          <span className="mb-1 block">{t.scannerSourceUrl}</span>
          <input
            required
            type="url"
            value={form.base_url}
            onChange={(event) => setForm({ ...form, base_url: event.target.value })}
            className={FIELD}
          />
        </label>
        <label className="text-sm font-semibold md:col-span-2">
          <span className="mb-1 block">{t.scannerSourceLicense}</span>
          <input
            maxLength={1000}
            value={form.license_note}
            onChange={(event) => setForm({ ...form, license_note: event.target.value })}
            className={FIELD}
          />
        </label>
      </div>
      <button
        type="submit"
        disabled={busy}
        className="mt-4 rounded-xl bg-c30442a px-5 py-3 text-sm font-bold text-white transition hover:bg-c253820 disabled:opacity-50"
      >
        {t.scannerSourceSave}
      </button>
      {error ? (
        <p role="alert" className="mt-3 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      ) : null}
    </form>
  );
}
