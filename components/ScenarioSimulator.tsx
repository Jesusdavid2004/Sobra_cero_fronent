"use client";

import { useEffect, useState } from "react";

import { api, ApiError, type Simulation } from "@/lib/api";

type Props = {
  planId: number;
  availableQuantity: number;
  defaultDonationUnits: number;
  t: Record<string, string>;
  locale: string;
};

const DEBOUNCE_MS = 300;
const UPLIFT_STEP = 5;
const UPLIFT_MAX = 100;
const CENTS_PER_UNIT = 100;
const GENERIC_ERROR_KEY = "genericError";

const SCENARIO_TITLES = {
  keep_offer: "simKeep",
  apply_discount: "simDiscount",
  separate_donation: "simDonate",
} as const;

function errorKey(cause: unknown, t: Record<string, string>): string {
  const key = cause instanceof ApiError && cause.code ? `rescueError_${cause.code}` : "";
  return key && t[key] ? key : GENERIC_ERROR_KEY;
}

export default function ScenarioSimulator({
  planId,
  availableQuantity,
  defaultDonationUnits,
  t,
  locale,
}: Props) {
  const [uplift, setUplift] = useState(0);
  const [donation, setDonation] = useState(defaultDonationUnits);
  const [result, setResult] = useState<Simulation | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const intl = locale === "es" ? "es-CO" : "en-US";
  const number = new Intl.NumberFormat(intl, { maximumFractionDigits: 1 });
  const money = new Intl.NumberFormat(intl, { style: "currency", currency: "USD" });

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(() => {
      api
        .simulateRescuePlan(planId, { demandUpliftPercent: uplift, donationUnits: donation })
        .then((simulation) => {
          if (cancelled) return;
          setResult(simulation);
          setFailure(null);
        })
        .catch((cause: unknown) => {
          if (!cancelled) setFailure(errorKey(cause, t));
        });
    }, DEBOUNCE_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [planId, uplift, donation, t]);

  const title = (kind: keyof typeof SCENARIO_TITLES, discount: number, donated: number) =>
    t[SCENARIO_TITLES[kind]]
      .replace("{percent}", String(discount))
      .replace("{units}", String(donated));

  return (
    <div className="mt-4 rounded-3xl border border-dashed border-c30442a/40 bg-white p-4">
      <p className="rounded-2xl bg-cfff7df px-3 py-2 text-xs font-semibold text-c87620c">
        {t.simHypothetical}
      </p>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-bold">
          {t.simUplift.replace("{percent}", String(uplift))}
          <input
            type="range"
            min={0}
            max={UPLIFT_MAX}
            step={UPLIFT_STEP}
            value={uplift}
            onChange={(event) => setUplift(Number(event.target.value))}
            className="mt-2 w-full accent-c5a803f"
          />
        </label>
        <label className="block text-sm font-bold">
          {t.simDonation}
          <input
            type="number"
            min={0}
            max={availableQuantity}
            value={donation}
            onChange={(event) =>
              setDonation(Math.min(availableQuantity, Math.max(0, Number(event.target.value) || 0)))
            }
            className="mt-2 w-full rounded-xl border border-stone-300 px-3 py-2"
          />
        </label>
      </div>

      {failure ? (
        <p role="alert" className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
          {t[failure]}
        </p>
      ) : null}

      {result ? (
        <>
          {result.stale ? (
            <p className="mt-3 rounded-xl bg-cfff0e8 px-3 py-2 text-xs text-ca84d2c">
              {t.simStale}
            </p>
          ) : null}
          <ul className="mt-4 grid gap-3 md:grid-cols-3">
            {result.scenarios.map((scenario) => {
              const stock = scenario.expected_sales + scenario.surplus_units;
              const soldShare = stock === 0 ? 0 : (scenario.expected_sales / stock) * 100;
              return (
                <li key={scenario.kind} className="rounded-2xl bg-cf6f8f3 p-4">
                  <h4 className="text-sm font-black">
                    {title(scenario.kind, scenario.discount_percent, scenario.donated_units)}
                  </h4>
                  <div
                    role="img"
                    aria-label={`${t.simExpectedSales}: ${number.format(scenario.expected_sales)}, ${t.simSurplus}: ${number.format(scenario.surplus_units)}`}
                    className="mt-3 flex h-2 overflow-hidden rounded-full bg-cf4c58a"
                  >
                    <div className="bg-c5a803f" style={{ width: `${soldShare}%` }} />
                  </div>
                  <dl className="mt-3 space-y-1 text-sm">
                    <div className="flex justify-between gap-2">
                      <dt className="text-c5b6257">{t.simExpectedSales}</dt>
                      <dd className="font-bold">{number.format(scenario.expected_sales)}</dd>
                    </div>
                    <div className="flex justify-between gap-2">
                      <dt className="text-c5b6257">{t.simSurplus}</dt>
                      <dd className="font-bold">{number.format(scenario.surplus_units)}</dd>
                    </div>
                    <div className="flex justify-between gap-2">
                      <dt className="text-c5b6257">{t.simRevenue}</dt>
                      <dd className="font-bold">
                        {money.format(scenario.estimated_revenue_cents / CENTS_PER_UNIT)}
                      </dd>
                    </div>
                  </dl>
                </li>
              );
            })}
          </ul>
        </>
      ) : null}
    </div>
  );
}
