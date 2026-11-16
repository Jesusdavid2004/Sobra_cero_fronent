"use client";

import { useEffect, useState } from "react";

import { useApp } from "@/providers/AppProviders";

/**
 * The server cannot know the visitor's system theme, so its markup always shows the light state.
 * The real state appears after mount; rendering it earlier would not match the server's HTML
 * and React would report a hydration error on every page for visitors in dark mode.
 */
export default function ThemeToggle() {
  const { t, theme, themePreference, toggleTheme } = useApp();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const preference = mounted ? themePreference : "system";
  const modeName =
    preference === "system" ? t.themeSystem : preference === "dark" ? t.themeDark : t.themeLight;

  return (
    <button
      aria-label={t.themeLabel}
      title={t.themeMode.replace("{mode}", modeName)}
      onClick={toggleTheme}
      className="rounded-full border px-3 py-2 text-sm"
    >
      {mounted && theme === "dark" ? "☀" : "☾"}
    </button>
  );
}
