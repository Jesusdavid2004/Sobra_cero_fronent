"use client";

import { useEffect, useState } from "react";

import { api } from "@/lib/api";
import { formatDateTime } from "@/lib/format";
import { scannerErrorMessage } from "@/lib/scanner";
import type { ScraperRecord } from "@/lib/scanner-schemas";

type Props = { executionId: number; t: Record<string, string>; locale: string };

/** The records a run rejected, each with its reason, so nothing is lost silently. */
export default function RecordsPanel({ executionId, t, locale }: Props) {
  const [records, setRecords] = useState<ScraperRecord[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    api
      .scannerRecords(executionId)
      .then((data) => {
        if (!cancelled) setRecords(data);
      })
      .catch((cause) => {
        if (!cancelled) setError(scannerErrorMessage(t, cause));
      });
    return () => {
      cancelled = true;
    };
  }, [executionId, t]);

  if (error)
    return (
      <p role="alert" className="text-sm text-red-700">
        {error}
      </p>
    );
  if (records === null)
    return (
      <p role="status" className="text-sm text-stone-600">
        {t.scannerLoading}
      </p>
    );

  return (
    <section aria-label={t.scannerRecordsTitle} className="mt-3 rounded-2xl bg-cf0f3ec p-4">
      <h4 className="text-sm font-black">{t.scannerRecordsTitle}</h4>
      {records.length === 0 ? (
        <p className="mt-2 text-sm">{t.scannerRecordsEmpty}</p>
      ) : (
        <ul className="mt-2 grid gap-2">
          {records.map((record) => (
            <li key={record.id} className="rounded-xl bg-white p-3 text-sm">
              <p className="font-bold">
                {t[`scannerRecordReason_${record.reason}`] ?? record.reason}
              </p>
              <p className="text-xs text-c5b6257">
                {record.kind} · {formatDateTime(record.created_at, locale)}
              </p>
              {record.source_url ? <p className="break-all text-xs">{record.source_url}</p> : null}
              <pre className="mt-1 max-h-24 overflow-auto whitespace-pre-wrap break-words rounded bg-cf3f5ef p-2 text-xs">
                {record.payload}
              </pre>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
