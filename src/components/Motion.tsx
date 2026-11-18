"use client";

import { useEffect } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { scroll, sky } from "@/lib/scroll";
import { stage } from "@/lib/stage";
import { intro } from "@/lib/intro";
import Snap from "lenis/snap";
import { lenis } from "./SmoothScroll";
import { cloudPass } from "./CloudPass";
import { sfx } from "./ipod/clicker";

gsap.registerPlugin(ScrollTrigger);

// How far down the "o" glyph box its top edge sits (the box has room above the caps for the reveal).
const PERCH_TOP = 0.24;

// All scroll choreography for the DOM layer. Runs once `ready` flips (after the preloader).
export default function Motion({ ready, onReady }: { ready: boolean; onReady?: () => void }) {
  useEffect(() => {
    if (!ready) return;
    let raf = 0;
    const ctx = gsap.context(() => {
      const mm = gsap.matchMedia();

      // ---------- Project videos: load + play only near the viewport, pause off-screen ----------
      // The AV1 cut where the browser can play it, the H.264 clip everywhere else.
      const av1 = document.createElement("video").canPlayType('video/mp4; codecs="av01.0.05M.08"') !== "";
      const clipOf = (v: HTMLVideoElement) => (av1 && v.dataset.av1) || v.dataset.src || "";
      const videos = gsap.utils.toArray<HTMLVideoElement>(".panel-img");
      // Starting a clip (spinning up its decoder, the first frame) is a hitch. So they all start as the
      // gallery comes near (behind the clouds), one at a time, keep playing the whole way through it (no
      // stop-start as panels slide by) and stop when you've left it.
      const queue: HTMLVideoElement[] = [];
      let starting = 0;
      const startNext = () => {
        starting = 0;
        const v = queue.shift();
        if (!v) return;
        if (!v.src && v.dataset.src) v.src = clipOf(v);
        v.play().catch(() => undefined);
        if (queue.length) starting = window.setTimeout(startNext, 180);
      };
      const io = new IntersectionObserver(
        (entries) => {
          for (const e of entries) {
            const v = e.target as HTMLVideoElement;
            if (e.isIntersecting) {
              if (v.paused && !queue.includes(v)) queue.push(v);
            } else {
              const i = queue.indexOf(v);
              if (i >= 0) queue.splice(i, 1);
              if (!v.paused) v.pause();
            }
          }
          if (queue.length && !starting) starting = window.setTimeout(startNext, 0);
        },
        // Sideways the whole gallery counts as near; up and down, a good screen ahead.
        { rootMargin: "80% 1000% 80% 1000%" },
      );
      videos.forEach((v) => io.observe(v));
      // Quietly buffer every clip in the background shortly after the intro, so they are instant later
      // (desktop only: on phones / data saver they load just before they scroll into view).
      const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData;
      const coarse = window.matchMedia("(pointer: coarse)").matches;
      const buffer = window.setTimeout(() => {
        if (saveData || coarse) return;
        videos.forEach((v) => {
          if (!v.src && v.dataset.src) {
            v.preload = "auto";
            v.src = clipOf(v);
          }
        });
      }, 6000);

      // ---------- Statement: words light up as you read ----------
      // (Opacity and a small rise only: a live blur on every word had the GPU redraw each one every frame.)
      gsap.fromTo(
        ".statement .w",
        { opacity: 0.1, y: "0.12em" },
        {
          opacity: 1,
          y: 0,
          ease: "none",
          stagger: 0.12,
          scrollTrigger: { trigger: ".statement", start: "top 82%", end: "bottom 42%", scrub: true },
        },
      );
      // Highlighter strokes draw in word by word, just after the words light up.
      gsap.utils.toArray<HTMLElement>(".statement .mark").forEach((el) => {
        gsap.fromTo(
          el,
          { "--mark": 0 },
          { "--mark": 1, ease: "none", scrollTrigger: { trigger: el, start: "top 72%", end: "top 52%", scrub: true } },
        );
      });

      const aboutOffs: (() => void)[] = [];

      // ---------- Quotes: the letters come flying in from all over the screen ----------
      // Every letter starts somewhere wild (far off to a side, tumbling, huge or tiny, faded out) and the scroll
      // reels them all in; by the time the quote is in the middle of the screen it reads as a sentence. (No
      // blur on them: hundreds of live blurs were the main thing dropping frames here.)
      gsap.utils.toArray<HTMLElement>(".quote").forEach((q) => {
        const rnd = gsap.utils.random;
        gsap.fromTo(
          q.querySelectorAll(".qc"),
          {
            x: () => rnd(-0.55, 0.55) * window.innerWidth,
            y: () => rnd(-0.45, 0.6) * window.innerHeight,
            z: () => rnd(-400, 600),
            rotation: () => rnd(-200, 200),
            rotationX: () => rnd(-120, 120),
            rotationY: () => rnd(-120, 120),
            scale: () => rnd(0.2, 2.6),
            opacity: 0,
          },
          {
            x: 0,
            y: 0,
            z: 0,
            rotation: 0,
            rotationX: 0,
            rotationY: 0,
            scale: 1,
            opacity: 1,
            ease: "power2.out",
            stagger: { each: 0.012, from: "random" },
            scrollTrigger: { trigger: q, start: "top bottom", end: "center 58%", scrub: 0.6, invalidateOnRefresh: true },
          },
        );
        gsap.from(q.querySelectorAll(".quote-by > *"), {
          y: 20,
          opacity: 0,
          stagger: 0.1,
          duration: 1,
          ease: "expo.out",
          scrollTrigger: { trigger: q, start: "center 62%", toggleActions: "play none none reverse" },
        });
      });

      // ---------- What I do: rows of Liquid Glass capsules (Stack.tsx), scrubbed like pokyhlabs ----------
      // Everything here follows the scroll both ways: the heading's letters rise out of their masks, each row's
      // rule draws across, its title rises, its words come up, and its capsules drop in one after another like
      // drops of glass landing (a soft pop each, on the way down).
      const reducedAll = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (!reducedAll) {
        gsap
          .timeline({ scrollTrigger: { trigger: ".skills-heading", start: "top 96%", end: "top 52%", scrub: 1 } })
          .fromTo(".skills-heading .char", { yPercent: 150, rotate: 10 }, { yPercent: 0, rotate: 0, stagger: 0.035, duration: 0.9, ease: "expo.out" });

        gsap.utils.toArray<HTMLElement>(".st-row").forEach((row) => {
          const caps = row.querySelectorAll<HTMLElement>(".cap");
          const tl = gsap.timeline({
            scrollTrigger: {
              trigger: row,
              start: "top 94%",
              end: "top 46%",
              scrub: 0.9,
              onUpdate: (self) => {
                // A pop for each capsule as it lands (only scrolling down, and not when flung far past).
                const landed = Math.floor(Math.max(0, (self.progress - 0.38) / 0.62) * caps.length + 0.0001);
                const was = Number(row.dataset.landed ?? 0);
                if (landed > was && self.direction > 0 && Math.abs(self.getVelocity()) < 4000) sfx("pop", 0.85 + landed * 0.07);
                row.dataset.landed = String(landed);
              },
            },
          });
          tl.fromTo(row.querySelector(".st-rule"), { scaleX: 0 }, { scaleX: 1, duration: 1, ease: "power2.inOut" }, 0)
            .fromTo(row.querySelectorAll(".st-title .char"), { yPercent: 150 }, { yPercent: 0, stagger: 0.03, duration: 0.7, ease: "expo.out" }, 0.12)
            .fromTo(row.querySelectorAll(".st-line, .ab-proof"), { y: 26, opacity: 0 }, { y: 0, opacity: 1, stagger: 0.08, duration: 0.6, ease: "power3.out" }, 0.28)
            // Drops of glass: one after another each fades in, rises into place and settles to full size, the
            // glass under it with it (Backdrop.tsx). Upright the whole way; continuous, so it stays smooth
            // however fast you scroll.
            .fromTo(
              caps,
              { autoAlpha: 0, y: 30, scale: 0.9 },
              { autoAlpha: 1, y: 0, scale: 1, stagger: 0.09, duration: 0.6, ease: "power3.out" },
              0.38,
            );
        });
        const end = document.querySelector(".st-end .st-rule");
        if (end) gsap.fromTo(end, { scaleX: 0 }, { scaleX: 1, ease: "power2.inOut", scrollTrigger: { trigger: end, start: "top 96%", end: "top 70%", scrub: 0.9 } });
      }

      // The clouds thicken behind the tech stack while it's on screen (Backdrop.tsx), for its glass to bend.
      ScrollTrigger.create({
        trigger: ".skills",
        start: "top 85%",
        end: "bottom 15%",
        onUpdate: (self) => {
          const p = self.progress;
          sky.dense = Math.max(0, Math.min(1, p / 0.12, (1 - p) / 0.12));
        },
        onLeave: () => (sky.dense = 0),
        onLeaveBack: () => (sky.dense = 0),
      });

      // ---------- Hero: the cat's perch is the top of the "o" in the name ----------
      // Only while the cat's stage is on the page: measuring the letter every frame forces the browser to lay
      // the page out again mid-frame, which is pure cost when nobody stands on it.
      const perchEl = document.querySelector(".stage-canvas") ? document.querySelector<HTMLElement>("[data-perch] .char") : null;
      let perchAt = 0;
      const perchTick = () => {
        const p = stage.perch;
        if (!perchEl) return;
        const r = perchEl.getBoundingClientRect();
        const now = performance.now() / 1000;
        const dt = perchAt ? Math.min(0.1, now - perchAt) : 0;
        perchAt = now;
        // The glyph's top edge sits a fixed fraction down its box (the box has room above the caps).
        const x = r.left + r.width / 2;
        const y = r.top + r.height * PERCH_TOP;
        if (dt > 0) {
          p.vx = (x - p.x) / dt;
          p.vy = (y - p.y) / dt;
        }
        p.x = x;
        p.y = y;
        // Only once the name has risen into place, and while it's on screen.
        p.valid = now - intro.at > 1.6 && r.bottom > 0 && r.top < window.innerHeight * 0.92;
      };
      if (perchEl) gsap.ticker.add(perchTick);
      aboutOffs.push(() => {
        gsap.ticker.remove(perchTick);
        stage.perch.valid = false;
      });


      // "Seen in" links fly to the project, wherever it sits in the (sideways) gallery.
      const gotoProject = (e: Event) => {
        const a = e.currentTarget as HTMLAnchorElement;
        const panel = document.getElementById(`project-${a.dataset.goto}`);
        if (!panel || !lenis) return;
        e.preventDefault();
        e.stopPropagation();
        const workPin = ScrollTrigger.getAll().find((st) => st.pin === document.querySelector(".work"));
        const track = document.querySelector<HTMLElement>(".work-track");
        if (workPin && track) {
          const distance = track.scrollWidth - window.innerWidth;
          const center = panel.offsetLeft + panel.offsetWidth / 2 - window.innerWidth / 2;
          lenis.scrollTo(workPin.start + Math.min(1, Math.max(0, center / distance)) * (workPin.end - workPin.start), { duration: 2 });
        } else lenis.scrollTo(panel.getBoundingClientRect().top + window.scrollY - window.innerHeight * 0.14, { duration: 1.8 });
      };
      const gotoLinks = gsap.utils.toArray<HTMLAnchorElement>("[data-goto]");
      gotoLinks.forEach((a) => a.addEventListener("click", gotoProject));
      aboutOffs.push(() => gotoLinks.forEach((a) => a.removeEventListener("click", gotoProject)));

      // ---------- Work: pinned horizontal gallery ----------
      mm.add("(min-width: 900px) and (pointer: fine)", () => {
        // Proximity snapping: only kicks in when you stop close to a resting point, so nothing is skipped
        // and you're never yanked far. Rebuilt whenever ScrollTrigger re-measures the page.
        if (!lenis) return;
        const snap = new Snap(lenis, {
          type: "proximity",
          distanceThreshold: "22%",
          debounce: 260,
          duration: 0.9,
          easing: (x: number) => 1 - Math.pow(1 - x, 4),
        });
        let remove: (() => void)[] = [];
        const build = () => {
          remove.forEach((r) => r());
          remove = [];
          const vh = window.innerHeight;
          const vw = window.innerWidth;
          const abs = (sel: string) => {
            const el = document.querySelector(sel);
            return el ? el.getBoundingClientRect().top + window.scrollY : null;
          };
          const points: number[] = [0];
          const pin = ScrollTrigger.getAll().find((st) => st.pin === document.querySelector(".work"));
          const track = document.querySelector<HTMLElement>(".work-track");
          if (pin && track) {
            points.push(pin.start);
            const distance = track.scrollWidth - vw;
            document.querySelectorAll<HTMLElement>(".panel, .panel-more").forEach((panel) => {
              const center = panel.offsetLeft + panel.offsetWidth / 2 - vw / 2;
              const p = Math.min(1, Math.max(0, center / distance));
              points.push(pin.start + p * (pin.end - pin.start));
            });
          }
          const contact = abs(".contact");
          if (contact !== null) points.push(contact);
          points.push(document.documentElement.scrollHeight - vh);
          remove = points.map((v) => snap.add(Math.round(v)));
        };
        build();
        ScrollTrigger.addEventListener("refresh", build);
        return () => {
          ScrollTrigger.removeEventListener("refresh", build);
          snap.destroy();
        };
      });

      mm.add("(min-width: 900px)", () => {
        const track = document.querySelector<HTMLElement>(".work-track")!;
        const distance = () => track.scrollWidth - window.innerWidth;
        const slide = gsap.to(track, {
          x: () => -distance(),
          ease: "none",
          scrollTrigger: {
            // (Sideways swipes drive it too while it's pinned, SmoothScroll.tsx.)
            id: "work-slide",
            trigger: ".work",
            pin: true,
            start: "top top",
            end: () => "+=" + distance() * 1.1,
            scrub: true,
            invalidateOnRefresh: true,
          },
        });

        // (The heading has no reveal of its own here: it forms in the sunbreak inside the clouds, exactly where
        // it sits, and is handed over to this one as the clouds clear, CloudPass.tsx.)

        gsap.utils.toArray<HTMLElement>(".panel").forEach((panel) => {
          const media = panel.querySelector(".panel-media");
          const img = panel.querySelector(".panel-img");
          const title = panel.querySelector(".panel-label");
          const rest = panel.querySelectorAll(".panel-index, .panel-desc, .panel-meta, .panel-actions > *");

          // Image wipes open from the right, then drifts inside its frame.
          gsap.fromTo(
            media,
            { clipPath: "inset(12% 0% 12% 100% round 28px)" },
            {
              clipPath: "inset(0% 0% 0% 0% round 28px)",
              ease: "none",
              scrollTrigger: { trigger: panel, containerAnimation: slide, start: "left 100%", end: "left 40%", scrub: true },
            },
          );
          gsap.fromTo(
            img,
            { xPercent: -4, scale: 1.1 },
            {
              xPercent: 4,
              scale: 1.02,
              ease: "none",
              scrollTrigger: { trigger: panel, containerAnimation: slide, start: "left right", end: "right left", scrub: true },
            },
          );
          // The name's glass label lands as one piece, like a drop of glass.
          gsap.from(title, {
            y: 26,
            scale: 0.86,
            opacity: 0,
            duration: 0.9,
            ease: "back.out(1.8)",
            scrollTrigger: { trigger: panel, containerAnimation: slide, start: "left 70%", toggleActions: "play none none reverse" },
          });
          gsap.from(rest, {
            opacity: 0,
            y: 24,
            stagger: 0.08,
            duration: 0.9,
            ease: "expo.out",
            scrollTrigger: { trigger: panel, containerAnimation: slide, start: "left 60%", toggleActions: "play none none reverse" },
          });
        });

        const more = document.querySelector(".panel-more");
        if (more) {
          gsap.from(more.querySelectorAll(".char"), {
            yPercent: 150,
            rotate: 12,
            stagger: 0.03,
            duration: 1.1,
            ease: "expo.out",
            scrollTrigger: { trigger: more, containerAnimation: slide, start: "left 75%", toggleActions: "play none none reverse" },
          });
          gsap.from(more.querySelector(".more-link"), {
            scale: 0.3,
            rotate: -40,
            autoAlpha: 0,
            duration: 1.2,
            ease: "elastic.out(1, 0.5)",
            scrollTrigger: { trigger: more, containerAnimation: slide, start: "left 65%", toggleActions: "play none none reverse" },
          });
        }

        // Panels lean into the scroll speed.
        const panels = gsap.utils.toArray<HTMLElement>(".panel");
        const lean = panels.map((p) => gsap.quickTo(p, "skewX", { duration: 0.9, ease: "power3.out" }));
        // Only while the gallery is on screen, and only when the lean actually changes (re-aiming six tweens at
        // panels nobody can see, every frame of scrolling anywhere on the page, was all cost).
        let leaning = 0;
        const leanTick = () => {
          const s = slide.scrollTrigger?.isActive ? Math.round(gsap.utils.clamp(-3, 3, -scroll.velocity * 0.12) * 20) / 20 : 0;
          if (s === leaning) return;
          leaning = s;
          lean.forEach((q) => q(s));
        };
        gsap.ticker.add(leanTick);
        return () => gsap.ticker.remove(leanTick);
      });

      mm.add("(max-width: 899px)", () => {
        gsap.utils.toArray<HTMLElement>(".panel").forEach((panel) => {
          gsap.fromTo(
            panel.querySelector(".panel-media"),
            { clipPath: "inset(20% 10% 20% 10% round 20px)" },
            {
              clipPath: "inset(0% 0% 0% 0% round 20px)",
              ease: "none",
              scrollTrigger: { trigger: panel, start: "top 95%", end: "top 45%", scrub: true },
            },
          );
          gsap.from(panel.querySelector(".panel-label"), {
            y: 22,
            scale: 0.88,
            opacity: 0,
            duration: 0.9,
            ease: "back.out(1.8)",
            scrollTrigger: { trigger: panel, start: "top 70%", toggleActions: "play none none reverse" },
          });
          gsap.from(panel.querySelectorAll(".panel-desc, .panel-meta, .panel-actions > *"), {
            opacity: 0,
            y: 24,
            stagger: 0.08,
            duration: 0.9,
            ease: "expo.out",
            scrollTrigger: { trigger: panel, start: "top 60%", toggleActions: "play none none reverse" },
          });
        });
      });

      // ---------- About → Work: the flight through the clouds (CloudPass.tsx) ----------
      // After the tech stack's last row has had its moment, the bank rises in through the open sky below it,
      // covers the screen while the page swaps behind it, and is gone by the time the gallery pins (that's a
      // resting point, so you never stop in half a cloud; on phones, where nothing pins, just past the heading).
      ScrollTrigger.create({
        trigger: ".work",
        start: "top 170%",
        end: () => (window.innerWidth >= 900 ? "top top" : "top -20%"),
        invalidateOnRefresh: true,
        onUpdate: (self) => (cloudPass.target = self.progress),
        onLeave: () => (cloudPass.target = 1),
        onLeaveBack: () => (cloudPass.target = 0),
      });

      // ---------- Contact: giant "Say hi" rises and swells ----------
      gsap.fromTo(
        ".sayhi .char",
        { yPercent: 150, rotate: 14, scale: 0.6 },
        {
          yPercent: 0,
          rotate: 0,
          scale: 1,
          stagger: 0.08,
          ease: "power3.out",
          scrollTrigger: { trigger: ".contact", start: "top 85%", end: "top 15%", scrub: true },
        },
      );
      gsap.from(".contact-links li", {
        y: 60,
        opacity: 0,
        stagger: 0.1,
        duration: 1.1,
        ease: "expo.out",
        scrollTrigger: { trigger: ".contact-links", start: "top 95%", toggleActions: "play none none reverse" },
      });

      // ---------- Nav hides on the way down, returns on the way up ----------
      const nav = document.querySelector(".nav");
      ScrollTrigger.create({
        start: 120,
        end: "max",
        onUpdate: (self) => gsap.to(nav, { yPercent: self.direction > 0 ? -140 : 0, duration: 0.6, ease: "expo.out", overwrite: true }),
      });

      // ---------- Project media tilts toward the pointer ----------
      const tilts = gsap.utils.toArray<HTMLElement>(".panel").map((panel) => {
        const media = panel.querySelector<HTMLElement>(".panel-media")!;
        const img = panel.querySelector<HTMLElement>(".panel-img")!;
        const rx = gsap.quickTo(media, "rotationX", { duration: 0.8, ease: "power3.out" });
        const ry = gsap.quickTo(media, "rotationY", { duration: 0.8, ease: "power3.out" });
        const tx = gsap.quickTo(img, "x", { duration: 0.8, ease: "power3.out" });
        const ty = gsap.quickTo(img, "y", { duration: 0.8, ease: "power3.out" });
        const move = (e: PointerEvent) => {
          const r = media.getBoundingClientRect();
          const nx = (e.clientX - r.left) / r.width - 0.5;
          const ny = (e.clientY - r.top) / r.height - 0.5;
          rx(-ny * 10);
          ry(nx * 12);
          tx(-nx * 30);
          ty(-ny * 20);
        };
        const leave = () => {
          rx(0);
          ry(0);
          tx(0);
          ty(0);
        };
        panel.addEventListener("pointermove", move);
        panel.addEventListener("pointerleave", leave);
        return () => {
          panel.removeEventListener("pointermove", move);
          panel.removeEventListener("pointerleave", leave);
        };
      });

      // ---------- Magnetic links ----------
      const magnets = gsap.utils.toArray<HTMLElement>("[data-magnetic]");
      const cleanups = magnets.map((el) => {
        const x = gsap.quickTo(el, "x", { duration: 0.6, ease: "elastic.out(1, 0.4)" });
        const y = gsap.quickTo(el, "y", { duration: 0.6, ease: "elastic.out(1, 0.4)" });
        const move = (e: PointerEvent) => {
          const r = el.getBoundingClientRect();
          x((e.clientX - (r.left + r.width / 2)) * 0.35);
          y((e.clientY - (r.top + r.height / 2)) * 0.45);
        };
        const leave = () => {
          x(0);
          y(0);
        };
        el.addEventListener("pointermove", move);
        el.addEventListener("pointerleave", leave);
        return () => {
          el.removeEventListener("pointermove", move);
          el.removeEventListener("pointerleave", leave);
        };
      });

      ScrollTrigger.refresh();
      // Let the refresh (pins, snap points, platform measuring) settle for two frames, then report.
      raf = requestAnimationFrame(() => {
        raf = requestAnimationFrame(() => onReady?.());
      });

      return () => {
        aboutOffs.forEach((o) => o());
        cleanups.forEach((c) => c());
        io.disconnect();
        window.clearTimeout(buffer);
        window.clearTimeout(starting);
        tilts.forEach((c) => c());
      };
    });
    return () => {
      cancelAnimationFrame(raf);
      ctx.revert();
    };
  }, [ready, onReady]);

  return null;
}
