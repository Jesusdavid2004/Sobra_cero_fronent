"use client";

import { useEffect, useState } from "react";

import { api, type TimelineEvent } from "@/lib/api";

type Props = { lotId: number; t: Record<string, string>; locale: string };

const LABEL_KEYS: Record<TimelineEvent["kind"], string> = {
  plan_generated: "timelinePlanGenerated",
  plan_approved: "timelinePlanApproved",
  plan_rejected: "timelinePlanRejected",
  discount_applied: "timelineDiscountApplied",
  analysis_fallback: "timelineAnalysisFallback",
  reserved: "timelineReserved",
  picked_up: "timelinePickedUp",
  reservation_cancelled: "timelineReservationCancelled",
  reservation_expired: "timelineReservationExpired",
  donated: "timelineDonated",
};

const DOT_CLASSES: Record<TimelineEvent["kind"], string> = {
  plan_generated: "bg-c5e568d",
  plan_approved: "bg-c5a803f",
  plan_rejected: "bg-stone-400",
  discount_applied: "bg-cf4c58a",
  analysis_fallback: "bg-cd5a83d",
  reserved: "bg-cf4c58a",
  picked_up: "bg-c5a803f",
  reservation_cancelled: "bg-stone-400",
  reservation_expired: "bg-stone-400",
  donated: "bg-c5e568d",
};

export default function LotTimeline({ lotId, t, locale }: Props) {
  const [events, setEvents] = useState<TimelineEvent[] | null>(null);
  const [failed, setFailed] = useState(false);
  const formatter = new Intl.DateTimeFormat(locale === "es" ? "es-CO" : "en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  useEffect(() => {
    let cancelled = false;
    api
      .lotTimeline(lotId)
      .then((result) => {
        if (!cancelled) setEvents(result);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [lotId]);

  const label = (event: TimelineEvent) =>
    t[LABEL_KEYS[event.kind]]
      .replace("{units}", String(event.units ?? 0))
      .replace("{percent}", String(event.discount_percent ?? 0));

  if (failed) {
    return (
      <p role="alert" className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
        {t.timelineError}
      </p>
    );
  }
  if (events === null) return <p className="mt-3 text-sm text-c5b6257">{t.timelineLoading}</p>;
  if (events.length === 0) return <p className="mt-3 text-sm text-c5b6257">{t.timelineEmpty}</p>;

  return (
    <ol className="mt-4 border-l-2 border-stone-200 pl-4">
      {events.map((event, index) => (
        <li key={`${event.kind}-${event.occurred_at}-${index}`} className="relative pb-4 last:pb-0">
          <span
            aria-hidden="true"
            className={`absolute -left-[1.4rem] top-1 h-3 w-3 rounded-full ring-4 ring-white ${DOT_CLASSES[event.kind]}`}
          />
          <p className="text-sm font-bold">{label(event)}</p>
          <time dateTime={event.occurred_at} className="text-xs text-c788475">
            {formatter.format(new Date(event.occurred_at))}
          </time>
        </li>
      ))}
    </ol>
  );
}
