import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import en from "@/i18n/en.json";
import type { RunResult, Source } from "@/lib/scanner-schemas";

const apiMock = vi.hoisted(() => ({
  runSource: vi.fn(),
  setSourceEnabled: vi.fn(),
  setSourceSchedule: vi.fn(),
  reviewSourceTerms: vi.fn(),
}));

vi.mock("@/lib/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api")>()),
  api: apiMock,
}));

import { ApiError } from "@/lib/api";

import SourcesTable from "./SourcesTable";

const messages = en as Record<string, string>;

const source = (overrides: Partial<Source> = {}): Source => ({
  key: "exito",
  name: "Éxito pan",
  kind: "jsonld_catalog",
  base_url: "https://www.exito.com/pan",
  enabled: true,
  terms_reviewed: true,
  terms_note: "Read on 2026-11-16",
  license_note: "",
  schedule_minutes: null,
  last_run_at: null,
  last_status: "",
  last_stop_reason: "",
  ...overrides,
});

const run = (overrides: Partial<RunResult> = {}): RunResult => ({
  execution_id: 7,
  status: "succeeded",
  accepted: 3,
  rejected: 1,
  pending: 0,
  duplicates: 0,
  stop_reason: "",
  error: "",
  ...overrides,
});

const renderTable = (sources: Source[], handlers = { onChange: vi.fn(), onRan: vi.fn() }) => {
  render(<SourcesTable sources={sources} t={messages} locale="en" {...handlers} />);
  return handlers;
};

describe("SourcesTable", () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(cleanup);

  it("says when no source is registered", () => {
    renderTable([]);

    expect(screen.getByText("No source registered yet.")).toBeTruthy();
  });

  it("shows whether each source is enabled, whether its terms were reviewed and when it last ran", () => {
    renderTable([
      source(),
      source({ key: "nuevo", name: "Nuevo", enabled: false, terms_reviewed: false }),
    ]);

    expect(screen.getByText("Terms reviewed")).toBeTruthy();
    expect(screen.getByText("Terms not reviewed")).toBeTruthy();
    expect(screen.getAllByText("Never run")).toHaveLength(2);
  });

  it("cannot run a source that is disabled or whose terms were not reviewed", () => {
    renderTable([
      source({ key: "a", name: "A", enabled: false }),
      source({ key: "b", name: "B", terms_reviewed: false }),
    ]);

    for (const button of screen.getAllByRole("button", { name: "Run now" })) {
      expect((button as HTMLButtonElement).disabled).toBe(true);
    }
  });

  it("runs a source and reports the counters", async () => {
    apiMock.runSource.mockResolvedValue(run());
    const { onRan } = renderTable([source()]);

    fireEvent.click(screen.getByRole("button", { name: "Run now" }));

    expect(
      await screen.findByText("Run finished: 3 accepted, 1 rejected, 0 awaiting validation."),
    ).toBeTruthy();
    expect(onRan).toHaveBeenCalledWith(run());
  });

  it("explains why a run stopped instead of showing it as a success", async () => {
    apiMock.runSource.mockResolvedValue(
      run({ status: "stopped", stop_reason: "access_denied", accepted: 0, rejected: 0 }),
    );
    renderTable([source()]);

    fireEvent.click(screen.getByRole("button", { name: "Run now" }));

    expect((await screen.findByRole("alert")).textContent).toBe(
      "The source refused access; the run stopped",
    );
  });

  it("explains a refusal reported by the backend", async () => {
    apiMock.runSource.mockRejectedValue(
      new ApiError("x", 409, "scanner_source_not_runnable", "terms_not_reviewed"),
    );
    renderTable([source()]);

    fireEvent.click(screen.getByRole("button", { name: "Run now" }));

    expect((await screen.findByRole("alert")).textContent).toBe(
      "The terms of this source have not been reviewed.",
    );
  });

  it("enables or disables a source", async () => {
    apiMock.setSourceEnabled.mockResolvedValue(source({ enabled: false }));
    const { onChange } = renderTable([source()]);

    fireEvent.click(screen.getByRole("button", { name: "Disable" }));

    await waitFor(() => expect(onChange).toHaveBeenCalledWith(source({ enabled: false })));
    expect(apiMock.setSourceEnabled).toHaveBeenCalledWith("exito", false);
  });

  it("changes the schedule and can turn it off again", async () => {
    apiMock.setSourceSchedule.mockResolvedValue(source({ schedule_minutes: 360 }));
    const { onChange } = renderTable([source()]);

    fireEvent.change(screen.getByLabelText("Schedule"), { target: { value: "360" } });

    await waitFor(() => expect(onChange).toHaveBeenCalledWith(source({ schedule_minutes: 360 })));
    expect(apiMock.setSourceSchedule).toHaveBeenCalledWith("exito", 360);
  });

  it("opens the terms review inside the source", () => {
    renderTable([source({ enabled: false, terms_reviewed: false })]);

    fireEvent.click(screen.getByRole("button", { name: "Review terms" }));

    expect(screen.getByText("Record the terms review")).toBeTruthy();
  });
});
