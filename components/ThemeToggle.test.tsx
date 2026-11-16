import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  toggleTheme: vi.fn(),
  value: {
    t: {
      themeLabel: "Toggle theme",
      themeMode: "Theme: {mode}",
      themeSystem: "system",
      themeDark: "dark",
      themeLight: "light",
    },
    theme: "dark" as "dark" | "light",
    themePreference: "dark" as "dark" | "light" | "system",
    toggleTheme: undefined as unknown as () => void,
  },
}));

vi.mock("@/providers/AppProviders", () => ({
  useApp: () => ({ ...state.value, toggleTheme: state.toggleTheme }),
}));

import ThemeToggle from "./ThemeToggle";

describe("ThemeToggle", () => {
  beforeEach(() => {
    state.value.theme = "dark";
    state.value.themePreference = "dark";
    state.toggleTheme.mockClear();
  });
  afterEach(cleanup);

  it("renders the neutral light state on the server even when the visitor is in dark mode", () => {
    const html = renderToString(<ThemeToggle />);

    expect(html).toContain("☾");
    expect(html).not.toContain("☀");
    expect(html).toContain("Theme: system");
  });

  it("shows the real theme once it is mounted", async () => {
    render(<ThemeToggle />);

    expect((await screen.findByRole("button", { name: "Toggle theme" })).textContent).toBe("☀");
    expect(screen.getByRole("button").getAttribute("title")).toBe("Theme: dark");
  });

  it("shows the moon for the light theme", async () => {
    state.value.theme = "light";
    state.value.themePreference = "light";
    render(<ThemeToggle />);

    expect((await screen.findByRole("button")).textContent).toBe("☾");
    expect(screen.getByRole("button").getAttribute("title")).toBe("Theme: light");
  });

  it("asks to change the theme when pressed", () => {
    render(<ThemeToggle />);

    fireEvent.click(screen.getByRole("button"));

    expect(state.toggleTheme).toHaveBeenCalledOnce();
  });
});
