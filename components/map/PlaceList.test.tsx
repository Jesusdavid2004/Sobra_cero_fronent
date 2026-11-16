import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import en from "@/i18n/en.json";
import type { Place } from "@/lib/map-schemas";

import PlaceList from "./PlaceList";

const messages = en as Record<string, string>;

const place = (id: string, name: string, overrides: Partial<Place> = {}): Place => ({
  place_id: id,
  kind: "business",
  name,
  category: "bakery",
  affiliation: "discovered",
  latitude: 1.2,
  longitude: -77.2,
  address: "",
  city: "",
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

describe("PlaceList", () => {
  afterEach(cleanup);

  it("explains when nothing matches", () => {
    render(<PlaceList places={[]} selectedId={null} t={messages} onSelect={vi.fn()} />);

    expect(screen.getByText("No place matches these filters.")).toBeTruthy();
  });

  it("lists every place with its category and affiliation and counts them", () => {
    render(
      <PlaceList
        places={[
          place("a", "Panadería El Trigo"),
          place("b", "Green Bakery", { affiliation: "affiliated" }),
        ]}
        selectedId={null}
        t={messages}
        onSelect={vi.fn()}
      />,
    );

    expect(screen.getByText("2 places")).toBeTruthy();
    expect(screen.getByText("Bakeries · Found in a public source, not affiliated")).toBeTruthy();
    expect(screen.getByText("Bakeries · Affiliated with SobraCero")).toBeTruthy();
  });

  it("marks the selected place and reports a click", () => {
    const onSelect = vi.fn();
    const target = place("b", "Green Bakery");
    render(
      <PlaceList
        places={[place("a", "Panadería El Trigo"), target]}
        selectedId="b"
        t={messages}
        onSelect={onSelect}
      />,
    );

    const selected = screen.getByRole("button", { name: "Show Green Bakery on the map" });
    expect(selected.getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(screen.getByRole("button", { name: "Show Panadería El Trigo on the map" }));

    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ place_id: "a" }));
  });

  it("shows the number of live offers on a shop", () => {
    render(
      <PlaceList
        places={[place("a", "Green Bakery", { affiliation: "affiliated", offer_count: 3 })]}
        selectedId={null}
        t={messages}
        onSelect={vi.fn()}
      />,
    );

    expect(screen.getByText("3 live offers")).toBeTruthy();
  });
});
