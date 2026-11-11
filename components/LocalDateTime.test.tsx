import { cleanup, render, screen } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, it } from "vitest";

import LocalDateTime from "./LocalDateTime";

const ISO = "2026-11-10T12:34:17Z";

describe("LocalDateTime", () => {
  afterEach(cleanup);

  it("renders the server markup in UTC so it never depends on the server's time zone", () => {
    const html = renderToString(<LocalDateTime iso={ISO} locale="en" />);

    expect(html).toContain("12:34:17");
    expect(html).toContain("UTC");
    expect(html).toContain(`dateTime="${ISO}"`);
  });

  it("switches to the visitor's own time zone after mounting", async () => {
    render(<LocalDateTime iso={ISO} locale="en" />);

    const expected = new Intl.DateTimeFormat("en-US", {
      dateStyle: "short",
      timeStyle: "medium",
    }).format(new Date(ISO));

    expect((await screen.findByText(expected)).tagName).toBe("TIME");
  });
});
