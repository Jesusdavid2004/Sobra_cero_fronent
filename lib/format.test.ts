import { describe, expect, it } from "vitest";

import { fill, formatDateTime } from "./format";

describe("fill", () => {
  it("replaces every placeholder, including repeated ones", () => {
    expect(fill("{a} and {b} and {a}", { a: "x", b: 2 })).toBe("x and 2 and x");
  });

  it("leaves unknown placeholders untouched", () => {
    expect(fill("{known} {unknown}", { known: "ok" })).toBe("ok {unknown}");
  });
});

describe("formatDateTime", () => {
  it("formats an instant in the visitor's zone for each language", () => {
    const iso = "2026-11-16T12:00:00Z";
    const expected = (locale: string) =>
      new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(
        new Date(iso),
      );

    expect(formatDateTime(iso, "en")).toBe(expected("en-US"));
    expect(formatDateTime(iso, "es")).toBe(expected("es-CO"));
  });
});
