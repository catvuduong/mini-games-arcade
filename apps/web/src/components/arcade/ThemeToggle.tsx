"use client";

import { setTheme, useTheme } from "@/lib/theme";

export function ThemeToggle() {
  const theme = useTheme();
  const next = theme === "dark" ? "light" : "dark";

  return (
    <button
      type="button"
      className="theme-toggle"
      data-testid="theme-toggle"
      aria-label={`Switch to ${next} theme`}
      onClick={() => setTheme(next)}
    >
      <span aria-hidden="true">{theme === "dark" ? "☀️" : "🌙"}</span>
      {theme === "dark" ? "Light" : "Dark"}
    </button>
  );
}
