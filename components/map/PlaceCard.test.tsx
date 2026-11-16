import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import en from "@/i18n/en.json";
import type { Place } from "@/lib/map-schemas";

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

import PlaceCard from "./PlaceCard";

const messages = en as Record<string, string>;

const place = (overrides: Partial<Place> = {}): Place => ({
  place_id: "ext:1",
  kind: "business",
  name: "Panadería El Trigo",
  category: "bakery",
  affiliation: "discovered",
  latitude: 1.2136,
  longitude: -77.2811,
  address: "Calle 18 25-10",
  city: "Pasto",
  website: "https://eltrigo.example",
  opening_hours: "Mo-Sa 07:00-19:00",
  source: "osm",
  source_url: "https://www.openstreetmap.org/node/1",
  last_seen_at: "2026-11-16T12:00:00Z",
  freshness: "fresh",
  verified: false,
  is_demo: false,
  offer_count: 0,
  ...overrides,
});

const renderCard = (value: Place, onClose = vi.fn()) =>
  render(
    <PlaceCard
      place={value}
      attribution="© OpenStreetMap contributors"
      t={messages}
      locale="en"
      onClose={onClose}
    />,
  );

describe("PlaceCard", () => {
  afterEach(cleanup);

  it("says plainly that a business found in a public source is not affiliated", () => {
    renderCard(place());

    expect(screen.getByText("Found in a public source, not affiliated")).toBeTruthy();
    expect(screen.queryByText("Affiliated with SobraCero")).toBeNull();
    expect(screen.getByText("Not verified yet")).toBeTruthy();
  });

  it("shows address, hours, website, source and the date it was last seen", () => {
    renderCard(place());

    expect(screen.getByText("Calle 18 25-10")).toBeTruthy();
    expect(screen.getByText("Mo-Sa 07:00-19:00")).toBeTruthy();
    expect(screen.getByRole("link", { name: "https://eltrigo.example" })).toBeTruthy();
    expect(screen.getByRole("link", { name: /Open the source record: osm/ })).toBeTruthy();
    expect(screen.getByText(/Last seen/)).toBeTruthy();
    expect(screen.getByText("Map data: © OpenStreetMap contributors")).toBeTruthy();
  });

  it("says when nothing was published instead of leaving blanks", () => {
    renderCard(place({ address: "", opening_hours: "", website: "" }));

    expect(screen.getByText("No address published")).toBeTruthy();
    expect(screen.getByText("No hours published")).toBeTruthy();
  });

  it("warns that stale information may be out of date", () => {
    renderCard(place({ freshness: "stale" }));

    expect(screen.getByRole("note").textContent).toBe("This information may be out of date.");
  });

  it("marks demonstration data", () => {
    renderCard(place({ is_demo: true }));

    expect(screen.getByText("Demonstration data, not a real business")).toBeTruthy();
  });

  it("shows live offers and a link to them for an affiliated shop", () => {
    renderCard(
      place({
        affiliation: "affiliated",
        source: "sobracero",
        source_url: "",
        last_seen_at: null,
        freshness: "",
        verified: true,
        offer_count: 2,
      }),
    );

    expect(screen.getByText("Affiliated with SobraCero")).toBeTruthy();
    expect(screen.getByText("2 live offers")).toBeTruthy();
    expect(screen.getByRole("link", { name: "See offers" }).getAttribute("href")).toBe("/market");
    expect(screen.getByText("Registered directly by the shop")).toBeTruthy();
    expect(screen.queryByText(/Map data:/)).toBeNull();
  });

  it("closes when asked", () => {
    const onClose = vi.fn();
    renderCard(place(), onClose);

    fireEvent.click(screen.getByRole("button", { name: "Close details" }));

    expect(onClose).toHaveBeenCalledOnce();
  });
});
