import { describe, expect, it } from "vitest";

import { PlaceSchema, PlacesSchema } from "./map-schemas";

const place = {
  place_id: "ext:1",
  kind: "business",
  name: "Panadería El Trigo",
  category: "bakery",
  affiliation: "discovered",
  latitude: 1.2136,
  longitude: -77.2811,
  address: "Calle 18",
  city: "Pasto",
  website: "",
  opening_hours: "",
  source: "osm",
  source_url: "https://www.openstreetmap.org/node/1",
  last_seen_at: "2026-11-16T12:00:00Z",
  freshness: "fresh",
  verified: false,
  is_demo: false,
  offer_count: 0,
};

describe("map schemas", () => {
  it("accepts a place the backend returns", () => {
    expect(PlaceSchema.parse(place).affiliation).toBe("discovered");
  });

  it("rejects an affiliation the platform does not use", () => {
    expect(() => PlaceSchema.parse({ ...place, affiliation: "partner" })).toThrow();
  });

  it("rejects a category outside the known list", () => {
    expect(() => PlaceSchema.parse({ ...place, category: "casino" })).toThrow();
  });

  it("accepts an affiliated place that has no source date", () => {
    const shop = { ...place, affiliation: "affiliated", last_seen_at: null, freshness: "" };

    expect(PlaceSchema.parse(shop).last_seen_at).toBeNull();
  });

  it("parses a result with its counts and attribution", () => {
    const result = PlacesSchema.parse({
      places: [place],
      counts: { discovered: 1 },
      attribution: "© OpenStreetMap contributors",
    });

    expect(result.counts.discovered).toBe(1);
  });
});
