import { describe, expect, it } from "vitest";

import { DiagnosisSchema, WasteEntrySchema } from "./inventory-schemas";

const facts = {
  active_lots: 1,
  units_available: 7,
  lots_expiring_soon: 1,
  units_expiring_soon: 7,
  units_closing_soon: 7,
  picked_up_units: 0,
  delivered_donation_units: 0,
  cancelled_units: 0,
  wasted_units: 1,
  pending_pickup_units: 2,
};

describe("inventory schemas", () => {
  it("accepts a diagnosis whose narrative is missing because the model was unavailable", () => {
    const parsed = DiagnosisSchema.parse({
      facts,
      alerts: ["expiring_soon"],
      limitations: ["forecast_not_included"],
      data_used: ["lots"],
      narrative: null,
      narrative_status: "unavailable",
    });

    expect(parsed.narrative).toBeNull();
  });

  it("rejects a narrative status the backend never sends", () => {
    expect(() =>
      DiagnosisSchema.parse({
        facts,
        alerts: [],
        limitations: [],
        data_used: [],
        narrative: "x",
        narrative_status: "magic",
      }),
    ).toThrow();
  });

  it("only knows the four waste reasons", () => {
    const entry = {
      id: 1,
      lot_id: 2,
      lot_title: "Bread bag",
      quantity: 3,
      reason: "damaged",
      note: "",
      created_at: "2026-11-16T12:00:00Z",
    };

    expect(WasteEntrySchema.parse(entry).reason).toBe("damaged");
    expect(() => WasteEntrySchema.parse({ ...entry, reason: "theft" })).toThrow();
  });
});
