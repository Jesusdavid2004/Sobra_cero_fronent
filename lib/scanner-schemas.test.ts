import { describe, expect, it } from "vitest";

import { CollectedProductSchema, DiscoveredBusinessSchema, SourceSchema } from "./scanner-schemas";

const source = {
  key: "exito",
  name: "Éxito",
  kind: "jsonld_catalog",
  base_url: "https://www.exito.com/pan",
  enabled: false,
  terms_reviewed: false,
  terms_note: "",
  license_note: "",
  schedule_minutes: null,
  last_run_at: null,
  last_status: "",
  last_stop_reason: "",
};

describe("scanner schemas", () => {
  it("accepts a source that was never run, reviewed or scheduled", () => {
    expect(SourceSchema.parse(source).schedule_minutes).toBeNull();
  });

  it("only knows two freshness states for collected products", () => {
    const product = {
      id: 1,
      source_key: "exito",
      name: "Pan",
      category: "",
      url: "https://x.example/pan",
      shop_name: "Tienda",
      price_cop: 5990,
      original_price_cop: 7990,
      discount_percent: 25,
      availability: "InStock",
      last_seen_at: "2026-11-16T12:00:00Z",
      freshness: "fresh",
    };

    expect(CollectedProductSchema.parse(product).freshness).toBe("fresh");
    expect(() => CollectedProductSchema.parse({ ...product, freshness: "unknown" })).toThrow();
  });

  it("only allows the three verification states for a discovered business", () => {
    const business = {
      id: 1,
      source_key: "osm",
      name: "Panadería",
      category: "bakery",
      address: "",
      latitude: 1.2,
      longitude: -77.2,
      affiliation: "discovered",
      verification_status: "unverified",
      is_demo: false,
      last_seen_at: "2026-11-16T12:00:00Z",
      freshness: "stale",
    };

    expect(DiscoveredBusinessSchema.parse(business).verification_status).toBe("unverified");
    expect(() =>
      DiscoveredBusinessSchema.parse({ ...business, verification_status: "partner" }),
    ).toThrow();
  });
});
