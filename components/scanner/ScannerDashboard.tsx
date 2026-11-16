"use client";

import { useCallback, useEffect, useState } from "react";

import BusinessesTable from "@/components/scanner/BusinessesTable";
import ExecutionsTable from "@/components/scanner/ExecutionsTable";
import ProductsTable from "@/components/scanner/ProductsTable";
import SourceForm from "@/components/scanner/SourceForm";
import SourcesTable from "@/components/scanner/SourcesTable";
import SummaryCards from "@/components/scanner/SummaryCards";
import { ApiError, api } from "@/lib/api";
import { scannerErrorMessage } from "@/lib/scanner";
import type {
  CollectedProduct,
  DiscoveredBusiness,
  Execution,
  ScannerSummary,
  Source,
} from "@/lib/scanner-schemas";

type Props = { t: Record<string, string>; locale: string };
type Tab = "sources" | "runs" | "products" | "businesses";

const TABS: { key: Tab; label: string }[] = [
  { key: "sources", label: "scannerTabSources" },
  { key: "runs", label: "scannerTabRuns" },
  { key: "products", label: "scannerTabProducts" },
  { key: "businesses", label: "scannerTabBusinesses" },
];

type Data = {
  summary: ScannerSummary;
  sources: Source[];
  executions: Execution[];
  products: CollectedProduct[];
  businesses: DiscoveredBusiness[];
};

export default function ScannerDashboard({ t, locale }: Props) {
  const [tab, setTab] = useState<Tab>("sources");
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState("");
  const [promotionsOnly, setPromotionsOnly] = useState(false);
  const [pendingOnly, setPendingOnly] = useState(false);

  const load = useCallback(async () => {
    setError("");
    try {
      const [summary, sources, executions, products, businesses] = await Promise.all([
        api.scannerSummary(),
        api.scannerSources(),
        api.scannerExecutions(),
        api.scannerProducts(promotionsOnly),
        api.scannerBusinesses(pendingOnly ? "unverified" : undefined),
      ]);
      setData({ summary, sources, executions, products, businesses });
    } catch (cause) {
      setError(scannerErrorMessage(t, cause));
      if (!(cause instanceof ApiError)) setData(null);
    }
  }, [promotionsOnly, pendingOnly, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const replaceSource = (updated: Source) =>
    setData((current) =>
      current
        ? {
            ...current,
            sources: current.sources.map((item) => (item.key === updated.key ? updated : item)),
          }
        : current,
    );

  if (error && data === null) {
    return (
      <div role="alert" className="mt-8 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">
        <p>{error}</p>
        <button type="button" onClick={() => void load()} className="mt-2 font-bold underline">
          {t.scannerRetry}
        </button>
      </div>
    );
  }
  if (data === null) {
    return (
      <p role="status" className="mt-8 text-sm text-stone-600">
        {t.scannerLoading}
      </p>
    );
  }

  return (
    <div className="mt-8 grid gap-6">
      <SummaryCards summary={data.summary} t={t} locale={locale} />
      {error ? (
        <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <div role="tablist" aria-label={t.scannerTitle} className="flex flex-wrap gap-2">
        {TABS.map((item) => (
          <button
            key={item.key}
            role="tab"
            type="button"
            aria-selected={tab === item.key}
            onClick={() => setTab(item.key)}
            className={`rounded-full border px-4 py-2 text-sm font-bold ${
              tab === item.key ? "border-c30442a bg-c30442a text-white" : "bg-white"
            }`}
          >
            {t[item.label]}
          </button>
        ))}
      </div>

      <div role="tabpanel">
        {tab === "sources" ? (
          <div className="grid gap-5">
            <SourcesTable
              sources={data.sources}
              t={t}
              locale={locale}
              onChange={replaceSource}
              onRan={() => void load()}
            />
            <SourceForm t={t} onCreated={() => void load()} />
          </div>
        ) : null}
        {tab === "runs" ? (
          <div>
            <h2 className="mb-3 text-xl font-black">{t.scannerRunsTitle}</h2>
            <ExecutionsTable executions={data.executions} t={t} locale={locale} />
          </div>
        ) : null}
        {tab === "products" ? (
          <div>
            <label className="mb-3 flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={promotionsOnly}
                onChange={(event) => setPromotionsOnly(event.target.checked)}
              />
              {t.scannerPromotionsOnly}
            </label>
            <ProductsTable products={data.products} t={t} locale={locale} />
          </div>
        ) : null}
        {tab === "businesses" ? (
          <div>
            <label className="mb-3 flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={pendingOnly}
                onChange={(event) => setPendingOnly(event.target.checked)}
              />
              {t.scannerOnlyPending}
            </label>
            <BusinessesTable
              businesses={data.businesses}
              t={t}
              locale={locale}
              onChanged={() => void load()}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
