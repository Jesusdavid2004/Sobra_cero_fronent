import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import en from "@/i18n/en.json";
import type { Source } from "@/lib/scanner-schemas";

const apiMock = vi.hoisted(() => ({ reviewSourceTerms: vi.fn() }));

vi.mock("@/lib/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api")>()),
  api: apiMock,
}));

import { ApiError } from "@/lib/api";

import TermsReviewForm from "./TermsReviewForm";

const messages = en as Record<string, string>;

const source: Source = {
  key: "exito",
  name: "Éxito",
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

describe("TermsReviewForm", () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(cleanup);

  it("will not record a review until the person describes what they checked", () => {
    render(<TermsReviewForm source={source} t={messages} onReviewed={vi.fn()} />);

    const confirm = screen.getByRole("button", { name: "Record review" }) as HTMLButtonElement;
    expect(confirm.disabled).toBe(true);

    fireEvent.change(screen.getByLabelText("What you reviewed"), {
      target: { value: "too short" },
    });
    expect(confirm.disabled).toBe(true);

    fireEvent.change(screen.getByLabelText("What you reviewed"), {
      target: { value: "Read the terms of use and robots.txt on 2026-11-16." },
    });
    expect(confirm.disabled).toBe(false);
  });

  it("records the note and the licence and reports the updated source", async () => {
    const reviewed = { ...source, terms_reviewed: true };
    apiMock.reviewSourceTerms.mockResolvedValue(reviewed);
    const onReviewed = vi.fn();
    render(<TermsReviewForm source={source} t={messages} onReviewed={onReviewed} />);

    fireEvent.change(screen.getByLabelText("What you reviewed"), {
      target: { value: "Read the terms of use and robots.txt on 2026-11-16." },
    });
    fireEvent.change(screen.getByLabelText("Licence note (optional)"), {
      target: { value: "Public pages" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Record review" }));

    await waitFor(() => expect(onReviewed).toHaveBeenCalledWith(reviewed));
    expect(apiMock.reviewSourceTerms).toHaveBeenCalledWith(
      "exito",
      "Read the terms of use and robots.txt on 2026-11-16.",
      "Public pages",
    );
  });

  it("shows a translated error when the backend rejects the note", async () => {
    apiMock.reviewSourceTerms.mockRejectedValue(
      new ApiError("x", 422, "scanner_source_invalid", "invalid_review_note"),
    );
    render(<TermsReviewForm source={source} t={messages} onReviewed={vi.fn()} />);

    fireEvent.change(screen.getByLabelText("What you reviewed"), {
      target: { value: "Read the terms of use and robots.txt." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Record review" }));

    expect((await screen.findByRole("alert")).textContent).toBe(
      "Describe what you reviewed in at least ten characters.",
    );
  });
});
