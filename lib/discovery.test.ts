import { describe, expect, it } from "vitest";

import {
  applyIntent,
  clockToDate,
  EMPTY_FORM,
  intentFoundNothing,
  resolveWindow,
  toBudgetCents,
} from "./discovery";

const NOW = new Date(2026, 10, 10, 12, 0, 0);

describe("clockToDate", () => {
  it("places an HH:MM time on the same local day", () => {
    const date = clockToDate("17:30", NOW);

    expect(date?.getHours()).toBe(17);
    expect(date?.getMinutes()).toBe(30);
    expect(date?.getDate()).toBe(NOW.getDate());
  });

  it.each(["", "5pm", "24:00", "12:60"])("rejects %j", (clock) => {
    expect(clockToDate(clock, NOW)).toBeNull();
  });
});

describe("resolveWindow", () => {
  it("defaults to the next three hours", () => {
    const window = resolveWindow("", "", NOW);

    expect(window?.start).toEqual(NOW);
    expect(window?.end.getTime()).toBe(NOW.getTime() + 3 * 3_600_000);
  });

  it("uses the clock times the customer entered", () => {
    const window = resolveWindow("17:00", "18:30", NOW);

    expect(window?.start.getHours()).toBe(17);
    expect(window?.end.getMinutes()).toBe(30);
  });

  it("rejects a window that ends before it starts", () => {
    expect(resolveWindow("18:00", "17:00", NOW)).toBeNull();
  });
});

describe("toBudgetCents", () => {
  it("converts the amount to cents", () => {
    expect(toBudgetCents("8.5")).toBe(850);
  });

  it.each(["", "abc", "-3"])("ignores %j", (value) => {
    expect(toBudgetCents(value)).toBeUndefined();
  });
});

describe("applyIntent", () => {
  it("fills only the fields the model found", () => {
    const form = applyIntent(EMPTY_FORM, {
      budget: 10000,
      pickup_from: "17:00",
      pickup_until: null,
      quantity: null,
      category: "bakery",
    });

    expect(form).toEqual({
      budget: "10000",
      from: "17:00",
      until: "",
      quantity: "1",
      category: "bakery",
    });
  });

  it("ignores a category the app does not have", () => {
    const form = applyIntent(EMPTY_FORM, {
      budget: null,
      pickup_from: null,
      pickup_until: null,
      quantity: null,
      category: "spaceships",
    });

    expect(form.category).toBe("");
  });

  it("reports when the text held nothing usable", () => {
    expect(
      intentFoundNothing({
        budget: null,
        pickup_from: null,
        pickup_until: null,
        quantity: null,
        category: null,
      }),
    ).toBe(true);
  });
});
