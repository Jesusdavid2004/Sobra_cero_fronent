"use client";

import { useState } from "react";

import { api } from "@/lib/api";
import { fill, formatDateTime } from "@/lib/format";
import { scannerErrorMessage } from "@/lib/scanner";
import type { DiscoveredBusiness } from "@/lib/scanner-schemas";

type Props = {
  businesses: DiscoveredBusiness[];
  t: Record<string, string>;
  locale: string;
  onChanged: () => void;
};

const BUTTON =
  "rounded-xl border border-ccfdac6 bg-cf4f7f1 px-3 py-1.5 text-xs font-bold text-c30442a transition hover:bg-ce9f1e1 disabled:opacity-50";

export default function BusinessesTable({ businesses, t, locale, onChanged }: Props) {
  const [busy, setBusy] = useState<number | null>(null);
  const [error, setError] = useState("");

  const decide = async (id: number, status: "verified" | "rejected") => {
    setBusy(id);
    setError("");
    try {
      await api.verifyBusiness(id, status);
      onChanged();
    } catch (cause) {
      setError(scannerErrorMessage(t, cause));
    } finally {
      setBusy(null);
    }
  };

  if (businesses.length === 0) {
    return <p className="rounded-2xl bg-cf0f3ec px-4 py-3 text-sm">{t.scannerBusinessesEmpty}</p>;
  }

  return (
    <div>
      {error ? (
        <p role="alert" className="mb-3 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      ) : null}
      <ul aria-label={t.scannerBusinessesTitle} className="grid gap-3">
        {businesses.map((business) => (
          <li key={business.id} className="rounded-2xl border border-ce3e5dc bg-white p-4 text-sm">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-bold">{business.name}</p>
                <p className="text-xs text-c5b6257">
                  {t[`mapCategory_${business.category}`] ?? business.category} ·{" "}
                  {business.source_key}
                </p>
                {business.address ? <p className="text-xs">{business.address}</p> : null}
              </div>
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full border border-dashed border-c627158 bg-cf3f5ef px-3 py-1 text-xs font-bold">
                  {t.scannerNotAffiliated}
                </span>
                <span className="rounded-full bg-cf3f5ef px-3 py-1 text-xs font-bold">
                  {t[`scannerVerification_${business.verification_status}`]}
                </span>
                {business.is_demo ? (
                  <span className="rounded-full bg-cf5dcec px-3 py-1 text-xs font-bold text-c8a2f64">
                    {t.scannerDemoTag}
                  </span>
                ) : null}
              </div>
            </div>
            <p
              className={`mt-2 text-xs ${business.freshness === "stale" ? "font-bold text-c8a2f64" : "text-c5b6257"}`}
            >
              {fill(t.scannerLastSeen, { date: formatDateTime(business.last_seen_at, locale) })}
              {business.freshness === "stale" ? ` · ${t.scannerStale}` : ""}
            </p>
            {business.verification_status === "unverified" ? (
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  className={BUTTON}
                  disabled={busy === business.id}
                  onClick={() => decide(business.id, "verified")}
                >
                  {t.scannerVerify}
                </button>
                <button
                  type="button"
                  className={BUTTON}
                  disabled={busy === business.id}
                  onClick={() => decide(business.id, "rejected")}
                >
                  {t.scannerRejectBusiness}
                </button>
              </div>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
