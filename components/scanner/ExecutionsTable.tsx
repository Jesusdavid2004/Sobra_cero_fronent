"use client";

import { useState } from "react";

import RecordsPanel from "@/components/scanner/RecordsPanel";
import { formatDateTime } from "@/lib/format";
import { statusKey, stopReasonKey } from "@/lib/scanner";
import type { Execution } from "@/lib/scanner-schemas";

type Props = { executions: Execution[]; t: Record<string, string>; locale: string };

const STATUS_STYLE: Record<string, string> = {
  succeeded: "bg-ceaf4dd text-c426431",
  running: "bg-cf3f5ef text-c465044",
  stopped: "bg-cf5dcec text-c8a2f64",
  failed: "bg-red-100 text-red-800",
};

export default function ExecutionsTable({ executions, t, locale }: Props) {
  const [open, setOpen] = useState<number | null>(null);

  if (executions.length === 0) {
    return <p className="rounded-2xl bg-cf0f3ec px-4 py-3 text-sm">{t.scannerNoRuns}</p>;
  }

  return (
    <ul aria-label={t.scannerRunsTitle} className="grid gap-3">
      {executions.map((execution) => (
        <li key={execution.id} className="rounded-2xl border border-ce3e5dc bg-white p-4 text-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-bold">
              {execution.source_key}{" "}
              <span className="font-normal text-c5b6257">
                · {t[`scannerTrigger_${execution.trigger}`] ?? execution.trigger}
              </span>
            </p>
            <span
              className={`rounded-full px-3 py-1 text-xs font-bold ${STATUS_STYLE[execution.status] ?? "bg-cf3f5ef"}`}
            >
              {t[statusKey(execution.status)] ?? execution.status}
            </span>
          </div>
          <p className="mt-1 text-xs text-c5b6257">
            {formatDateTime(execution.started_at, locale)}
          </p>
          <p className="mt-1">
            {execution.accepted} / {execution.rejected} / {execution.pending}
          </p>
          {execution.stop_reason ? (
            <p className="mt-1 text-xs text-c8a2f64">
              {t[stopReasonKey(execution.stop_reason)] ?? execution.stop_reason}
            </p>
          ) : null}
          {execution.error ? <p className="mt-1 break-words text-xs">{execution.error}</p> : null}
          {execution.rejected > 0 ? (
            <>
              <button
                type="button"
                aria-expanded={open === execution.id}
                onClick={() => setOpen(open === execution.id ? null : execution.id)}
                className="mt-2 text-xs font-bold underline"
              >
                {t.scannerRecordsShow}
              </button>
              {open === execution.id ? (
                <RecordsPanel executionId={execution.id} t={t} locale={locale} />
              ) : null}
            </>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
