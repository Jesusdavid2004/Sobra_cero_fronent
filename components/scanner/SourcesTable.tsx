"use client";

import { useState } from "react";

import TermsReviewForm from "@/components/scanner/TermsReviewForm";
import { api } from "@/lib/api";
import { fill, formatDateTime } from "@/lib/format";
import {
  canRun,
  SCHEDULE_OPTIONS,
  scannerErrorMessage,
  scheduleKey,
  statusKey,
  stopReasonKey,
} from "@/lib/scanner";
import type { RunResult, Source } from "@/lib/scanner-schemas";

type Props = {
  sources: Source[];
  t: Record<string, string>;
  locale: string;
  onChange: (source: Source) => void;
  onRan: (result: RunResult) => void;
};

const BUTTON =
  "rounded-xl border border-ccfdac6 bg-cf4f7f1 px-3 py-2 text-sm font-bold text-c30442a transition hover:bg-ce9f1e1 disabled:opacity-50";
const BADGE = "rounded-full px-3 py-1 text-xs font-bold";

export default function SourcesTable({ sources, t, locale, onChange, onRan }: Props) {
  const [busy, setBusy] = useState<string | null>(null);
  const [reviewing, setReviewing] = useState<string | null>(null);
  const [message, setMessage] = useState<{ key: string; text: string; error: boolean } | null>(
    null,
  );

  const act = async (key: string, action: () => Promise<void>) => {
    setBusy(key);
    setMessage(null);
    try {
      await action();
    } catch (cause) {
      setMessage({ key, text: scannerErrorMessage(t, cause), error: true });
    } finally {
      setBusy(null);
    }
  };

  const run = (source: Source) =>
    act(source.key, async () => {
      const result = await api.runSource(source.key);
      onRan(result);
      const text =
        result.status === "succeeded"
          ? fill(t.scannerRunResult, {
              accepted: result.accepted,
              rejected: result.rejected,
              pending: result.pending,
            })
          : (t[stopReasonKey(result.stop_reason)] ?? result.error);
      setMessage({ key: source.key, text, error: result.status !== "succeeded" });
    });

  if (sources.length === 0) {
    return <p className="rounded-2xl bg-cf0f3ec px-4 py-3 text-sm">{t.scannerNoSources}</p>;
  }

  return (
    <ul className="grid gap-4">
      {sources.map((source) => (
        <li key={source.key} className="rounded-3xl border border-ce3e5dc bg-white p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="text-lg font-black">{source.name}</h3>
              <p className="text-xs text-c5b6257">
                {t[`scannerKind_${source.kind}`] ?? source.kind} · {source.key}
              </p>
              <p className="mt-1 break-all text-xs">{source.base_url}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <span
                className={`${BADGE} ${source.enabled ? "bg-ceaf4dd text-c426431" : "bg-cf3f5ef text-c5b6257"}`}
              >
                {source.enabled ? t.scannerEnabled : t.scannerDisabled}
              </span>
              <span
                className={`${BADGE} ${source.terms_reviewed ? "bg-ceaf4dd text-c426431" : "bg-cf5dcec text-c8a2f64"}`}
              >
                {source.terms_reviewed ? t.scannerTermsReviewed : t.scannerTermsPending}
              </span>
            </div>
          </div>

          <p className="mt-3 text-sm">
            {source.last_run_at
              ? fill(t.scannerLastRun, { date: formatDateTime(source.last_run_at, locale) })
              : t.scannerNeverRun}
            {source.last_status
              ? ` · ${t[statusKey(source.last_status)] ?? source.last_status}`
              : ""}
          </p>
          {source.last_stop_reason ? (
            <p className="mt-1 text-xs text-c8a2f64">{t[stopReasonKey(source.last_stop_reason)]}</p>
          ) : null}

          <div className="mt-4 flex flex-wrap items-end gap-3">
            <button
              type="button"
              className={BUTTON}
              aria-expanded={reviewing === source.key}
              onClick={() => setReviewing(reviewing === source.key ? null : source.key)}
            >
              {t.scannerReviewOpen}
            </button>
            <button
              type="button"
              className={BUTTON}
              disabled={busy === source.key}
              onClick={() =>
                act(source.key, async () =>
                  onChange(await api.setSourceEnabled(source.key, !source.enabled)),
                )
              }
            >
              {source.enabled ? t.scannerDisable : t.scannerEnable}
            </button>
            <label className="text-xs font-semibold">
              <span className="mb-1 block">{t.scannerScheduleLabel}</span>
              <select
                value={source.schedule_minutes ?? ""}
                onChange={(event) =>
                  act(source.key, async () =>
                    onChange(
                      await api.setSourceSchedule(
                        source.key,
                        event.target.value === "" ? null : Number(event.target.value),
                      ),
                    ),
                  )
                }
                className="rounded-xl border border-cdfe4da bg-cfbfcf9 px-3 py-2 text-sm"
              >
                {SCHEDULE_OPTIONS.map((minutes) => (
                  <option key={String(minutes)} value={minutes ?? ""}>
                    {t[scheduleKey(minutes)]}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              disabled={!canRun(source) || busy === source.key}
              onClick={() => run(source)}
              className="rounded-xl bg-c30442a px-4 py-2 text-sm font-bold text-white transition hover:bg-c253820 disabled:opacity-50"
            >
              {busy === source.key ? t.scannerRunning : t.scannerRun}
            </button>
          </div>

          {reviewing === source.key ? (
            <TermsReviewForm
              source={source}
              t={t}
              onReviewed={(updated) => {
                onChange(updated);
                setReviewing(null);
              }}
            />
          ) : null}
          {message?.key === source.key ? (
            <p
              role={message.error ? "alert" : "status"}
              className={`mt-3 rounded-xl px-4 py-3 text-sm ${message.error ? "bg-red-50 text-red-700" : "bg-ceaf4dd text-c426431"}`}
            >
              {message.text}
            </p>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
