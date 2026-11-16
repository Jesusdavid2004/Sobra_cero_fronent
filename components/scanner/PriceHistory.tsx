"use client";

import { useEffect, useState } from "react";

import { api } from "@/lib/api";
import { formatDateTime } from "@/lib/format";
import { formatCop } from "@/lib/map";
import { scannerErrorMessage, sparkline } from "@/lib/scanner";
import type { PricePoint } from "@/lib/scanner-schemas";

type Props = { productId: number; t: Record<string, string>; locale: string };

const CHART_WIDTH = 220;
const CHART_HEIGHT = 48;

export default function PriceHistory({ productId, t, locale }: Props) {
  const [points, setPoints] = useState<PricePoint[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    api
      .scannerPriceHistory(productId)
      .then((data) => {
        if (!cancelled) setPoints(data);
      })
      .catch((cause) => {
        if (!cancelled) setError(scannerErrorMessage(t, cause));
      });
    return () => {
      cancelled = true;
    };
  }, [productId, t]);

  if (error)
    return (
      <p role="alert" className="text-sm text-red-700">
        {error}
      </p>
    );
  if (points === null) return null;
  if (points.length === 0) return <p className="mt-2 text-sm">{t.scannerNoHistory}</p>;

  return (
    <section aria-label={t.scannerPriceHistory} className="mt-3 rounded-2xl bg-cf0f3ec p-4">
      <h4 className="text-sm font-black">{t.scannerPriceHistory}</h4>
      <svg
        role="img"
        aria-label={t.scannerPriceHistory}
        viewBox={`-4 -4 ${CHART_WIDTH + 8} ${CHART_HEIGHT + 8}`}
        className="mt-2 h-14 w-full max-w-xs"
      >
        <polyline
          points={sparkline(points, CHART_WIDTH, CHART_HEIGHT)}
          fill="none"
          stroke="#30442a"
          strokeWidth="2"
          strokeLinejoin="round"
        />
      </svg>
      <ol className="mt-2 grid gap-1 text-xs">
        {points.map((point) => (
          <li key={point.observed_at}>
            {formatDateTime(point.observed_at, locale)} · {formatCop(point.price_cop, locale)}
          </li>
        ))}
      </ol>
    </section>
  );
}
