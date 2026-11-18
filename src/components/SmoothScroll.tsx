"use client";

import { useEffect } from "react";
import Lenis from "lenis";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { measureSections, scroll } from "@/lib/scroll";

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

    // ---------- Resizing: live, and you stay where you were ----------
    // Where you are is kept as a place in the page (which section, how far into it), not as pixels: when
    // the window changes size the gallery's pinned stretch changes length (and crossing the phone breakpoint
    // rebuilds every animation, during which ScrollTrigger measures from the top and used to leave you
    // there). After every re-measure the page goes straight back to that same place.
    type Box = { top: number; h: number };
    let boxes: Box[] = [];
    const layout = () => {
      boxes = Array.from(document.querySelectorAll<HTMLElement>("[data-section]")).map((el) => {
        const box = el.parentElement?.classList.contains("pin-spacer") ? el.parentElement : el;
        return { top: box.getBoundingClientRect().top + window.scrollY, h: Math.max(1, box.offsetHeight) };
      });
    };
    const toPlace = (y: number) => {
      let i = 0;
      while (i + 1 < boxes.length && boxes[i + 1].top <= y) i++;
      const b = boxes[i];
      return b ? { i, f: (y - b.top) / b.h } : null;
    };
    let place: { i: number; f: number } | null = null;
    // While a resize is under way the place stays as it was before it (the scroll jumps around meanwhile).
    let holding = false;
    let lastW = window.innerWidth;
    const coarse = window.matchMedia("(pointer: coarse)").matches;
    let liveAt = 0;
    let liveRaf = 0;
    const onResize = () => {
      // Phones resize for every move of the browser's bars: only a change of width is a real resize there.
      if (coarse && window.innerWidth === lastW) return;
      lastW = window.innerWidth;
      holding = true;
      // Re-measure while the window is being dragged (a few times a second), not only once it's let go.
      if (liveRaf) return;
      liveRaf = requestAnimationFrame(() => {
        liveRaf = 0;
        const now = performance.now();
        if (now - liveAt < 110) return;
        liveAt = now;
        ScrollTrigger.refresh();
      });
    };
    window.addEventListener("resize", onResize);

    instance.on("scroll", (l: Lenis) => {
      if (!holding) place = toPlace(l.scroll);
      scroll.y = l.scroll;
      scroll.velocity = l.velocity;
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
    const tick = (time: number) => instance.raf(time * 1000);
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

    const onRefresh = () => {
      layout();
      if (holding && place && boxes[place.i]) {
        const b = boxes[place.i];
        instance.resize();
        instance.scrollTo(Math.max(0, Math.min(instance.limit, b.top + place.f * b.h)), { immediate: true, force: true });
        ScrollTrigger.update();
        // Let go once the resizing has stopped (the last re-measure has run).
        requestAnimationFrame(() => (holding = !!liveRaf));
      }
      measureSections();
    };
    ScrollTrigger.addEventListener("refresh", onRefresh);
    layout();
    measureSections();

    return () => {
      gsap.ticker.remove(tick);
      document.removeEventListener("click", onClick);
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(liveRaf);
      ScrollTrigger.removeEventListener("refresh", onRefresh);
      instance.destroy();
      lenis = null;
    };
  }, []);

  return null;
}
