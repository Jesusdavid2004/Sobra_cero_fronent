import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import en from "@/i18n/en.json";
import { ApiError, type Simulation } from "@/lib/api";

const apiMock = vi.hoisted(() => ({ simulateRescuePlan: vi.fn() }));

vi.mock("@/lib/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api")>()),
  api: apiMock,
}));

import ScenarioSimulator from "./ScenarioSimulator";

const messages = en as Record<string, string>;

const simulation = (overrides: Partial<Simulation> = {}): Simulation => ({
  hypothetical: true,
  stale: false,
  demand_uplift_percent: 0,
  donation_units: 14,
  scenarios: [
    {
      kind: "keep_offer",
      discount_percent: 20,
      donated_units: 0,
      expected_sales: 6,
      surplus_units: 14,
      estimated_revenue_cents: 4800,
    },
    {
      kind: "apply_discount",
      discount_percent: 30,
      donated_units: 0,
      expected_sales: 9,
      surplus_units: 11,
      estimated_revenue_cents: 6300,
    },
    {
      kind: "separate_donation",
      discount_percent: 20,
      donated_units: 14,
      expected_sales: 6,
      surplus_units: 0,
      estimated_revenue_cents: 4800,
    },
  ],
  ...overrides,
});

const renderSimulator = () =>
  render(
    <ScenarioSimulator
      planId={7}
      availableQuantity={20}
      defaultDonationUnits={14}
      t={messages}
      locale="en"
    />,
  );

describe("ScenarioSimulator", () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(cleanup);

  it("always labels the results as hypothetical", () => {
    apiMock.simulateRescuePlan.mockResolvedValue(simulation());

    renderSimulator();

    expect(screen.getByText(messages.simHypothetical)).toBeTruthy();
  });

  it("compares keeping, discounting and donating with the plan's default donation", async () => {
    apiMock.simulateRescuePlan.mockResolvedValue(simulation());

    renderSimulator();

    expect(await screen.findByText(messages.simKeep)).toBeTruthy();
    expect(screen.getByText("Apply a 30% discount")).toBeTruthy();
    expect(screen.getByText("Separate 14 units for donation")).toBeTruthy();
    expect(screen.getByText("$63.00")).toBeTruthy();
    expect(apiMock.simulateRescuePlan).toHaveBeenCalledWith(7, {
      demandUpliftPercent: 0,
      donationUnits: 14,
    });
  });

  it("asks again when the owner changes the assumed demand", async () => {
    apiMock.simulateRescuePlan.mockResolvedValue(simulation());

    renderSimulator();
    await screen.findByText(messages.simKeep);
    fireEvent.change(screen.getByRole("slider"), { target: { value: "40" } });

    await waitFor(() =>
      expect(apiMock.simulateRescuePlan).toHaveBeenLastCalledWith(7, {
        demandUpliftPercent: 40,
        donationUnits: 14,
      }),
    );
  });

  it("warns when the stock changed after the plan was created", async () => {
    apiMock.simulateRescuePlan.mockResolvedValue(simulation({ stale: true }));

    renderSimulator();

    expect(await screen.findByText(messages.simStale)).toBeTruthy();
  });

  it("shows a translated message when the values are not allowed", async () => {
    apiMock.simulateRescuePlan.mockRejectedValue(new ApiError("bad", 422, "simulation_invalid"));

    renderSimulator();

    expect((await screen.findByRole("alert")).textContent).toBe(
      messages.rescueError_simulation_invalid,
    );
  });
});
