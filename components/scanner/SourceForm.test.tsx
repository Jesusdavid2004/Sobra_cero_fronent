import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import en from "@/i18n/en.json";
import type { Source } from "@/lib/scanner-schemas";

const apiMock = vi.hoisted(() => ({ registerSource: vi.fn() }));

vi.mock("@/lib/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api")>()),
  api: apiMock,
}));

import { ApiError } from "@/lib/api";

import SourceForm from "./SourceForm";

const messages = en as Record<string, string>;

const created: Source = {
  key: "exito-pan",
  name: "Éxito pan",
  kind: "jsonld_catalog",
  base_url: "https://www.exito.com/pan",
  enabled: false,
  terms_reviewed: false,
  terms_note: "",
  license_note: "",
  schedule_minutes: null,
  last_run_at: null,
  last_status: "",
  last_stop_reason: "",
};

const fillForm = () => {
  fireEvent.change(screen.getByLabelText("Key (lowercase, numbers, hyphens)"), {
    target: { value: "exito-pan" },
  });
  fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Éxito pan" } });
  fireEvent.change(screen.getByLabelText("Kind of source"), {
    target: { value: "jsonld_catalog" },
  });
  fireEvent.change(screen.getByLabelText("Address (HTTPS, on an allowed domain)"), {
    target: { value: "https://www.exito.com/pan" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Register source" }));
};

describe("SourceForm", () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(cleanup);

  it("warns that a new source starts disabled and unreviewed", () => {
    render(<SourceForm t={messages} onCreated={vi.fn()} />);

    expect(screen.getByText(/starts disabled and unreviewed/)).toBeTruthy();
  });

  it("registers the source and reports it", async () => {
    apiMock.registerSource.mockResolvedValue(created);
    const onCreated = vi.fn();
    render(<SourceForm t={messages} onCreated={onCreated} />);

    fillForm();

    await waitFor(() => expect(onCreated).toHaveBeenCalledWith(created));
    expect(apiMock.registerSource).toHaveBeenCalledWith({
      key: "exito-pan",
      name: "Éxito pan",
      kind: "jsonld_catalog",
      base_url: "https://www.exito.com/pan",
      license_note: "",
    });
  });

  it("explains why an unsafe address was refused", async () => {
    apiMock.registerSource.mockRejectedValue(
      new ApiError("x", 422, "scanner_url_rejected", "private_address"),
    );
    render(<SourceForm t={messages} onCreated={vi.fn()} />);

    fillForm();

    expect((await screen.findByRole("alert")).textContent).toBe(
      "That domain points to a private network address.",
    );
  });

  it("explains a duplicated key", async () => {
    apiMock.registerSource.mockRejectedValue(
      new ApiError("x", 422, "scanner_source_invalid", "key_taken"),
    );
    render(<SourceForm t={messages} onCreated={vi.fn()} />);

    fillForm();

    expect((await screen.findByRole("alert")).textContent).toBe(
      "A source with that key already exists.",
    );
  });
});
