"use client";

import { useCallback, useEffect, useState } from "react";

import { api } from "@/lib/api";
import type { Diagnosis } from "@/lib/inventory-schemas";

type Props = {
  shopId: number;
  /** Changes when something that affects the numbers happened, such as recorded waste. */
  revision: number;
  t: Record<string, string>;
  locale: string;
};

const FACT_KEYS = [
  "active_lots",
  "units_available",
  "lots_expiring_soon",
  "units_expiring_soon",
  "units_closing_soon",
  "picked_up_units",
  "delivered_donation_units",
  "cancelled_units",
  "wasted_units",
  "pending_pickup_units",
] as const;

export default function DiagnosisPanel({ shopId, revision, t, locale }: Props) {
  const [diagnosis, setDiagnosis] = useState<Diagnosis | null>(null);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const number = new Intl.NumberFormat(locale === "es" ? "es-CO" : "en-US");

  const load = useCallback(async () => {
    setBusy(true);
    setFailed(false);
    try {
      setDiagnosis(await api.shopDiagnosis(shopId, locale));
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }, [shopId, locale]);

  useEffect(() => {
    void load();
  }, [load, revision]);

  return (
    <section
      aria-labelledby="diagnosis-title"
      className="mt-6 rounded-3xl border border-ce0e5da bg-white p-5 md:p-7"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="diagnosis-title" className="text-xl font-black">
            {t.diagnosisTitle}
          </h2>
          <p className="mt-1 max-w-3xl text-sm text-stone-600">{t.diagnosisIntro}</p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={busy}
          className="rounded-xl border border-ccfdac6 bg-cf4f7f1 px-4 py-2 text-sm font-bold text-c30442a disabled:opacity-50"
        >
          {t.diagnosisRefresh}
        </button>
      </div>

      {failed ? (
        <p role="alert" className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {t.diagnosisError}
        </p>
      ) : null}
      {diagnosis === null && !failed ? (
        <p role="status" className="mt-4 text-sm text-stone-600">
          {t.diagnosisLoading}
        </p>
      ) : null}

      {diagnosis ? (
        <div className="mt-5 grid gap-5">
          <div>
            <h3 className="text-sm font-black">{t.diagnosisAlertsTitle}</h3>
            {diagnosis.alerts.length === 0 ? (
              <p className="mt-2 text-sm">{t.diagnosisNoAlerts}</p>
            ) : (
              <ul className="mt-2 grid gap-2">
                {diagnosis.alerts.map((code) => (
                  <li
                    key={code}
                    className="rounded-xl bg-cf5dcec px-4 py-2 text-sm font-semibold text-c8a2f64"
                  >
                    {t[`diagnosisAlert_${code}`] ?? code}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-2xl bg-cf0f3ec p-4">
            <h3 className="text-sm font-black">{t.diagnosisNarrativeTitle}</h3>
            {diagnosis.narrative ? (
              <p className="mt-2 text-sm">
                <span className="mr-2 rounded-full bg-c30442a px-2 py-0.5 text-[10px] font-bold uppercase text-white">
                  {t.rescueAiBadge}
                </span>
                {diagnosis.narrative}
              </p>
            ) : (
              <p role="note" className="mt-2 text-sm">
                {t[`diagnosisNarrative_${diagnosis.narrative_status}`]}
              </p>
            )}
            <p className="mt-2 text-xs text-c5b6257">{t.diagnosisNarrativeNote}</p>
          </div>

          <div>
            <h3 className="text-sm font-black">{t.diagnosisFactsTitle}</h3>
            <dl className="mt-2 grid grid-cols-2 gap-3 md:grid-cols-5">
              {FACT_KEYS.map((key) => (
                <div key={key} className="rounded-2xl border border-ce3e5dc p-3">
                  <dt className="text-xs text-c5b6257">{t[`diagnosisFact_${key}`]}</dt>
                  <dd className="mt-1 text-xl font-black">{number.format(diagnosis.facts[key])}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div>
            <h3 className="text-sm font-black">{t.diagnosisLimitationsTitle}</h3>
            <ul className="mt-2 grid gap-1 text-sm text-stone-600">
              {diagnosis.limitations.map((code) => (
                <li key={code}>{t[`diagnosisLimitation_${code}`] ?? code}</li>
              ))}
            </ul>
          </div>

          <p className="text-xs text-c5b6257">
            {t.diagnosisSourcesTitle}:{" "}
            {diagnosis.data_used
              .map((source) => t[`diagnosisSource_${source}`] ?? source)
              .join(", ")}
          </p>
        </div>
      ) : null}
    </section>
  );
}
