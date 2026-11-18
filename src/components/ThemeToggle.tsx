"use client";

import { useEffect, useSyncExternalStore } from "react";
import { currentTheme, followSystem, setTheme, type Theme } from "@/lib/theme";

const subscribe = (cb: () => void) => {
  window.addEventListener("themechange", cb);
  return () => window.removeEventListener("themechange", cb);
};
const server = (): Theme => "light";

// Day / night: a little chrome slide switch (the sky follows, see Backdrop). The sun or the moon rides the knob.
export default function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, currentTheme, server);
  const dark = theme === "dark";
  // The page follows the device's light / dark setting, live.
  useEffect(() => followSystem(), []);
  return (
    <button
      type="button"
      className="theme-switch nav-pill"
      role="switch"
      aria-checked={dark}
      aria-label="Dark mode"
      onClick={() => setTheme(dark ? "light" : "dark")}
    >
      <span className="ts-track" aria-hidden>
        <span className="ts-knob">
          <svg className="ts-sun" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="4.2" />
            <path d="M12 2.5v2.6M12 18.9v2.6M2.5 12h2.6M18.9 12h2.6M5.3 5.3l1.8 1.8M16.9 16.9l1.8 1.8M5.3 18.7l1.8-1.8M16.9 7.1l1.8-1.8" />
          </svg>
          <svg className="ts-moon" viewBox="0 0 24 24">
            <path d="M19.5 14.6A7.8 7.8 0 0 1 9.4 4.5a7.8 7.8 0 1 0 10.1 10.1Z" />
          </svg>
        </span>
      </span>
    </button>
  );
}
