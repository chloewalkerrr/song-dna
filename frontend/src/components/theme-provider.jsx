import { useEffect, useState } from "react";
import { ThemeContext } from "@/hooks/use-theme";
import { THEME_STORAGE_KEY, normalizeTheme, toggleTheme } from "@/lib/theme";

function readStoredTheme() {
  try {
    return normalizeTheme(localStorage.getItem(THEME_STORAGE_KEY));
  } catch {
    return "dark";
  }
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(readStoredTheme);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // storage unavailable (e.g. private mode) - the theme just won't persist
    }
  }, [theme]);

  return (
    <ThemeContext.Provider
      value={{ theme, setTheme, toggle: () => setTheme(toggleTheme) }}
    >
      {children}
    </ThemeContext.Provider>
  );
}
