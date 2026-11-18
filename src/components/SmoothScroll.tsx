"use client";

import { useEffect } from "react";
import Lenis from "lenis";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { afterScroll, measureSections, scroll } from "@/lib/scroll";

gsap.registerPlugin(ScrollTrigger);

export let lenis: Lenis | null = null;

export default function SmoothScroll() {
  useEffect(() => {
    history.scrollRestoration = "manual";
    window.scrollTo(0, 0);

    // Snappier catch-up and shorter wheel steps: still silky, but a flick doesn't coast past whole sections.
    // In the work gallery (while it's pinned and sliding sideways) a sideways swipe on a trackpad, or
    // Shift + wheel, moves it too: the sideways amount becomes the scroll. Nothing to see for it (no
    // horizontal scrollbar); everywhere else sideways gestures are left alone.
    const instance = new Lenis({
      lerp: 0.12,
      wheelMultiplier: 0.8,
      virtualScroll: (data) => {
        if (!data.event.type.includes("wheel") || Math.abs(data.deltaX) <= Math.abs(data.deltaY)) return true;
        if (!ScrollTrigger.getById("work-slide")?.isActive) return true;
        data.deltaY = data.deltaX;
        data.deltaX = 0;
        return true;
      },
    });
    lenis = instance;

    const fill = document.querySelector<HTMLElement>(".progress-fill");
    const cue = document.querySelector<HTMLElement>(".scroll-cue");
    let cueAt = "";
    instance.on("scroll", (l: Lenis) => {
      scroll.y = l.scroll;
      scroll.velocity = l.velocity;
      scroll.progress = l.progress;
      scroll.s = l.progress * 3;
      // Read before anything below writes a style: ScrollTrigger reads the scroll position, and after a style
      // write that read makes the browser recalculate the page's styles on the spot.
      ScrollTrigger.update();
      const p = Math.min(1, Math.max(0, l.progress || 0));
      if (fill) fill.style.transform = `scaleX(${p})`;
      // The scroll cue fades over the first bit of scrolling. Set on the cue only (on <html> it re-styled the
      // whole page every frame), and only when it changes; once it's gone its loops stop too.
      const gone = Math.min(1, l.scroll / (window.innerHeight * 0.15)).toFixed(2);
      if (cue && gone !== cueAt) {
        cueAt = gone;
        cue.style.setProperty("--scrolled", gone);
        cue.classList.toggle("is-gone", gone === "1.00");
      }
    });

    // One clock for Lenis + GSAP so pinned/scrubbed animations never drift from the scroll. First in the
    // frame (before GSAP renders its tweens): ScrollTrigger reads the scroll position right here, and read
    // after the tweens have written their styles that read forces a full style + layout pass every frame.
    const tick = (time: number, deltaMs: number) => {
      instance.raf(time * 1000);
      afterScroll.forEach((fn) => fn(time, deltaMs));
    };
    gsap.ticker.add(tick, false, true);
    gsap.ticker.lagSmoothing(0);

    // In-page links: pinned sections report their pinned position, so resolve the start of their pin.
    const onClick = (e: MouseEvent) => {
      const a = (e.target as HTMLElement | null)?.closest<HTMLAnchorElement>('a[href^="#"]');
      if (!a) return;
      const id = a.getAttribute("href")!.slice(1);
      const el = id ? document.getElementById(id) : null;
      if (!id && a.getAttribute("href") !== "#") return;
      e.preventDefault();
      if (!el || id === "top") return instance.scrollTo(0, { duration: 1.6 });
      const pin = ScrollTrigger.getAll().find((st) => st.pin === el || st.trigger === el);
      const target = pin ? pin.start : el.getBoundingClientRect().top + window.scrollY;
      instance.scrollTo(target, { duration: 1.6 });
    };
    document.addEventListener("click", onClick);

    const onRefresh = () => measureSections();
    ScrollTrigger.addEventListener("refresh", onRefresh);
    measureSections();

    return () => {
      gsap.ticker.remove(tick);
      document.removeEventListener("click", onClick);
      ScrollTrigger.removeEventListener("refresh", onRefresh);
      instance.destroy();
      lenis = null;
    };
  }, []);

  return null;
}
