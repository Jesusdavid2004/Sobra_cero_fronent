import type { ScannerSummary } from "@/lib/scanner-schemas";

type Props = { summary: ScannerSummary; t: Record<string, string>; locale: string };

const CARDS: { key: keyof ScannerSummary; label: string; warn?: boolean }[] = [
  { key: "total_sources", label: "scannerSummaryTotal" },
  { key: "active_sources", label: "scannerSummaryActive" },
  { key: "disabled_sources", label: "scannerSummaryDisabled" },
  { key: "sources_with_errors", label: "scannerSummaryErrors", warn: true },
  { key: "products_found", label: "scannerSummaryProducts" },
  { key: "promotions_detected", label: "scannerSummaryPromotions" },
  { key: "businesses_discovered", label: "scannerSummaryBusinesses" },
  { key: "rejected_records", label: "scannerSummaryRejected", warn: true },
  { key: "pending_validation", label: "scannerSummaryPending", warn: true },
  { key: "stale_products", label: "scannerSummaryStale", warn: true },
];

export default function SummaryCards({ summary, t, locale }: Props) {
  const number = new Intl.NumberFormat(locale === "es" ? "es-CO" : "en-US");

  return (
    <section aria-label={t.scannerTitle}>
      <dl className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {CARDS.map((card) => {
          const value = summary[card.key] as number;
          const attention = card.warn && value > 0;
          return (
            <div
              key={card.key}
              className={`rounded-2xl border p-4 ${attention ? "border-cf4c58a bg-cf5dcec" : "border-ce3e5dc bg-white"}`}
            >
              <dt className="text-xs font-semibold text-c5b6257">{t[card.label]}</dt>
              <dd className="mt-1 text-2xl font-black">{number.format(value)}</dd>
            </div>
          );
        })}
      </dl>
      <p className="mt-3 rounded-2xl bg-cf0f3ec px-4 py-3 text-xs text-c5b6257">
        {t.scannerSummaryNote}
      </p>
    </section>
  );
}
