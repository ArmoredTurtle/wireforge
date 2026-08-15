"use client";

import { useEffect, useState } from "react";

const themes = ["armored-turtle", "forge", "slate", "light"] as const;
type Theme = (typeof themes)[number];

const THEME_STORAGE_KEY = "wireforge-theme";

export function ThemeSelector() {
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window === "undefined") return "armored-turtle";
    const saved = localStorage.getItem(THEME_STORAGE_KEY) as Theme | null;
    return saved && themes.includes(saved) ? saved : "armored-turtle";
  });

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  return (
    <label className="theme-picker">
      <span>THEME</span>
      <select
        aria-label="Application theme"
        value={theme}
        onChange={(event) => {
          const value = event.target.value as Theme;
          setTheme(value);
          localStorage.setItem(THEME_STORAGE_KEY, value);
        }}
      >
        <option value="armored-turtle">ArmoredTurtle</option>
        <option value="forge">Forge</option>
        <option value="slate">Slate</option>
        <option value="light">Light</option>
      </select>
    </label>
  );
}
