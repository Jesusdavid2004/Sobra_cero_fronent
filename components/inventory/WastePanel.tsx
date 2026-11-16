"use client";

import { useCallback, useEffect, useState } from "react";

import { ApiError, api } from "@/lib/api";
import { fill, formatDateTime } from "@/lib/format";
import { WASTE_REASONS, type WasteEntry, type WasteReason } from "@/lib/inventory-schemas";

type Props = {
  shopId: number;
  lots: { lotId: number; name: string }[];
  t: Record<string, string>;
  locale: string;
  onRecorded: () => void;
};

const FIELD = "w-full rounded-xl border border-cdfe4da bg-cfbfcf9 px-4 py-3 text-sm";
const MAX_NOTE_CHARS = 200;

function errorText(t: Record<string, string>, cause: unknown): string {
  if (cause instanceof ApiError && cause.reason) {
    return t[`wasteError_${cause.reason}`] ?? t.wasteErrorGeneric;
  }
  return t.wasteErrorGeneric;
}

/** Waste is only what the shop declares. This form records it and nothing estimates it. */
export default function WastePanel({ shopId, lots, t, locale, onRecorded }: Props) {
  const [entries, setEntries] = useState<WasteEntry[]>([]);
  const [lotId, setLotId] = useState(lots[0] ? String(lots[0].lotId) : "");
  const [quantity, setQuantity] = useState("1");
  const [reason, setReason] = useState<WasteReason>("unsold");
  const [note, setNote] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setEntries(await api.shopWaste(shopId));
    } catch {
      setEntries([]);
    }
  }, [shopId]);

  useEffect(() => {
    void load();
  }, [load]);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const result = await api.recordWaste(Number(lotId), {
        quantity: Number(quantity),
        reason,
        note: note.trim(),
      });
      setMessage(fill(t.wasteRecorded, { count: result.remaining_quantity }));
      setNote("");
      await load();
      onRecorded();
    } catch (cause) {
      setError(errorText(t, cause));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section
      aria-labelledby="waste-title"
      className="mt-6 rounded-3xl border border-ce0e5da bg-white p-5 md:p-7"
    >
      <h2 id="waste-title" className="text-xl font-black">
        {t.wasteTitle}
      </h2>
      <p className="mt-1 text-sm text-stone-600">{t.wasteHint}</p>

      {lots.length === 0 ? (
        <p className="mt-4 text-sm">{t.wasteNoLots}</p>
      ) : (
        <form onSubmit={submit} className="mt-4 grid gap-3 md:grid-cols-4">
          <label className="text-sm font-semibold md:col-span-2">
            <span className="mb-1 block">{t.wasteLot}</span>
            <select
              value={lotId}
              onChange={(event) => setLotId(event.target.value)}
              className={FIELD}
            >
              {lots.map((lot) => (
                <option key={lot.lotId} value={lot.lotId}>
                  {lot.name} (#{lot.lotId})
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-semibold">
            <span className="mb-1 block">{t.wasteQuantity}</span>
            <input
              type="number"
              min={1}
              required
              value={quantity}
              onChange={(event) => setQuantity(event.target.value)}
              className={FIELD}
            />
          </label>
          <label className="text-sm font-semibold">
            <span className="mb-1 block">{t.wasteReason}</span>
            <select
              value={reason}
              onChange={(event) => setReason(event.target.value as WasteReason)}
              className={FIELD}
            >
              {WASTE_REASONS.map((value) => (
                <option key={value} value={value}>
                  {t[`wasteReason_${value}`]}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-semibold md:col-span-3">
            <span className="mb-1 block">{t.wasteNote}</span>
            <input
              maxLength={MAX_NOTE_CHARS}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              className={FIELD}
            />
          </label>
          <div className="flex items-end">
            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-xl bg-c30442a px-4 py-3 text-sm font-bold text-white transition hover:bg-c253820 disabled:opacity-50"
            >
              {t.wasteSave}
            </button>
          </div>
        </form>
      )}

      {message ? (
        <p role="status" className="mt-3 rounded-xl bg-ceaf4dd px-4 py-3 text-sm text-c426431">
          {message}
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="mt-3 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <h3 className="mt-6 text-sm font-black">{t.wasteListTitle}</h3>
      {entries.length === 0 ? (
        <p className="mt-2 text-sm">{t.wasteEmpty}</p>
      ) : (
        <ul className="mt-2 grid gap-2 text-sm">
          {entries.map((entry) => (
            <li key={entry.id} className="rounded-xl border border-ce3e5dc px-4 py-2">
              <span className="font-bold">{entry.lot_title}</span>{" "}
              {fill(t.wasteEntryLine, {
                quantity: entry.quantity,
                reason: t[`wasteReason_${entry.reason}`] ?? entry.reason,
              })}
              {entry.note ? ` · ${entry.note}` : ""}
              <span className="block text-xs text-c5b6257">
                {formatDateTime(entry.created_at, locale)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
