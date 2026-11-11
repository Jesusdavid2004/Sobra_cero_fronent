import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import en from "@/i18n/en.json";
import type { TimelineEvent } from "@/lib/api";

const apiMock = vi.hoisted(() => ({ lotTimeline: vi.fn() }));

vi.mock("@/lib/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api")>()),
  api: apiMock,
}));

import LotTimeline from "./LotTimeline";

const messages = en as Record<string, string>;

const event = (overrides: Partial<TimelineEvent>): TimelineEvent => ({
  kind: "plan_generated",
  occurred_at: "2026-11-10T09:00:00Z",
  plan_id: 1,
  units: null,
  discount_percent: null,
  ...overrides,
});

const renderTimeline = () => render(<LotTimeline lotId={3} t={messages} locale="en" />);

describe("LotTimeline", () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(cleanup);

  it("tells the story from the recommendation to the pickup, in order", async () => {
    apiMock.lotTimeline.mockResolvedValue([
      event({ kind: "plan_generated" }),
      event({ kind: "plan_approved", occurred_at: "2026-11-10T09:05:00Z" }),
      event({ kind: "reserved", units: 2, plan_id: null, occurred_at: "2026-11-10T10:00:00Z" }),
      event({ kind: "picked_up", units: 2, plan_id: null, occurred_at: "2026-11-10T11:00:00Z" }),
    ]);

    renderTimeline();

    const items = await screen.findAllByRole("listitem");
    expect(items.map((item) => item.querySelector("p")?.textContent)).toEqual([
      messages.timelinePlanGenerated,
      messages.timelinePlanApproved,
      "2 units reserved",
      "2 units picked up",
    ]);
  });

  it("shows the percentage of an applied discount", async () => {
    apiMock.lotTimeline.mockResolvedValue([
      event({ kind: "discount_applied", discount_percent: 30 }),
    ]);

    renderTimeline();

    expect(await screen.findByText("Discount of 30% applied")).toBeTruthy();
  });

  it("marks each event with a machine-readable time", async () => {
    apiMock.lotTimeline.mockResolvedValue([event({ kind: "donated", units: 4, plan_id: null })]);

    const { container } = renderTimeline();

    await screen.findByText("4 units donated");
    expect(container.querySelector("time")?.getAttribute("datetime")).toBe("2026-11-10T09:00:00Z");
  });

  it("explains that nothing has happened yet", async () => {
    apiMock.lotTimeline.mockResolvedValue([]);

    renderTimeline();

    expect(await screen.findByText(messages.timelineEmpty)).toBeTruthy();
  });

  it("shows an error when the history cannot be loaded", async () => {
    apiMock.lotTimeline.mockRejectedValue(new Error("down"));

    renderTimeline();

    expect((await screen.findByRole("alert")).textContent).toBe(messages.timelineError);
  });
});
