import { describe, expect, it } from "vitest";

import type { Place } from "@/lib/map-schemas";

import {
  affiliationKey,
  boundsOf,
  DEFAULT_FILTERS,
  formatCop,
  markerHtml,
  toggleCategory,
  toggleLayer,
  toQuery,
} from "./map";

const place = (overrides: Partial<Place> = {}): Place => ({
  place_id: "ext:1",
  kind: "business",
  name: "Panadería El Trigo",
  category: "bakery",
  affiliation: "discovered",
  latitude: 1.2136,
  longitude: -77.2811,
  address: "",
  city: "Pasto",
  website: "",
  opening_hours: "",
  source: "osm",
  source_url: "",
  last_seen_at: null,
  freshness: "",
  verified: false,
  is_demo: false,
  offer_count: 0,
  ...overrides,
});

describe("filters", () => {
  it("starts with every layer on, no category and no text", () => {
    expect(DEFAULT_FILTERS.layers).toEqual(["affiliated", "discovered", "receivers"]);
    expect(DEFAULT_FILTERS.categories).toEqual([]);
    expect(DEFAULT_FILTERS.showOpportunities).toBe(false);
  });

  it("turns a layer off and back on without touching the others", () => {
    const off = toggleLayer(DEFAULT_FILTERS, "discovered");
    const on = toggleLayer(off, "discovered");

    expect(off.layers).toEqual(["affiliated", "receivers"]);
    expect(on.layers).toContain("discovered");
  });

  it("toggles a category", () => {
    const once = toggleCategory(DEFAULT_FILTERS, "bakery");

    expect(once.categories).toEqual(["bakery"]);
    expect(toggleCategory(once, "bakery").categories).toEqual([]);
  });

  it("keeps demonstration data out unless it is asked for", () => {
    expect(DEFAULT_FILTERS.includeDemo).toBe(false);
    expect(toQuery(DEFAULT_FILTERS).includeDemo).toBe(false);
    expect(toQuery({ ...DEFAULT_FILTERS, includeDemo: true }).includeDemo).toBe(true);
  });

  it("builds the request parameters and trims the text", () => {
    expect(toQuery({ ...DEFAULT_FILTERS, text: "  pan " }).text).toBe("pan");
    expect(toQuery({ ...DEFAULT_FILTERS, onlyWithOffers: true }).onlyWithOffers).toBe(true);
  });
});

describe("places", () => {
  it("gives every affiliation its own translation key", () => {
    expect(affiliationKey(place({ affiliation: "affiliated" }))).toBe("mapAffiliation_affiliated");
    expect(affiliationKey(place())).toBe("mapAffiliation_discovered");
  });

  it("returns the corners that contain every place", () => {
    const corners = boundsOf([
      place({ latitude: 1.2, longitude: -77.3 }),
      place({ latitude: 1.25, longitude: -77.25 }),
    ]);

    expect(corners).toEqual([
      [1.2, -77.3],
      [1.25, -77.25],
    ]);
    expect(boundsOf([])).toBeNull();
  });

  it("formats pesos without decimals in both languages", () => {
    expect(formatCop(12990, "en")).toContain("12,990");
    expect(formatCop(12990, "es")).toMatch(/12\.990/);
  });
});

describe("markerHtml", () => {
  it("draws an affiliated place as a solid disc and a discovered one as a dashed ring", () => {
    const affiliated = markerHtml(place({ affiliation: "affiliated" }), false);
    const discovered = markerHtml(place(), false);

    expect(affiliated).toContain("3px solid #ffffff");
    expect(discovered).toContain("dashed");
    expect(discovered).not.toContain("3px solid #ffffff");
  });

  it("shows the number of live offers only when there are some", () => {
    expect(markerHtml(place({ offer_count: 3 }), false)).toContain(">3<");
    expect(markerHtml(place(), false)).not.toContain("min-width:16px");
  });

  it("highlights the selected place", () => {
    expect(markerHtml(place(), true)).toContain("0 0 0 4px");
  });
});
