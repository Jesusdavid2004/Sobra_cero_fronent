import { describe, expect, it } from "vitest";

import en from "@/i18n/en.json";
import { ApiError } from "@/lib/api";
import type { PricePoint, Source } from "@/lib/scanner-schemas";

import {
  canRun,
  refusalKey,
  scannerErrorMessage,
  scheduleKey,
  sparkline,
  statusKey,
  stopReasonKey,
} from "./scanner";

const messages = en as Record<string, string>;

const source = (overrides: Partial<Source> = {}): Source => ({
  key: "exito",
  name: "Éxito",
  kind: "jsonld_catalog",
  base_url: "https://www.exito.com/pan",
  enabled: true,
  terms_reviewed: true,
  terms_note: "",
  license_note: "",
  schedule_minutes: null,
  last_run_at: null,
  last_status: "",
  last_stop_reason: "",
  ...overrides,
});

const point = (price: number): PricePoint => ({
  observed_at: "2026-11-16T12:00:00Z",
  price_cop: price,
  original_price_cop: null,
  discount_percent: 0,
});

describe("scanner helpers", () => {
  it("a source can run only when it is enabled and its terms were reviewed", () => {
    expect(canRun(source())).toBe(true);
    expect(canRun(source({ enabled: false }))).toBe(false);
    expect(canRun(source({ terms_reviewed: false }))).toBe(false);
  });

  it("builds translation keys for statuses, stop reasons and schedules", () => {
    expect(statusKey("stopped")).toBe("scannerStatus_stopped");
    expect(stopReasonKey("access_denied")).toBe("scannerStop_access_denied");
    expect(scheduleKey(null)).toBe("scannerScheduleOff");
    expect(scheduleKey(360)).toBe("scannerSchedule_360");
  });

  it("splits a refused URL reason into its own key", () => {
    expect(refusalKey("terms_not_reviewed")).toBe("scannerRefusal_terms_not_reviewed");
    expect(refusalKey("url_rejected:not_https")).toBe("scannerUrl_not_https");
  });

  it("translates the reason the backend returns for each kind of failure", () => {
    const notRunnable = new ApiError("x", 409, "scanner_source_not_runnable", "terms_not_reviewed");
    const unsafe = new ApiError("x", 422, "scanner_url_rejected", "private_address");
    const invalid = new ApiError("x", 422, "scanner_source_invalid", "key_taken");

    expect(scannerErrorMessage(messages, notRunnable)).toBe(
      messages.scannerRefusal_terms_not_reviewed,
    );
    expect(scannerErrorMessage(messages, unsafe)).toBe(messages.scannerUrl_private_address);
    expect(scannerErrorMessage(messages, invalid)).toBe(messages.scannerInvalid_key_taken);
  });

  it("translates permission and missing-source errors and falls back to a generic message", () => {
    expect(scannerErrorMessage(messages, new ApiError("x", 403, "scanner_permission_denied"))).toBe(
      messages.scannerErrorForbidden,
    );
    expect(scannerErrorMessage(messages, new ApiError("x", 404, "scanner_source_not_found"))).toBe(
      messages.scannerErrorNotFound,
    );
    expect(scannerErrorMessage(messages, new Error("boom"))).toBe(messages.scannerErrorGeneric);
  });
});

describe("sparkline", () => {
  it("returns nothing without points", () => {
    expect(sparkline([], 100, 20)).toBe("");
  });

  it("puts the cheapest price at the bottom and the dearest at the top, oldest first", () => {
    expect(sparkline([point(5990), point(4990)], 100, 20)).toBe("0.0,0.0 100.0,20.0");
  });

  it("centers a single point and does not divide by zero when the price never changed", () => {
    expect(sparkline([point(5000)], 100, 20)).toBe("50.0,20.0");
    expect(sparkline([point(5000), point(5000)], 100, 20)).toBe("0.0,20.0 100.0,20.0");
  });
});
