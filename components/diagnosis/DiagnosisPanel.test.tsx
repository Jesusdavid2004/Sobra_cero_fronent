import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import en from "@/i18n/en.json";
import type { Diagnosis } from "@/lib/inventory-schemas";

const apiMock = vi.hoisted(() => ({ shopDiagnosis: vi.fn() }));

vi.mock("@/lib/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api")>()),
  api: apiMock,
}));

import DiagnosisPanel from "./DiagnosisPanel";

const messages = en as Record<string, string>;

const diagnosis = (overrides: Partial<Diagnosis> = {}): Diagnosis => ({
  facts: {
    active_lots: 2,
    units_available: 1200,
    lots_expiring_soon: 1,
    units_expiring_soon: 7,
    units_closing_soon: 7,
    picked_up_units: 0,
    delivered_donation_units: 0,
    cancelled_units: 0,
    wasted_units: 1,
    pending_pickup_units: 2,
  },
  alerts: ["expiring_soon", "waste_recorded"],
  limitations: ["no_pickups_recorded", "forecast_not_included"],
  data_used: ["lots", "reservations", "donations", "waste_records"],
  narrative: "Review today's alerts and keep the limitations in mind.",
  narrative_status: "ai",
  ...overrides,
});

describe("DiagnosisPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiMock.shopDiagnosis.mockResolvedValue(diagnosis());
  });
  afterEach(cleanup);

  const renderPanel = (revision = 0) =>
    render(<DiagnosisPanel shopId={5} revision={revision} t={messages} locale="en" />);

  it("asks for the diagnosis in the visitor's language", async () => {
    renderPanel();

    await screen.findByText("Alerts");

    expect(apiMock.shopDiagnosis).toHaveBeenCalledWith(5, "en");
  });

  it("lists the alerts in plain words and the numbers with a thousands separator", async () => {
    renderPanel();

    expect(await screen.findByText("Some lots expire within a day.")).toBeTruthy();
    expect(screen.getByText("You recorded waste during the last week.")).toBeTruthy();
    expect(screen.getByText("1,200")).toBeTruthy();
    expect(screen.getByText("Units recorded as waste (7 days)")).toBeTruthy();
  });

  it("labels the model's summary as AI and says it never decides anything", async () => {
    renderPanel();

    expect(await screen.findByText(/Review today's alerts/)).toBeTruthy();
    expect(screen.getByText("AI")).toBeTruthy();
    expect(screen.getByText(/It never decides anything/)).toBeTruthy();
  });

  it("states what the summary cannot know and which data it used", async () => {
    renderPanel();

    expect(
      await screen.findByText(
        "No pickup was confirmed in the last week, so how much sells is unknown.",
      ),
    ).toBeTruthy();
    expect(
      screen.getByText(/Data used: Lots, Reservations, Delivered donations, Waste you recorded/),
    ).toBeTruthy();
  });

  it("keeps the numbers and explains when the AI summary is not available", async () => {
    apiMock.shopDiagnosis.mockResolvedValue(
      diagnosis({ narrative: null, narrative_status: "unavailable" }),
    );
    renderPanel();

    expect(await screen.findByRole("note")).toBeTruthy();
    expect(screen.getByRole("note").textContent).toBe(
      "The AI summary is not available right now. The numbers above are still correct.",
    );
    expect(screen.getByText("1,200")).toBeTruthy();
  });

  it("says there is no alert when the shop has none", async () => {
    apiMock.shopDiagnosis.mockResolvedValue(diagnosis({ alerts: [] }));
    renderPanel();

    expect(await screen.findByText("No alert today.")).toBeTruthy();
  });

  it("reloads when something changes and when the owner asks", async () => {
    const view = renderPanel(0);
    await screen.findByText("Alerts");

    view.rerender(<DiagnosisPanel shopId={5} revision={1} t={messages} locale="en" />);
    await waitFor(() => expect(apiMock.shopDiagnosis).toHaveBeenCalledTimes(2));
    fireEvent.click(screen.getByRole("button", { name: "Refresh" }));

    await waitFor(() => expect(apiMock.shopDiagnosis).toHaveBeenCalledTimes(3));
  });

  it("shows an error when the diagnosis cannot be loaded", async () => {
    apiMock.shopDiagnosis.mockRejectedValue(new Error("down"));
    renderPanel();

    expect((await screen.findByRole("alert")).textContent).toBe(
      "The diagnosis could not be loaded.",
    );
  });
});
