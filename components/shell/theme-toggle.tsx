"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

type Theme = "light" | "dark";

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const current = document.documentElement.getAttribute("data-theme");
    setTheme(current === "dark" ? "dark" : "light");
    setMounted(true);
  }, []);

  function toggle() {
    const next: Theme = theme === "light" ? "dark" : "light";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    const oneYear = 60 * 60 * 24 * 365;
    document.cookie = `theme=${next}; path=/; max-age=${String(oneYear)}; SameSite=Lax`;
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={
        mounted ? `Switch to ${theme === "light" ? "dark" : "light"} mode` : "Toggle theme"
      }
      className="text-text-dim hover:text-text inline-flex h-8 w-8 items-center justify-center rounded-sm transition-colors"
    >
      {mounted && theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}
