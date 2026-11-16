"use client";

import { useState } from "react";

import PriceHistory from "@/components/scanner/PriceHistory";
import { fill, formatDateTime } from "@/lib/format";
import { formatCop } from "@/lib/map";
import type { CollectedProduct } from "@/lib/scanner-schemas";

type Props = { products: CollectedProduct[]; t: Record<string, string>; locale: string };

export default function ProductsTable({ products, t, locale }: Props) {
  const [open, setOpen] = useState<number | null>(null);

  if (products.length === 0) {
    return <p className="rounded-2xl bg-cf0f3ec px-4 py-3 text-sm">{t.scannerProductsEmpty}</p>;
  }

  return (
    <ul aria-label={t.scannerProductsTitle} className="grid gap-3">
      {products.map((product) => {
        const stale = product.freshness === "stale";
        return (
          <li key={product.id} className="rounded-2xl border border-ce3e5dc bg-white p-4 text-sm">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-bold">{product.name}</p>
                <p className="text-xs text-c5b6257">
                  {product.source_key}
                  {product.category ? ` · ${product.category}` : ""}
                </p>
              </div>
              {product.discount_percent > 0 ? (
                <span className="rounded-full bg-cf5dcec px-2 py-0.5 text-xs font-bold text-c8a2f64">
                  {fill(t.mapPromotionOff, { percent: product.discount_percent })}
                </span>
              ) : null}
            </div>
            <p className={`mt-2 ${stale ? "text-c5b6257 line-through decoration-dotted" : ""}`}>
              <span className="font-black">{formatCop(product.price_cop, locale)}</span>
              {product.original_price_cop ? (
                <span className="ml-2 text-c5b6257 line-through">
                  {formatCop(product.original_price_cop, locale)}
                </span>
              ) : null}
            </p>
            <p
              className={`mt-1 text-xs ${stale ? "font-bold text-c8a2f64" : "text-c426431"}`}
              role={stale ? "note" : undefined}
            >
              {stale ? t.scannerStale : t.scannerFresh} ·{" "}
              {fill(t.scannerLastSeen, { date: formatDateTime(product.last_seen_at, locale) })}
            </p>
            <div className="mt-2 flex flex-wrap gap-3 text-xs">
              <a
                href={product.url}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="underline"
              >
                {t.mapPromotionOpen}
              </a>
              <button
                type="button"
                aria-expanded={open === product.id}
                onClick={() => setOpen(open === product.id ? null : product.id)}
                className="font-bold underline"
              >
                {t.scannerHistoryOpen}
              </button>
            </div>
            {open === product.id ? (
              <PriceHistory productId={product.id} t={t} locale={locale} />
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
