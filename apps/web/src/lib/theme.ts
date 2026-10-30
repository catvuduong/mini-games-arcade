import { useStoredItem, writeItem } from "./storage";

export type Theme = "light" | "dark";

export const THEME_KEY = "arcade:theme";

/** The theme is dark unless the player picked light. */
export function useTheme(): Theme {
  return useStoredItem(THEME_KEY) === "light" ? "light" : "dark";
}

export function setTheme(theme: Theme): void {
  writeItem(THEME_KEY, theme);
  document.documentElement.dataset.theme = theme;
}
