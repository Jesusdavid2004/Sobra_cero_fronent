import { z } from "zod";

export const SOURCE_KINDS = ["overpass", "jsonld_catalog"] as const;
export const NOT_RUNNABLE_REASONS = [
  "unsupported_kind",
  "disabled",
  "terms_not_reviewed",
  "unknown_source",
] as const;

export const SourceSchema = z.object({
  key: z.string(),
  name: z.string(),
  kind: z.string(),
  base_url: z.string(),
  enabled: z.boolean(),
  terms_reviewed: z.boolean(),
  terms_note: z.string(),
  license_note: z.string(),
  schedule_minutes: z.number().int().nullable(),
  last_run_at: z.string().nullable(),
  last_status: z.string(),
  last_stop_reason: z.string(),
});

export const ExecutionSchema = z.object({
  id: z.number().int(),
  source_key: z.string(),
  status: z.string(),
  trigger: z.string(),
  started_at: z.string(),
  finished_at: z.string().nullable(),
  accepted: z.number().int(),
  rejected: z.number().int(),
  pending: z.number().int(),
  stop_reason: z.string(),
  error: z.string(),
});

export const RunSchema = z.object({
  execution_id: z.number().int(),
  status: z.string(),
  accepted: z.number().int(),
  rejected: z.number().int(),
  pending: z.number().int(),
  duplicates: z.number().int(),
  stop_reason: z.string(),
  error: z.string(),
});

export const RecordSchema = z.object({
  id: z.number().int(),
  kind: z.string(),
  status: z.string(),
  reason: z.string(),
  source_url: z.string(),
  payload: z.string(),
  created_at: z.string(),
});

export const CollectedProductSchema = z.object({
  id: z.number().int(),
  source_key: z.string(),
  name: z.string(),
  category: z.string(),
  url: z.string(),
  shop_name: z.string(),
  price_cop: z.number().int(),
  original_price_cop: z.number().int().nullable(),
  discount_percent: z.number().int(),
  availability: z.string(),
  last_seen_at: z.string(),
  freshness: z.enum(["fresh", "stale"]),
});

export const PricePointSchema = z.object({
  observed_at: z.string(),
  price_cop: z.number().int(),
  original_price_cop: z.number().int().nullable(),
  discount_percent: z.number().int(),
});

export const DiscoveredBusinessSchema = z.object({
  id: z.number().int(),
  source_key: z.string(),
  name: z.string(),
  category: z.string(),
  address: z.string(),
  latitude: z.number(),
  longitude: z.number(),
  affiliation: z.string(),
  verification_status: z.enum(["unverified", "verified", "rejected"]),
  is_demo: z.boolean(),
  last_seen_at: z.string(),
  freshness: z.enum(["fresh", "stale"]),
});

export const SummarySchema = z.object({
  total_sources: z.number().int(),
  active_sources: z.number().int(),
  disabled_sources: z.number().int(),
  sources_with_errors: z.number().int(),
  products_found: z.number().int(),
  promotions_detected: z.number().int(),
  businesses_discovered: z.number().int(),
  rejected_records: z.number().int(),
  pending_validation: z.number().int(),
  stale_products: z.number().int(),
  last_runs: z.array(ExecutionSchema),
});

export type Source = z.infer<typeof SourceSchema>;
export type Execution = z.infer<typeof ExecutionSchema>;
export type RunResult = z.infer<typeof RunSchema>;
export type ScraperRecord = z.infer<typeof RecordSchema>;
export type CollectedProduct = z.infer<typeof CollectedProductSchema>;
export type PricePoint = z.infer<typeof PricePointSchema>;
export type DiscoveredBusiness = z.infer<typeof DiscoveredBusinessSchema>;
export type ScannerSummary = z.infer<typeof SummarySchema>;
export type SourceInput = {
  key: string;
  name: string;
  kind: (typeof SOURCE_KINDS)[number];
  base_url: string;
  license_note: string;
};
