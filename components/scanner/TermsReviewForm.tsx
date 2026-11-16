"use client";

import { useState } from "react";

import { api } from "@/lib/api";
import { scannerErrorMessage } from "@/lib/scanner";
import type { Source } from "@/lib/scanner-schemas";

type Props = {
  source: Source;
  t: Record<string, string>;
  onReviewed: (source: Source) => void;
};

const MIN_NOTE_CHARACTERS = 10;
const FIELD = "w-full rounded-xl border border-cdfe4da bg-cfbfcf9 px-4 py-3 text-sm";

/** A person states what they checked. Without this record a source can be neither enabled nor run. */
export default function TermsReviewForm({ source, t, onReviewed }: Props) {
  const [note, setNote] = useState(source.terms_note);
  const [license, setLicense] = useState(source.license_note);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      onReviewed(await api.reviewSourceTerms(source.key, note.trim(), license.trim()));
    } catch (cause) {
      setError(scannerErrorMessage(t, cause));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="mt-3 rounded-2xl bg-cf0f3ec p-4">
      <h4 className="text-sm font-black">{t.scannerReviewTitle}</h4>
      <p className="mt-1 text-xs text-c5b6257">{t.scannerReviewHint}</p>
      <label className="mt-3 block text-sm font-semibold">
        <span className="mb-1 block">{t.scannerReviewNote}</span>
        <textarea
          required
          rows={3}
          minLength={MIN_NOTE_CHARACTERS}
          maxLength={1000}
          value={note}
          onChange={(event) => setNote(event.target.value)}
          className={FIELD}
        />
      </label>
      <label className="mt-3 block text-sm font-semibold">
        <span className="mb-1 block">{t.scannerReviewLicense}</span>
        <input
          maxLength={1000}
          value={license}
          onChange={(event) => setLicense(event.target.value)}
          className={FIELD}
        />
      </label>
      <button
        type="submit"
        disabled={busy || note.trim().length < MIN_NOTE_CHARACTERS}
        className="mt-3 rounded-xl bg-c30442a px-4 py-2.5 text-sm font-bold text-white transition hover:bg-c253820 disabled:opacity-50"
      >
        {t.scannerReviewConfirm}
      </button>
      {error ? (
        <p role="alert" className="mt-3 text-sm text-red-700">
          {error}
        </p>
      ) : null}
    </form>
  );
}
