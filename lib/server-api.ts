import { cache } from "react";
import { z } from "zod";

/**
 * Public, unauthenticated reads used by Server Components.
 * Private data (sessions, sales, pickup codes) never goes through here: the access
 * token lives in browser memory, so authenticated screens stay client-side.
 */

const PUBLIC_API_URL =
  process.env.API_INTERNAL_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

const LotSchema = z.object({
  id: z.number().int(),
  shop_id: z.number().int(),
  product_id: z.number().int(),
  title: z.string(),
  description: z.string(),
  quantity: z.number().int(),
  original_price_cents: z.number().int(),
  discount_percent: z.number().int(),
  expires_at: z.string(),
  image_url: z.string().nullish(),
  category: z.string(),
  business_type: z.enum(["restaurant", "supermarket"]),
});

const PromotionSchema = z.object({
  id: z.number().int(),
  language: z.string(),
  variant: z.string(),
  text: z.string(),
  prompt: z.string(),
});

const PublicShopSchema = z.object({
  id: z.number().int(),
  name: z.string(),
  description: z.string(),
  business_type: z.enum(["restaurant", "supermarket"]),
  latitude: z.number(),
  longitude: z.number(),
});

export type PublicShop = z.infer<typeof PublicShopSchema>;
export type PublicLot = z.infer<typeof LotSchema>;

/** A shop profile changes rarely, so it may be served from the ISR cache for this long. */
export const SHOP_PROFILE_REVALIDATE_SECONDS = 60;
export type PublicPromotion = z.infer<typeof PromotionSchema>;

export type PublicLotFilters = { category?: string; business_type?: string };

export class PublicApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "PublicApiError";
  }
}

/** Stock and prices change on every reservation, so public lot reads are never cached. */
async function readFresh<T>(path: string, schema: z.ZodType<T>): Promise<T> {
  const response = await fetch(`${PUBLIC_API_URL}${path}`, { cache: "no-store" });
  if (!response.ok) {
    throw new PublicApiError(`Request failed (${response.status})`, response.status);
  }
  return schema.parse(await response.json());
}

async function readRevalidated<T>(path: string, schema: z.ZodType<T>, seconds: number): Promise<T> {
  const response = await fetch(`${PUBLIC_API_URL}${path}`, { next: { revalidate: seconds } });
  if (!response.ok) {
    throw new PublicApiError(`Request failed (${response.status})`, response.status);
  }
  return schema.parse(await response.json());
}

export const fetchPublicShop = cache((shopId: number) =>
  readRevalidated(`/public/shops/${shopId}`, PublicShopSchema, SHOP_PROFILE_REVALIDATE_SECONDS),
);

export const fetchLot = cache((lotId: number) => readFresh(`/lots/${lotId}`, LotSchema));

export const fetchLotPromotions = cache((lotId: number) =>
  readFresh(`/lots/${lotId}/promos`, PromotionSchema.array()),
);

export const fetchLots = cache((category: string, businessType: string) => {
  const params = new URLSearchParams();
  if (category) params.set("category", category);
  if (businessType) params.set("business_type", businessType);
  const query = params.toString();
  return readFresh(`/lots${query ? `?${query}` : ""}`, LotSchema.array());
});
