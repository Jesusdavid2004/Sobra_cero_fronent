import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import en from "@/i18n/en.json";
import type { WasteEntry } from "@/lib/inventory-schemas";

const apiMock = vi.hoisted(() => ({ shopWaste: vi.fn(), recordWaste: vi.fn() }));

vi.mock("@/lib/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api")>()),
  api: apiMock,
}));

import { ApiError } from "@/lib/api";

import WastePanel from "./WastePanel";

const messages = en as Record<string, string>;
const lots = [
  { lotId: 3, name: "Bread" },
  { lotId: 4, name: "Milk" },
];

const entry: WasteEntry = {
  id: 1,
  lot_id: 3,
  lot_title: "Bread bag",
  quantity: 2,
  reason: "damaged",
  note: "fell",
  created_at: "2026-11-16T12:00:00Z",
};

describe("WastePanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiMock.shopWaste.mockResolvedValue([]);
  });
  afterEach(cleanup);

  const renderPanel = (onRecorded = vi.fn(), available = lots) =>
    render(
      <WastePanel shopId={5} lots={available} t={messages} locale="en" onRecorded={onRecorded} />,
    );

  it("says that waste is what the shop declares, not an estimate", () => {
    renderPanel();

    expect(screen.getByText(/it is what you declare, not an estimate/i)).toBeTruthy();
  });

  it("explains when there is no lot to record waste for", () => {
    renderPanel(vi.fn(), []);

    expect(screen.getByText("There are no lots to record waste for yet.")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Record waste" })).toBeNull();
  });

  it("records the waste with the chosen lot, units, reason and note, then reloads and tells the owner what is left", async () => {
    apiMock.recordWaste.mockResolvedValue({ lot_id: 4, remaining_quantity: 7 });
    const onRecorded = vi.fn();
    renderPanel(onRecorded);

    fireEvent.change(screen.getByLabelText("Lot"), { target: { value: "4" } });
    fireEvent.change(screen.getByLabelText("Units"), { target: { value: "3" } });
    fireEvent.change(screen.getByLabelText("Reason"), { target: { value: "damaged" } });
    fireEvent.change(screen.getByLabelText("Note (optional)"), { target: { value: "  fell " } });
    fireEvent.click(screen.getByRole("button", { name: "Record waste" }));

    expect(await screen.findByText("Recorded. 7 units remain in the lot.")).toBeTruthy();
    expect(apiMock.recordWaste).toHaveBeenCalledWith(4, {
      quantity: 3,
      reason: "damaged",
      note: "fell",
    });
    expect(onRecorded).toHaveBeenCalledOnce();
    expect(apiMock.shopWaste).toHaveBeenCalledTimes(2);
  });

  it("explains a quantity the lot cannot cover", async () => {
    apiMock.recordWaste.mockRejectedValue(
      new ApiError("x", 422, "waste_invalid", "quantity_out_of_range"),
    );
    renderPanel();

    fireEvent.click(screen.getByRole("button", { name: "Record waste" }));

    expect((await screen.findByRole("alert")).textContent).toBe(
      "Choose between one unit and what the lot still holds.",
    );
  });

  it("lists what was recorded with its reason, note and date", async () => {
    apiMock.shopWaste.mockResolvedValue([entry]);
    renderPanel();

    expect(await screen.findByText("Bread bag")).toBeTruthy();
    await waitFor(() => expect(screen.getByText(/2 units, Damaged · fell/)).toBeTruthy());
  });

  it("says when nothing was recorded", async () => {
    renderPanel();

    expect(await screen.findByText("No waste recorded yet.")).toBeTruthy();
  });
});
