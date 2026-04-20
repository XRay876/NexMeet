export type Theme = "light" | "dark";

const THEME_STORAGE_KEY = "nexmeet-theme";

export function getStoredTheme(): Theme {
  const stored = localStorage.getItem(THEME_STORAGE_KEY);
  if (stored === "light" || stored === "dark") {
    return stored;
  }
  // Default to dark mode
  return "dark";
}

export function saveTheme(theme: Theme): void {
  localStorage.setItem(THEME_STORAGE_KEY, theme);
}

export function applyTheme(theme: Theme): void {
  const html = document.documentElement;
  html.setAttribute("data-theme", theme);
  saveTheme(theme);
}

export function toggleTheme(): Theme {
  const current = getStoredTheme();
  const next = current === "light" ? "dark" : "light";
  applyTheme(next);
  return next;
}
