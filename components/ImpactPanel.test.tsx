import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import en from "@/i18n/en.json";
import type { ShopImpact } from "@/lib/api";

const apiMock = vi.hoisted(() => ({ shopImpact: vi.fn() }));

vi.mock("@/lib/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api")>()),
  api: apiMock,
}));

import ImpactPanel from "./ImpactPanel";

const messages = en as Record<string, string>;

const impact = (overrides: Partial<ShopImpact> = {}): ShopImpact => ({
  picked_up_units: 12,
  donated_units: 4,
  pending_units: 3,
  cancelled_units: 2,
  expired_units: 1,
  estimated_revenue_cents: 9600,
  estimated_savings_cents: 2400,
  ...overrides,
});

const renderPanel = (revision = 0) =>
  render(<ImpactPanel shopId={5} revision={revision} t={messages} locale="en" />);

describe("ImpactPanel", () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(cleanup);

  it("shows picked-up units apart from donated, pending, cancelled and expired ones", async () => {
    apiMock.shopImpact.mockResolvedValue(impact());

    renderPanel();

    expect(await screen.findByText("12", { selector: "p" })).toBeTruthy();
    expect(screen.getByText(messages.impactDonated)).toBeTruthy();
    expect(screen.getByText(messages.impactPending)).toBeTruthy();
    expect(screen.getByText(messages.impactCancelled)).toBeTruthy();
    expect(screen.getByText(messages.impactExpired)).toBeTruthy();
  });

  it("formats money from cents and labels it as an estimate", async () => {
    apiMock.shopImpact.mockResolvedValue(impact());

    renderPanel();

    expect(await screen.findByText("$96.00")).toBeTruthy();
    expect(screen.getByText("$24.00")).toBeTruthy();
    expect(screen.getByText(messages.impactNote)).toBeTruthy();
  });

  it("describes the outcome bar for assistive technology", async () => {
    apiMock.shopImpact.mockResolvedValue(impact());

    renderPanel();

    const bar = await screen.findByRole("img");
    expect(bar.getAttribute("aria-label")).toContain(`${messages.impactPickedUp}: 12`);
  });

  it("explains that nothing counts before a pickup is confirmed", async () => {
    apiMock.shopImpact.mockResolvedValue(
      impact({
        picked_up_units: 0,
        donated_units: 0,
        pending_units: 0,
        cancelled_units: 0,
        expired_units: 0,
      }),
    );

    renderPanel();

    expect(await screen.findByText(messages.impactEmpty)).toBeTruthy();
  });

  it("reloads the numbers when something changed", async () => {
    apiMock.shopImpact.mockResolvedValue(impact());

    const { rerender } = renderPanel(0);
    await screen.findByText("12", { selector: "p" });
    apiMock.shopImpact.mockResolvedValue(impact({ picked_up_units: 13 }));
    rerender(<ImpactPanel shopId={5} revision={1} t={messages} locale="en" />);

    expect(await screen.findByText("13", { selector: "p" })).toBeTruthy();
    expect(apiMock.shopImpact).toHaveBeenCalledTimes(2);
  });

  it("shows an error message when the numbers cannot be loaded", async () => {
    apiMock.shopImpact.mockRejectedValue(new Error("down"));

    renderPanel();

    expect((await screen.findByRole("alert")).textContent).toBe(messages.impactError);
  });
});
