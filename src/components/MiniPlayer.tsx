"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { current, duration, player, position, skip, stop, toggle } from "./ipod/player";

// While a song from the iPod is playing (or paused), a chrome capsule bottom-left: the cover, the title and
// artist (a title too long for the space scrolls through, like the iPod's own screen), back / play-pause /
// next and stop, and a thin line along its bottom for how far into the song it is. It slides in with the
// first song and away again on stop.
export default function MiniPlayer() {
  const [, render] = useState(0);
  const line = useRef<HTMLSpanElement>(null);
  const box = useRef<HTMLSpanElement>(null);
  const text = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const changed = () => render((n) => n + 1);
    player.listeners.add(changed);
    return () => {
      player.listeners.delete(changed);
    };
  }, []);

  const track = current();
  const on = !!track && !player.stopped;

  // The progress line, only while playing (one transform a frame).
  useEffect(() => {
    if (!on || !player.playing) return;
    let raf = 0;
    const step = () => {
      const d = duration();
      if (line.current) line.current.style.transform = `scaleX(${d ? Math.min(1, position() / d) : 0})`;
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  });

  // A title wider than its space scrolls through it and back (how far, and how long, from its real width).
  const title = track?.title ?? "";
  useLayoutEffect(() => {
    const b = box.current;
    const t = text.current;
    if (!b || !t) return;
    const over = t.scrollWidth - b.clientWidth;
    t.classList.toggle("is-long", over > 2);
    t.style.setProperty("--over", `${-over}px`);
    t.style.setProperty("--dur", `${Math.max(5, over / 22 + 3)}s`);
  }, [title, on]);

  return (
    <div className={on ? "mini-player chrome-pill is-on" : "mini-player chrome-pill"} aria-hidden={!on} role="region" aria-label="Now playing">
      <span className="mp-cover" aria-hidden>
        {/* eslint-disable-next-line @next/next/no-img-element -- Apple's artwork URL, small */}
        {track?.cover ? <img src={track.cover} alt="" width={40} height={40} /> : null}
      </span>
      <span className="mp-text">
        <span ref={box} className="mp-title">
          <span ref={text} className="mp-title-in">
            {title}
          </span>
        </span>
        <span className="mp-artist">{track?.artist ?? ""}</span>
      </span>
      <button type="button" className="mp-btn mp-btn--small" onClick={() => skip(-1)} tabIndex={on ? 0 : -1} aria-label="Previous song">
        <svg viewBox="0 0 16 16" aria-hidden>
          <path d="M3.5 3h2v10h-2zM13 3.2v9.6L6.2 8z" fill="currentColor" />
        </svg>
      </button>
      <button type="button" className="mp-btn" onClick={toggle} tabIndex={on ? 0 : -1} aria-label={player.playing ? "Pause" : "Play"}>
        <svg viewBox="0 0 16 16" aria-hidden>
          {player.playing ? <path d="M4.5 3h2.4v10H4.5zM9.1 3h2.4v10H9.1z" fill="currentColor" /> : <path d="M5 2.8v10.4L13.2 8z" fill="currentColor" />}
        </svg>
      </button>
      <button type="button" className="mp-btn mp-btn--small" onClick={() => skip(1)} tabIndex={on ? 0 : -1} aria-label="Next song">
        <svg viewBox="0 0 16 16" aria-hidden>
          <path d="M10.5 3h2v10h-2zM3 3.2v9.6L9.8 8z" fill="currentColor" />
        </svg>
      </button>
      <span className="mp-rule" aria-hidden />
      <button type="button" className="mp-btn mp-btn--small mp-close" onClick={stop} tabIndex={on ? 0 : -1} aria-label="Stop and close">
        <svg viewBox="0 0 16 16" aria-hidden>
          <path d="M5 5l6 6M11 5l-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      </button>
      <span className="mp-line" aria-hidden>
        <span ref={line} />
      </span>
    </div>
  );
}
