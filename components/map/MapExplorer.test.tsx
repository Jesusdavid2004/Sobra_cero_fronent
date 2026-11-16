import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import en from "@/i18n/en.json";
import type { Place, PlacesResult } from "@/lib/map-schemas";

const apiMock = vi.hoisted(() => ({
  mapPlaces: vi.fn(),
  mapOpportunities: vi.fn(),
  mapPromotions: vi.fn(),
  geocode: vi.fn(),
}));

vi.mock("@/lib/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api")>()),
  api: apiMock,
}));
vi.mock("next/dynamic", () => ({
  default: () =>
    function MapStub({ places }: { places: Place[] }) {
      return <div data-testid="map">{places.length} markers</div>;
    },
}));
vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

import MapExplorer from "./MapExplorer";

const messages = en as Record<string, string>;

const place = (id: string, name: string, overrides: Partial<Place> = {}): Place => ({
  place_id: id,
  kind: "business",
  name,
  category: "bakery",
  affiliation: "discovered",
  latitude: 1.2136,
  longitude: -77.2811,
  address: "Calle 18",
  city: "Pasto",
  website: "",
  opening_hours: "",
  source: "osm",
  source_url: "",
  last_seen_at: "2026-11-16T12:00:00Z",
  freshness: "fresh",
  verified: false,
  is_demo: false,
  offer_count: 0,
  ...overrides,
});

const result = (places: Place[]): PlacesResult => ({
  places,
  counts: { discovered: places.length },
  attribution: "© OpenStreetMap contributors",
});

describe("MapExplorer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiMock.mapPromotions.mockResolvedValue([]);
    apiMock.mapOpportunities.mockResolvedValue([]);
  });
  afterEach(cleanup);

  const renderExplorer = () => render(<MapExplorer t={messages} locale="en" />);

  it("loads the places and shows them on the map and in the list", async () => {
    apiMock.mapPlaces.mockResolvedValue(
      result([place("a", "Panadería El Trigo"), place("b", "Cafe Central")]),
    );
    renderExplorer();

    expect(await screen.findByText("2 places")).toBeTruthy();
    expect(screen.getByTestId("map").textContent).toBe("2 markers");
    expect(screen.getByText("© OpenStreetMap contributors")).toBeTruthy();
  });

  it("shows the detail card with source and affiliation when a place is chosen", async () => {
    apiMock.mapPlaces.mockResolvedValue(result([place("a", "Panadería El Trigo")]));
    renderExplorer();

    fireEvent.click(
      await screen.findByRole("button", { name: "Show Panadería El Trigo on the map" }),
    );

    expect(await screen.findByRole("heading", { name: "Panadería El Trigo" })).toBeTruthy();
    expect(screen.getAllByText("Found in a public source, not affiliated").length).toBeGreaterThan(
      0,
    );
  });

  it("asks the backend again when a layer is turned off", async () => {
    apiMock.mapPlaces.mockResolvedValue(result([place("a", "Panadería El Trigo")]));
    renderExplorer();
    await screen.findByText("1 places");

    fireEvent.click(screen.getByLabelText("Found in public sources"));

    await waitFor(() =>
      expect(apiMock.mapPlaces).toHaveBeenLastCalledWith(
        expect.objectContaining({ layers: ["affiliated", "receivers"] }),
      ),
    );
  });

  it("waits for the visitor to stop typing before filtering by name", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    apiMock.mapPlaces.mockResolvedValue(result([]));
    renderExplorer();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10);
    });
    const callsBefore = apiMock.mapPlaces.mock.calls.length;

    fireEvent.change(screen.getByLabelText("Filter places by name"), { target: { value: "pan" } });
    expect(apiMock.mapPlaces.mock.calls.length).toBe(callsBefore);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(400);
    });

    expect(apiMock.mapPlaces).toHaveBeenLastCalledWith(expect.objectContaining({ text: "pan" }));
    vi.useRealTimers();
  });

  it("asks for demonstration data only when the visitor opts in", async () => {
    apiMock.mapPlaces.mockResolvedValue(result([]));
    renderExplorer();
    await screen.findByText("No place matches these filters.");
    expect(apiMock.mapPlaces).toHaveBeenLastCalledWith(
      expect.objectContaining({ includeDemo: false }),
    );

    fireEvent.click(screen.getByLabelText("Include demonstration data (not real businesses)"));

    await waitFor(() =>
      expect(apiMock.mapPlaces).toHaveBeenLastCalledWith(
        expect.objectContaining({ includeDemo: true }),
      ),
    );
  });

  it("offers a retry when the places cannot be loaded", async () => {
    apiMock.mapPlaces.mockRejectedValueOnce(new Error("down")).mockResolvedValueOnce(result([]));
    renderExplorer();

    expect(await screen.findByText("The map data could not be loaded.")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));

    expect(await screen.findByText("No place matches these filters.")).toBeTruthy();
  });

  it("loads the opportunity areas only when the overlay is switched on", async () => {
    apiMock.mapPlaces.mockResolvedValue(result([]));
    renderExplorer();
    await screen.findByText("No place matches these filters.");
    expect(apiMock.mapOpportunities).not.toHaveBeenCalled();

    fireEvent.click(screen.getByLabelText("Show where activity is concentrated"));

    await waitFor(() => expect(apiMock.mapOpportunities).toHaveBeenCalledOnce());
    expect(await screen.findByText("Where activity is concentrated")).toBeTruthy();
  });
});
