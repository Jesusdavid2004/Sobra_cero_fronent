import { z } from "zod";

export const PLACE_CATEGORIES = [
  "supermarket",
  "restaurant",
  "bakery",
  "cafe",
  "store",
  "market",
  "receiver",
  "other",
] as const;

export const PlaceSchema = z.object({
  place_id: z.string(),
  kind: z.enum(["business", "receiver"]),
  name: z.string(),
  category: z.enum(PLACE_CATEGORIES),
  affiliation: z.enum(["affiliated", "prospect", "discovered"]),
  latitude: z.number(),
  longitude: z.number(),
  address: z.string(),
  city: z.string(),
  website: z.string(),
  opening_hours: z.string(),
  source: z.string(),
  source_url: z.string(),
  last_seen_at: z.string().nullable(),
  freshness: z.enum(["fresh", "stale", ""]),
  verified: z.boolean(),
  is_demo: z.boolean(),
  offer_count: z.number().int(),
});

export const PlacesSchema = z.object({
  places: z.array(PlaceSchema),
  counts: z.record(z.string(), z.number().int()),
  attribution: z.string(),
});

export const CellSchema = z.object({
  south: z.number(),
  west: z.number(),
  center_latitude: z.number(),
  center_longitude: z.number(),
  affiliated_shops: z.number().int(),
  live_offers: z.number().int(),
  receivers: z.number().int(),
  discovered_businesses: z.number().int(),
  total: z.number().int(),
  somewhere_to_invite: z.boolean(),
});

export const PromotionSchema = z.object({
  name: z.string(),
  category: z.string(),
  price_cop: z.number().int(),
  original_price_cop: z.number().int().nullable(),
  discount_percent: z.number().int(),
  url: z.string(),
  source_name: z.string(),
  last_seen_at: z.string(),
});

export const GeocodeResultSchema = z.object({
  display_name: z.string(),
  latitude: z.number(),
  longitude: z.number(),
  category: z.string(),
  attribution: z.string(),
});

export type PlaceCategory = (typeof PLACE_CATEGORIES)[number];
export type Place = z.infer<typeof PlaceSchema>;
export type PlacesResult = z.infer<typeof PlacesSchema>;
export type OpportunityCell = z.infer<typeof CellSchema>;
export type Promotion = z.infer<typeof PromotionSchema>;
export type GeocodeResult = z.infer<typeof GeocodeResultSchema>;
