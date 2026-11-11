"use client";

import { useEffect, useState } from "react";

import { api, type ShopImpact } from "@/lib/api";

type Props = {
  shopId: number;
  /** Changes whenever something that affects the numbers happened, such as a confirmed pickup. */
  revision: number;
  t: Record<string, string>;
  locale: string;
};

type Segment = { key: keyof ShopImpact; labelKey: string; barClass: string };

const CENTS_PER_UNIT = 100;

const SEGMENTS: Segment[] = [
  { key: "picked_up_units", labelKey: "impactPickedUp", barClass: "bg-c5a803f" },
  { key: "donated_units", labelKey: "impactDonated", barClass: "bg-c5e568d" },
  { key: "pending_units", labelKey: "impactPending", barClass: "bg-cf4c58a" },
  { key: "cancelled_units", labelKey: "impactCancelled", barClass: "bg-stone-300" },
  { key: "expired_units", labelKey: "impactExpired", barClass: "bg-stone-400" },
];

export default function ImpactPanel({ shopId, revision, t, locale }: Props) {
  const [impact, setImpact] = useState<ShopImpact | null>(null);
  const [failed, setFailed] = useState(false);
  const intl = locale === "es" ? "es-CO" : "en-US";
  const number = new Intl.NumberFormat(intl);
  const money = new Intl.NumberFormat(intl, { style: "currency", currency: "USD" });

  useEffect(() => {
    let cancelled = false;
    api
      .shopImpact(shopId)
      .then((result) => {
        if (cancelled) return;
        setImpact(result);
        setFailed(false);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [shopId, revision]);

  const total = impact ? SEGMENTS.reduce((sum, segment) => sum + impact[segment.key], 0) : 0;
  const summary = impact
    ? SEGMENTS.map((segment) => `${t[segment.labelKey]}: ${impact[segment.key]}`).join(", ")
    : "";

  return (
    <section
      aria-labelledby="impact-title"
      className="mt-6 rounded-[28px] border-2 border-c30442a/15 bg-cfbfaf3 p-5 md:p-7"
    >
      <p className="text-sm font-bold uppercase tracking-[0.12em] text-c66804f">
        {t.impactEyebrow}
      </p>
      <h2 id="impact-title" className="mt-1 text-2xl font-black">
        {t.impactTitle}
      </h2>
      <p className="mt-1 max-w-2xl text-sm text-c5b6257">{t.impactDescription}</p>

      {failed ? (
        <p role="alert" className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {t.impactError}
        </p>
      ) : null}

      {impact && total === 0 ? (
        <p className="py-8 text-center text-c5b6257">{t.impactEmpty}</p>
      ) : null}

      {impact && total > 0 ? (
        <>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-3xl bg-ce6efd8 p-5 sm:col-span-1">
              <p className="text-xs font-bold uppercase text-c5b6257">{t.impactPickedUp}</p>
              <p className="mt-1 text-5xl font-black text-c365d2f">
                {number.format(impact.picked_up_units)}
              </p>
              <p className="mt-1 text-xs text-c5b6257">
                {t.impactUnits.replace("{count}", String(impact.picked_up_units))}
              </p>
            </div>
            <div className="rounded-3xl bg-cf6f8f3 p-5">
              <p className="text-xs font-bold uppercase text-c5b6257">{t.impactRevenue}</p>
              <p className="mt-1 text-3xl font-black">
                {money.format(impact.estimated_revenue_cents / CENTS_PER_UNIT)}
              </p>
            </div>
            <div className="rounded-3xl bg-cfde8c8 p-5">
              <p className="text-xs font-bold uppercase text-c5b6257">{t.impactSavings}</p>
              <p className="mt-1 text-3xl font-black">
                {money.format(impact.estimated_savings_cents / CENTS_PER_UNIT)}
              </p>
            </div>
          </div>

          <div
            role="img"
            aria-label={`${t.impactBarLabel}: ${summary}`}
            className="mt-5 flex h-3 overflow-hidden rounded-full bg-stone-200"
          >
            {SEGMENTS.map((segment) => (
              <div
                key={segment.key}
                className={segment.barClass}
                style={{ width: `${(impact[segment.key] / total) * 100}%` }}
              />
            ))}
          </div>
          <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm">
            {SEGMENTS.map((segment) => (
              <li key={segment.key} className="flex items-center gap-2">
                <span aria-hidden="true" className={`h-3 w-3 rounded-full ${segment.barClass}`} />
                <span className="text-c5b6257">{t[segment.labelKey]}</span>
                <span className="font-bold">{number.format(impact[segment.key])}</span>
              </li>
            ))}
          </ul>
        </>
      ) : null}

      <p className="mt-5 rounded-2xl bg-cf0f3ec px-4 py-3 text-xs text-c5b6257">{t.impactNote}</p>
    </section>
  );
}
