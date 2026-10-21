import type { ThemePreference } from "../store/settingsStore";

export type ResolvedTheme = "light" | "dark";

export const DARK_SCHEME_QUERY = "(prefers-color-scheme: dark)";

/** Page background per theme (Tailwind stone-50 / stone-950), for the browser's UI colour. */
const BROWSER_THEME_COLOR: Record<ResolvedTheme, string> = {
  light: "#fafaf9",
  dark: "#0c0a09",
};

export function resolveTheme(
  preference: ThemePreference,
  systemPrefersDark: boolean,
): ResolvedTheme {
  if (preference === "system") return systemPrefersDark ? "dark" : "light";
  return preference;
}

/**
 * Applies a theme to the document: the `dark` class Tailwind's dark variant keys
 * off, native control colours, and the browser toolbar colour.
 * index.html runs the same logic inline before first paint to avoid a flash.
 */
export function applyTheme(
  theme: ResolvedTheme,
  root: HTMLElement = document.documentElement,
): void {
  root.classList.toggle("dark", theme === "dark");
  root.style.colorScheme = theme;
  for (const meta of document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')) {
    meta.content = BROWSER_THEME_COLOR[theme];
  }
}
