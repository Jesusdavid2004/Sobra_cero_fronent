"use client";

import { useCallback, useEffect, useState } from "react";

import LotTimeline from "@/components/LotTimeline";
import ScenarioSimulator from "@/components/ScenarioSimulator";
import { api, ApiError, type RescuePlan } from "@/lib/api";

export type RescueLot = { lotId: number; name: string };

type Props = {
  shopId: number;
  lots: RescueLot[];
  t: Record<string, string>;
  locale: string;
};

const ACTION_STYLES: Record<RescuePlan["action"], string> = {
  keep_offer: "bg-ce6efd8 text-c3c5a2c",
  apply_discount_rule: "bg-cfde8c8 text-c8a4b0f",
  prepare_donation_offer: "bg-cf5dcec text-c8a2f64",
  insufficient_history: "bg-cecebe4 text-c5b6257",
};

const STATUS_KEYS: Record<RescuePlan["status"], string> = {
  pending_approval: "rescueStatusPending",
  approved: "rescueStatusApproved",
  rejected: "rescueStatusRejected",
  superseded: "rescueStatusSuperseded",
  not_actionable: "rescueStatusNotActionable",
};

const ACTION_KEYS: Record<RescuePlan["action"], string> = {
  keep_offer: "rescueActionKeep",
  apply_discount_rule: "rescueActionDiscount",
  prepare_donation_offer: "rescueActionDonation",
  insufficient_history: "rescueActionInsufficient",
};

const VISIBLE_STATUSES: RescuePlan["status"][] = ["pending_approval", "approved", "not_actionable"];

const GENERIC_ERROR_KEY = "genericError";
const SECONDARY_BUTTON =
  "rounded-full border border-c30442a/40 px-4 py-1.5 text-xs font-bold text-c30442a hover:bg-cf0f3ec disabled:opacity-60";

function errorKeyFor(cause: unknown, t: Record<string, string>): string {
  const key = cause instanceof ApiError && cause.code ? `rescueError_${cause.code}` : "";
  return key && t[key] ? key : GENERIC_ERROR_KEY;
}

export default function RescuePlanPanel({ shopId, lots, t, locale }: Props) {
  const [plans, setPlans] = useState<RescuePlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const [explanations, setExplanations] = useState<Record<number, string>>({});
  const [simulatingPlanId, setSimulatingPlanId] = useState<number | null>(null);
  const [timelinePlanId, setTimelinePlanId] = useState<number | null>(null);
  const number = new Intl.NumberFormat(locale === "es" ? "es-CO" : "en-US", {
    maximumFractionDigits: 1,
  });

  const lotName = (lotId: number) => lots.find((lot) => lot.lotId === lotId)?.name ?? `#${lotId}`;

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setPlans(await api.rescuePlans(shopId));
      setErrorKey(null);
    } catch (cause) {
      setErrorKey(errorKeyFor(cause, t));
    } finally {
      setLoading(false);
    }
  }, [shopId, t]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const run = async (key: string, action: () => Promise<unknown>) => {
    setBusyKey(key);
    setErrorKey(null);
    try {
      await action();
      await refresh();
    } catch (cause) {
      setErrorKey(errorKeyFor(cause, t));
    } finally {
      setBusyKey(null);
    }
  };

  const explain = async (planId: number) => {
    setBusyKey(`ex-${planId}`);
    setErrorKey(null);
    try {
      const result = await api.explainRescuePlan(planId, locale);
      setExplanations((current) => ({ ...current, [planId]: result.text }));
    } catch (cause) {
      setErrorKey(errorKeyFor(cause, t));
    } finally {
      setBusyKey(null);
    }
  };

  const visible = plans.filter((plan) => VISIBLE_STATUSES.includes(plan.status));

  return (
    <section
      aria-labelledby="rescue-title"
      className="mt-6 rounded-[28px] border-2 border-c30442a/15 bg-cfbfaf3 p-5 md:p-7"
    >
      <p className="text-sm font-bold uppercase tracking-[0.12em] text-c66804f">
        {t.rescueEyebrow}
      </p>
      <h2 id="rescue-title" className="mt-1 text-2xl font-black">
        {t.rescueTitle}
      </h2>
      <p className="mt-1 max-w-2xl text-sm text-c5b6257">{t.rescueDescription}</p>

      {lots.length ? (
        <div className="mt-5 flex flex-wrap gap-2" role="group" aria-label={t.rescueAnalyzeLot}>
          {lots.map((lot) => (
            <button
              key={lot.lotId}
              type="button"
              disabled={busyKey !== null}
              onClick={() => run(`gen-${lot.lotId}`, () => api.generateRescuePlan(lot.lotId))}
              className="rounded-full border-2 border-c30442a bg-cc7e49d px-4 py-2 text-sm font-bold text-c1f2a1f transition hover:-translate-y-0.5 hover:bg-cd4ecb0 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {busyKey === `gen-${lot.lotId}`
                ? t.rescueAnalyzing
                : `${t.rescueAnalyzeLot}: ${lot.name}`}
            </button>
          ))}
        </div>
      ) : null}

      {errorKey ? (
        <p role="alert" className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {t[errorKey]}
        </p>
      ) : null}

      {loading ? (
        <p className="py-8 text-center text-c5b6257" role="status">
          {t.rescueLoading}
        </p>
      ) : visible.length ? (
        <ul className="mt-5 grid gap-4 lg:grid-cols-2">
          {visible.map((plan) => {
            const expected = plan.expected_sales ?? 0;
            const surplus = plan.surplus_units ?? 0;
            const total = Math.max(plan.available_quantity, 1);
            const soldShare = Math.min(100, (Math.min(expected, total) / total) * 100);
            return (
              <li
                key={plan.id}
                className="flex flex-col rounded-3xl border border-ce2e5d9 bg-white p-5 shadow-[0_4px_0_#e2e5d9]"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-lg font-black">{lotName(plan.lot_id)}</h3>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-bold ${ACTION_STYLES[plan.action]}`}
                  >
                    {t[ACTION_KEYS[plan.action]]}
                  </span>
                </div>
                <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-c788475">
                  {t[STATUS_KEYS[plan.status]]}
                </p>

                {plan.expected_sales !== null ? (
                  <div className="mt-4">
                    <div
                      className="flex h-3 overflow-hidden rounded-full bg-cf4c58a"
                      role="img"
                      aria-label={t.rescueBarLabel
                        .replace("{expected}", number.format(expected))
                        .replace("{surplus}", number.format(surplus))}
                    >
                      <div className="bg-c5a803f" style={{ width: `${soldShare}%` }} />
                    </div>
                    <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
                      <div className="rounded-2xl bg-cf6f8f3 p-2">
                        <dt className="text-[11px] text-c788475">{t.rescueAvailable}</dt>
                        <dd className="text-lg font-black">{plan.available_quantity}</dd>
                      </div>
                      <div className="rounded-2xl bg-ce6efd8 p-2">
                        <dt className="text-[11px] text-c788475">{t.rescueExpectedSales}</dt>
                        <dd className="text-lg font-black">{number.format(expected)}</dd>
                      </div>
                      <div className="rounded-2xl bg-cfde8c8 p-2">
                        <dt className="text-[11px] text-c788475">{t.rescueSurplus}</dt>
                        <dd className="text-lg font-black">{number.format(surplus)}</dd>
                      </div>
                    </dl>
                  </div>
                ) : null}

                {plan.proposed_discount_percent !== null ? (
                  <p className="mt-3 text-sm font-bold text-c8a4b0f">
                    {t.rescueProposedDiscount.replace(
                      "{percent}",
                      String(plan.proposed_discount_percent),
                    )}
                  </p>
                ) : null}

                <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-c465044">
                  {plan.reasons.map((reason) => (
                    <li key={reason}>{t[`rescueReason_${reason}`] ?? reason}</li>
                  ))}
                </ul>

                <div className="mt-3 flex flex-wrap gap-2">
                  {!explanations[plan.id] && plan.status !== "not_actionable" ? (
                    <button
                      type="button"
                      disabled={busyKey !== null}
                      onClick={() => explain(plan.id)}
                      className={SECONDARY_BUTTON}
                    >
                      {busyKey === `ex-${plan.id}` ? t.rescueExplaining : t.rescueExplain}
                    </button>
                  ) : null}
                  {plan.expected_sales !== null ? (
                    <button
                      type="button"
                      aria-expanded={simulatingPlanId === plan.id}
                      onClick={() =>
                        setSimulatingPlanId(simulatingPlanId === plan.id ? null : plan.id)
                      }
                      className={SECONDARY_BUTTON}
                    >
                      {simulatingPlanId === plan.id ? t.simHide : t.simCompare}
                    </button>
                  ) : null}
                  <button
                    type="button"
                    aria-expanded={timelinePlanId === plan.id}
                    onClick={() => setTimelinePlanId(timelinePlanId === plan.id ? null : plan.id)}
                    className={SECONDARY_BUTTON}
                  >
                    {timelinePlanId === plan.id ? t.timelineHide : t.timelineShow}
                  </button>
                </div>

                {explanations[plan.id] ? (
                  <p className="mt-3 rounded-2xl bg-ceef5e1 px-4 py-3 text-sm text-c2f4a22">
                    <span className="mr-2 rounded-full bg-c30442a px-2 py-0.5 text-[10px] font-bold uppercase text-white">
                      {t.rescueAiBadge}
                    </span>
                    {explanations[plan.id]}
                  </p>
                ) : null}
                {simulatingPlanId === plan.id ? (
                  <ScenarioSimulator
                    planId={plan.id}
                    availableQuantity={plan.available_quantity}
                    defaultDonationUnits={Math.floor(plan.surplus_units ?? 0)}
                    t={t}
                    locale={locale}
                  />
                ) : null}
                {timelinePlanId === plan.id ? (
                  <LotTimeline lotId={plan.lot_id} t={t} locale={locale} />
                ) : null}

                <p className="mt-3 text-xs text-c788475">
                  {t.rescueMeta
                    .replace("{points}", String(plan.data_points))
                    .replace("{hours}", number.format(plan.horizon_hours))
                    .replace("{version}", plan.rule_version)}
                </p>

                {plan.status === "pending_approval" ? (
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={busyKey !== null}
                      onClick={() => run(`ok-${plan.id}`, () => api.approveRescuePlan(plan.id))}
                      className="rounded-full bg-c30442a px-5 py-2.5 text-sm font-bold text-white shadow-[0_4px_0_#1e2d1a] transition hover:bg-c253820 disabled:opacity-60"
                    >
                      {t.rescueApprove}
                    </button>
                    <button
                      type="button"
                      disabled={busyKey !== null}
                      onClick={() => run(`no-${plan.id}`, () => api.rejectRescuePlan(plan.id))}
                      className="rounded-full border-2 border-c30442a px-5 py-2.5 text-sm font-bold text-c30442a transition hover:bg-cf0f3ec disabled:opacity-60"
                    >
                      {t.rescueReject}
                    </button>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="py-8 text-center text-c5b6257">{t.rescueEmpty}</p>
      )}

      <p className="mt-5 rounded-2xl bg-cf0f3ec px-4 py-3 text-xs text-c5b6257">
        {t.rescueDisclaimer}
      </p>
    </section>
  );
}
