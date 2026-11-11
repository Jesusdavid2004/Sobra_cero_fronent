import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import en from "@/i18n/en.json";
import { ApiError, type RescuePlan } from "@/lib/api";

const apiMock = vi.hoisted(() => ({
  rescuePlans: vi.fn(),
  generateRescuePlan: vi.fn(),
  approveRescuePlan: vi.fn(),
  rejectRescuePlan: vi.fn(),
  explainRescuePlan: vi.fn(),
}));

vi.mock("@/lib/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api")>()),
  api: apiMock,
}));

import RescuePlanPanel from "./RescuePlanPanel";

const messages = en as Record<string, string>;

function buildPlan(overrides: Partial<RescuePlan> = {}): RescuePlan {
  return {
    id: 7,
    lot_id: 3,
    shop_id: 1,
    status: "pending_approval",
    action: "apply_discount_rule",
    reasons: ["stock_exceeds_expected_sales", "surplus_above_discount_threshold"],
    available_quantity: 20,
    expected_sales: 14,
    surplus_units: 6,
    proposed_discount_percent: 30,
    horizon_hours: 8,
    data_points: 30,
    rule_version: "rules-v1",
    model_version: "baseline",
    created_at: "2026-11-10T10:00:00Z",
    decided_at: null,
    ...overrides,
  };
}

function renderPanel() {
  return render(
    createElement(RescuePlanPanel, {
      shopId: 1,
      lots: [{ lotId: 3, name: "Bread" }],
      t: messages,
      locale: "en",
    }),
  );
}

describe("RescuePlanPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiMock.rescuePlans.mockResolvedValue([]);
  });
  afterEach(cleanup);

  it("shows the empty state and the heuristic disclaimer when there are no plans", async () => {
    renderPanel();

    expect(await screen.findByText(messages.rescueEmpty)).toBeTruthy();
    expect(screen.getByText(messages.rescueDisclaimer)).toBeTruthy();
  });

  it("renders translated reasons and numbers for a pending plan", async () => {
    apiMock.rescuePlans.mockResolvedValue([buildPlan()]);

    renderPanel();

    expect(
      await screen.findByText(messages.rescueReason_stock_exceeds_expected_sales),
    ).toBeTruthy();
    expect(screen.getByText(messages.rescueActionDiscount)).toBeTruthy();
    expect(screen.getByText("Proposed discount: 30%")).toBeTruthy();
  });

  it("only changes the plan after the owner presses approve", async () => {
    apiMock.rescuePlans.mockResolvedValueOnce([buildPlan()]);
    apiMock.approveRescuePlan.mockResolvedValue(buildPlan({ status: "approved" }));
    apiMock.rescuePlans.mockResolvedValue([buildPlan({ status: "approved" })]);

    renderPanel();
    await screen.findByText(messages.rescueStatusPending);
    expect(apiMock.approveRescuePlan).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText(messages.rescueApprove));

    await waitFor(() => expect(apiMock.approveRescuePlan).toHaveBeenCalledWith(7));
    expect(await screen.findByText(messages.rescueStatusApproved)).toBeTruthy();
    expect(screen.queryByText(messages.rescueApprove)).toBeNull();
  });

  it("generates a plan for the selected lot", async () => {
    apiMock.generateRescuePlan.mockResolvedValue(buildPlan());

    renderPanel();
    await screen.findByText(messages.rescueEmpty);
    fireEvent.click(screen.getByText(`${messages.rescueAnalyzeLot}: Bread`));

    await waitFor(() => expect(apiMock.generateRescuePlan).toHaveBeenCalledWith(3));
  });

  it("shows a translated message when the plan is stale", async () => {
    apiMock.rescuePlans.mockResolvedValue([buildPlan()]);
    apiMock.approveRescuePlan.mockRejectedValue(new ApiError("stale", 409, "rescue_plan_stale"));

    renderPanel();
    await screen.findByText(messages.rescueStatusPending);
    fireEvent.click(screen.getByText(messages.rescueApprove));

    expect((await screen.findByRole("alert")).textContent).toBe(
      messages.rescueError_rescue_plan_stale,
    );
  });

  it("shows an AI-labelled explanation only after the owner asks for it", async () => {
    apiMock.rescuePlans.mockResolvedValue([buildPlan()]);
    apiMock.explainRescuePlan.mockResolvedValue({
      text: "Stock exceeds expected sales.",
      source: "ai",
    });

    renderPanel();
    await screen.findByText(messages.rescueStatusPending);
    expect(apiMock.explainRescuePlan).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText(messages.rescueExplain));

    expect(await screen.findByText("Stock exceeds expected sales.")).toBeTruthy();
    expect(apiMock.explainRescuePlan).toHaveBeenCalledWith(7, "en");
    expect(screen.getByText(messages.rescueAiBadge)).toBeTruthy();
  });

  it("keeps the deterministic reasons visible when the AI is unavailable", async () => {
    apiMock.rescuePlans.mockResolvedValue([buildPlan()]);
    apiMock.explainRescuePlan.mockRejectedValue(
      new ApiError("down", 503, "ai_provider_unavailable"),
    );

    renderPanel();
    await screen.findByText(messages.rescueStatusPending);
    fireEvent.click(screen.getByText(messages.rescueExplain));

    expect((await screen.findByRole("alert")).textContent).toBe(
      messages.rescueError_ai_provider_unavailable,
    );
    expect(screen.getByText(messages.rescueReason_stock_exceeds_expected_sales)).toBeTruthy();
  });
});
