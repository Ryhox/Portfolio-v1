"use client";

import { useEffect } from "react";
import { player } from "./ipod/player";

// Where you are, on the tab: which part of the page fills the middle of the screen. And while you're away, a
// little nudge to come back (a note in front of it while a song is still playing).
const PLACES: [string, string][] = [
  ["#top", "ryhox"],
  ["#about", "ryhox » about"],
  [".skills", "ryhox » what i do"],
  ["#work", "ryhox » selected work"],
  ["#contact", "ryhox » say hi"],
];
const AWAY = "psst, come back (´• ω •`)";

export default function TabTitle() {
  useEffect(() => {
    const els = PLACES.map(([sel]) => document.querySelector<HTMLElement>(sel));
    const inMiddle = new Set<number>();
    let here = PLACES[0][1];
    const show = () => {
      document.title = document.hidden ? (player.playing ? "♪ " : "") + AWAY : here;
    };
    // The most specific part crossing the middle of the screen wins ("what i do" sits inside "about").
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          const i = els.indexOf(e.target as HTMLElement);
          if (e.isIntersecting) inMiddle.add(i);
          else inMiddle.delete(i);
        }
        const i = Math.max(-1, ...inMiddle);
        here = PLACES[i >= 0 ? i : 0][1];
        show();
      },
      { rootMargin: "-50% 0px -50% 0px" },
    );
    els.forEach((el) => el && io.observe(el));
    document.addEventListener("visibilitychange", show);
    show();
    return () => {
      io.disconnect();
      document.removeEventListener("visibilitychange", show);
    };
  }, []);

  return null;
}
