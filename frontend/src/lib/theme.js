export const THEME_STORAGE_KEY = "songdna-theme";

// Dark is the default: anything other than an explicit "light" (missing,
// corrupted, or an unknown value) resolves to dark.
export function normalizeTheme(value) {
  return value === "light" ? "light" : "dark";
}

export function toggleTheme(theme) {
  return theme === "dark" ? "light" : "dark";
}
