import { afterEach, describe, expect, it, vi } from "vitest";

import {
  fetchLot,
  fetchLots,
  fetchPublicShop,
  PublicApiError,
  SHOP_PROFILE_REVALIDATE_SECONDS,
} from "./server-api";

const validLot = {
  id: 1,
  shop_id: 2,
  product_id: 3,
  title: "Bread",
  description: "",
  quantity: 5,
  original_price_cents: 1000,
  discount_percent: 20,
  expires_at: "2026-11-11T10:00:00Z",
  image_url: null,
  category: "bakery",
  business_type: "restaurant",
};

function mockFetch(response: Response) {
  const fetchMock = vi.fn().mockResolvedValue(response);
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("server-api", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("reads lots without caching so stock is never stale", async () => {
    const fetchMock = mockFetch(Response.json(validLot));

    await expect(fetchLot(101)).resolves.toMatchObject({ id: 1, title: "Bread" });

    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("/lots/101"), {
      cache: "no-store",
    });
  });

  it("passes the category and business type filters as query parameters", async () => {
    const fetchMock = mockFetch(Response.json([validLot]));

    await fetchLots("bakery", "restaurant");

    expect(fetchMock.mock.calls[0][0]).toContain("/lots?category=bakery&business_type=restaurant");
  });

  it("reports the HTTP status of a failed request", async () => {
    mockFetch(new Response("{}", { status: 404 }));

    await expect(fetchLot(102)).rejects.toMatchObject({
      name: PublicApiError.name,
      status: 404,
    });
  });

  it("rejects a response that does not match the schema", async () => {
    mockFetch(Response.json({ id: "not-a-number" }));

    await expect(fetchLot(103)).rejects.toThrow();
  });

  it("lets a shop profile be cached for a while instead of reading it on every request", async () => {
    const fetchMock = mockFetch(
      Response.json({
        id: 4,
        name: "Bakery",
        description: "",
        business_type: "restaurant",
        latitude: 4.7,
        longitude: -74,
      }),
    );

    await expect(fetchPublicShop(4)).resolves.toMatchObject({ name: "Bakery" });

    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("/public/shops/4"), {
      next: { revalidate: SHOP_PROFILE_REVALIDATE_SECONDS },
    });
  });
});
