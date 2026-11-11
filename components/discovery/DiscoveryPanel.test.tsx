import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import en from "@/i18n/en.json";
import type { DiscoveryResult, LotAssessment } from "@/lib/api";

const apiMock = vi.hoisted(() => ({ discoverLots: vi.fn(), parseDiscoveryRequest: vi.fn() }));

vi.mock("@/lib/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api")>()),
  api: apiMock,
}));
vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

import { ApiError } from "@/lib/api";

import DiscoveryPanel from "./DiscoveryPanel";

const messages = en as Record<string, string>;

const assessment = (overrides: Partial<LotAssessment>): LotAssessment => ({
  lot_id: 1,
  shop_id: 1,
  title: "Bread bag",
  category: "bakery",
  available_quantity: 5,
  unit_price_cents: 800,
  closes_at: "2026-11-10T18:00:00Z",
  distance_km: 3.2,
  travel_minutes: 10,
  slack_minutes: 45,
  reasons: [],
  ...overrides,
});

const result = (overrides: Partial<DiscoveryResult>): DiscoveryResult => ({
  approximate: true,
  feasible: [],
  excluded: [],
  nearest_unreachable: null,
  ...overrides,
});

const renderPanel = () => render(<DiscoveryPanel t={messages} locale="en" />);

describe("DiscoveryPanel", () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(cleanup);

  it("fills the form from the AI reading so the customer can review it", async () => {
    apiMock.parseDiscoveryRequest.mockResolvedValue({
      budget: 10,
      pickup_from: "17:00",
      pickup_until: "18:30",
      quantity: 2,
      category: "bakery",
    });
    renderPanel();

    fireEvent.change(screen.getByLabelText("Your request"), {
      target: { value: "ten dollars, 5 pm to 6:30 pm" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Fill the form with AI" }));

    expect(await screen.findByText("Form filled. Please review the values.")).toBeTruthy();
    expect((screen.getByLabelText("Budget (USD)") as HTMLInputElement).value).toBe("10");
    expect((screen.getByLabelText("Can pick up from") as HTMLInputElement).value).toBe("17:00");
    expect((screen.getByLabelText("Category") as HTMLSelectElement).value).toBe("bakery");
  });

  it("asks the customer to log in when the AI reader needs an account", async () => {
    apiMock.parseDiscoveryRequest.mockRejectedValue(new ApiError("unauthorized", 401));
    renderPanel();

    fireEvent.change(screen.getByLabelText("Your request"), {
      target: { value: "some bread please" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Fill the form with AI" }));

    expect(await screen.findByText("Log in to use the AI reader.")).toBeTruthy();
  });

  it("lists collectable lots, the nearest lot that is out of reach and why others were left out", async () => {
    apiMock.discoverLots.mockResolvedValue(
      result({
        feasible: [assessment({ lot_id: 2, title: "Croissant box" })],
        excluded: [
          assessment({ lot_id: 3, title: "Soup pot", reasons: ["closes_before_arrival"] }),
        ],
        nearest_unreachable: assessment({
          lot_id: 3,
          title: "Soup pot",
          reasons: ["closes_before_arrival"],
        }),
      }),
    );
    renderPanel();

    fireEvent.click(screen.getByRole("button", { name: "Find lots I can collect" }));

    await waitFor(() => expect(screen.getByText("Croissant box")).toBeTruthy());
    expect(
      screen.getByText(
        "The nearest lot, Soup pot, cannot be collected: it closes before you could arrive.",
      ),
    ).toBeTruthy();
    expect(screen.getByText("Left out (1)")).toBeTruthy();
    expect(screen.getByText(/straight-line estimates/)).toBeTruthy();
  });

  it("rejects a pickup window that ends before it starts without calling the API", async () => {
    renderPanel();

    fireEvent.change(screen.getByLabelText("Can pick up from"), { target: { value: "18:00" } });
    fireEvent.change(screen.getByLabelText("Can pick up until"), { target: { value: "17:00" } });
    fireEvent.click(screen.getByRole("button", { name: "Find lots I can collect" }));

    expect(await screen.findByText("The pickup window must end after it starts.")).toBeTruthy();
    expect(apiMock.discoverLots).not.toHaveBeenCalled();
  });
});
