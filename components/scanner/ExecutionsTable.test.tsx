import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import en from "@/i18n/en.json";
import type { Execution } from "@/lib/scanner-schemas";

const apiMock = vi.hoisted(() => ({ scannerRecords: vi.fn() }));

vi.mock("@/lib/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api")>()),
  api: apiMock,
}));

import ExecutionsTable from "./ExecutionsTable";

const messages = en as Record<string, string>;

const execution = (overrides: Partial<Execution> = {}): Execution => ({
  id: 7,
  source_key: "exito",
  status: "succeeded",
  trigger: "manual",
  started_at: "2026-11-16T12:00:00Z",
  finished_at: "2026-11-16T12:01:00Z",
  accepted: 10,
  rejected: 2,
  pending: 1,
  stop_reason: "",
  error: "",
  ...overrides,
});

describe("ExecutionsTable", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiMock.scannerRecords.mockResolvedValue([]);
  });
  afterEach(cleanup);

  it("says when nothing has run", () => {
    render(<ExecutionsTable executions={[]} t={messages} locale="en" />);

    expect(screen.getByText("No run has happened yet.")).toBeTruthy();
  });

  it("shows the source, how it was started, its status and the three counters", () => {
    render(<ExecutionsTable executions={[execution()]} t={messages} locale="en" />);

    expect(screen.getByText("exito")).toBeTruthy();
    expect(screen.getByText(/Manual/)).toBeTruthy();
    expect(screen.getByText("Succeeded")).toBeTruthy();
    expect(screen.getByText("10 / 2 / 1")).toBeTruthy();
  });

  it("explains why a run was stopped", () => {
    render(
      <ExecutionsTable
        executions={[
          execution({ status: "stopped", stop_reason: "robots_forbidden", rejected: 0 }),
        ]}
        t={messages}
        locale="en"
      />,
    );

    expect(screen.getByText("Stopped")).toBeTruthy();
    expect(screen.getByText("robots.txt forbids this page; nothing was requested")).toBeTruthy();
  });

  it("offers the rejected records only when the run rejected something", async () => {
    render(
      <ExecutionsTable
        executions={[execution({ id: 1, rejected: 0 }), execution({ id: 2, rejected: 3 })]}
        t={messages}
        locale="en"
      />,
    );

    const buttons = screen.getAllByRole("button", { name: "Show rejected records" });
    expect(buttons).toHaveLength(1);

    fireEvent.click(buttons[0]);

    expect(await screen.findByText("This run rejected nothing.")).toBeTruthy();
    expect(apiMock.scannerRecords).toHaveBeenCalledWith(2);
  });
});
