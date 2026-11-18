// The iPod's software: a stack of screens and what each control does on each of them, like the real one.
// The wheel scrolls lists (and sets the volume on Now Playing), the center button selects, MENU goes back,
// ⏮ / ⏭ skip, ▶❚❚ plays, and the hold switch locks it all.
// Drawn by screen.ts; driven by the 3D model (IPodModel.tsx) and the keyboard (IPod.tsx).

import { links } from "@/links";
import * as player from "./player";
import { click, clicker } from "./clicker";
import { events, gameById, GAMES, type Button, type Game } from "./games";

export type Row = { label: string; value?: () => string; go?: () => View; act?: () => void; more?: boolean };
export type View =
  | { kind: "menu"; title: string; rows: () => Row[]; sel: number; top: number }
  | { kind: "now" }
  | { kind: "game"; id: string }
  | { kind: "clock" }
  | { kind: "about" }
  // Before the first song: the previews stream from Apple, who then sees your IP address.
  | { kind: "consent"; then: () => void };

export type { Button };

// Rows on screen at once: few and big, so they read at iPod size.
export const ROWS = 5;

export const os = {
  stack: [] as View[],
  hold: false,
  holdFlash: -1e9,
  toast: { text: "", at: -1e9 },
  // Now Playing: the wheel scrubs through the song instead of setting the volume.
  scrub: false,
  // When the wheel last changed the volume (the bar shows for a moment).
  volumeAt: -1e9,
  // Set whenever the screen needs a redraw.
  dirty: true,
  listeners: new Set<() => void>(),
};

const now = () => performance.now();

// Something on screen changed: redraw it (and tell screen readers).
export function notify() {
  os.dirty = true;
  os.listeners.forEach((l) => l());
}
player.player.listeners.add(notify);
events.onStep = (sound) => {
  if (sound) click(sound);
  notify();
};

const menu = (title: string, rows: () => Row[]): View => ({ kind: "menu", title, rows, sel: 0, top: 0 });

const push = (v: View) => {
  os.stack.push(v);
  os.scrub = false;
};

const nowPlaying = () => {
  if (top()?.kind !== "now") push({ kind: "now" });
};

// Apple is only contacted once you've said OK to it (asked once, remembered in this browser).
const OK = "ipod-music-ok";
const allowed = () => {
  try {
    return localStorage.getItem(OK) === "1";
  } catch {
    return false;
  }
};
const viaApple = (fn: () => void) => {
  if (allowed()) fn();
  else push({ kind: "consent", then: fn });
};

// Music: what's playing (if anything), then the playlists, each a menu of its songs.
const songRows = (lib: player.Track[]): Row[] =>
  lib.map((t, i) => ({
    label: t.title,
    act: () =>
      viaApple(() => {
        player.player.shuffle = false;
        player.play(lib, i);
        nowPlaying();
      }),
  }));
const musicRows = (): Row[] => [
  ...(player.current() ? [{ label: "Now Playing", more: true, go: () => ({ kind: "now" }) as View }] : []),
  ...player.lists.map((l) => ({ label: l.name, more: true, go: () => menu(l.name, () => songRows(l.tracks)) })),
];

const contactRows = (): Row[] => [
  { label: "GitHub", more: true, act: () => window.open(links.github, "_blank", "noopener") },
  {
    label: "Email",
    more: true,
    act: () => {
      location.href = links.email;
    },
  },
  {
    label: "Discord",
    act: () => {
      navigator.clipboard?.writeText(links.discord).catch(() => undefined);
      os.toast = { text: `Copied @${links.discord}`, at: now() };
    },
  },
];

const cycle = <T,>(list: readonly T[], v: T) => list[(list.indexOf(v) + 1) % list.length];

const settingsRows = (): Row[] => [
  {
    label: "Shuffle",
    value: () => (player.player.shuffle ? "On" : "Off"),
    act: () => {
      player.player.shuffle = !player.player.shuffle;
    },
  },
  {
    label: "Repeat",
    value: () => ({ off: "Off", one: "One", all: "All" })[player.player.repeat],
    act: () => {
      player.player.repeat = cycle(["off", "one", "all"] as const, player.player.repeat);
    },
  },
  {
    label: "Clicker",
    value: () => (clicker.on ? "On" : "Off"),
    act: () => {
      clicker.on = !clicker.on;
    },
  },
  { label: "About", more: true, go: () => ({ kind: "about" }) },
];

const mainRows = (): Row[] => [
  { label: "Music", more: true, go: () => menu("Music", musicRows) },
  { label: "Games", more: true, go: () => menu("Games", () => GAMES.map((g) => ({ label: g.title, more: true, go: () => ({ kind: "game", id: g.id }) as View }))) },
  {
    label: "Extras",
    more: true,
    go: () =>
      menu("Extras", () => [
        { label: "Clock", more: true, go: () => ({ kind: "clock" }) },
        { label: "Contacts", more: true, go: () => menu("Contacts", contactRows) },
      ]),
  },
  { label: "Settings", more: true, go: () => menu("Settings", settingsRows) },
  {
    label: "Shuffle Songs",
    act: () =>
      viaApple(() => {
        player.shuffleAll();
        nowPlaying();
      }),
  },
];

export const top = () => os.stack[os.stack.length - 1] as View | undefined;
// The game on screen, and whether it's being played.
export const game = (): Game | null => {
  const v = top();
  return v?.kind === "game" ? gameById(v.id) : null;
};
const playing = () => game()?.state === "playing";

// Switched on: the main menu.
export function power() {
  if (os.stack.length) return;
  os.stack = [menu("ryPod", mainRows)];
  notify();
}

// The iPod was put away (or the tab hidden): a running game pauses.
export function suspend() {
  game()?.pause();
  notify();
}

// Leave a game (it pauses, to carry on later).
function quit() {
  game()?.pause();
  os.stack.pop();
}

// Every control goes through here: nothing gets past the hold switch.
function input() {
  os.dirty = true;
  if (os.hold) {
    os.holdFlash = now();
    notify();
    return false;
  }
  return true;
}

// The wheel turned one notch (clockwise = 1).
export function scroll(d: 1 | -1) {
  if (!input()) return;
  const v = top();
  if (!v) return;
  if (v.kind === "menu") {
    const n = v.rows().length;
    const sel = Math.min(n - 1, Math.max(0, v.sel + d));
    if (sel === v.sel) return;
    v.sel = sel;
    if (sel < v.top) v.top = sel;
    if (sel >= v.top + ROWS) v.top = sel - ROWS + 1;
    click("tick");
  } else if (v.kind === "now") {
    if (os.scrub) player.seek(player.position() + d * 2);
    else {
      player.setVolume(player.player.volume + d * 0.05);
      os.volumeAt = now();
    }
  } else if (v.kind === "game") {
    if (playing()) game()!.turn(d);
  }
  notify();
}

export function select() {
  if (!input()) return;
  click("press");
  const v = top();
  if (!v) return;
  if (v.kind === "menu") {
    const rows = v.rows();
    const row = rows[Math.min(v.sel, rows.length - 1)];
    if (row?.go) push(row.go());
    else row?.act?.();
  } else if (v.kind === "now") os.scrub = !os.scrub;
  else if (v.kind === "consent") {
    try {
      localStorage.setItem(OK, "1");
    } catch {
      // Not remembered then: it'll ask again next visit.
    }
    os.stack.pop();
    v.then();
  } else if (v.kind === "game") {
    const g = gameById(v.id);
    if (g.state === "playing") {
      if (!g.press("center")) g.pause();
    } else if (g.state === "paused") g.resume();
    else g.start();
  }
  notify();
}

// MENU. Returns true when there's nowhere further back to go (the main menu).
export function back() {
  if (!input()) return false;
  click("press");
  const g = game();
  // In a game: its own move if it has one, else the first MENU pauses and the next one leaves.
  if (g?.state === "playing") {
    if (!g.press("menu")) g.pause();
  } else if (os.scrub) os.scrub = false;
  else if (os.stack.length > 1) quit();
  else return true;
  notify();
  return false;
}

// The pointer resting on a list row on the screen: that row gets the blue bar, as if scrolled to (no hold
// warning: just pointing at it isn't pressing anything).
export function hover(row: number) {
  const v = top();
  if (os.hold || v?.kind !== "menu") return;
  const i = v.top + row;
  if (i < 0 || i >= v.rows().length || i === v.sel) return;
  v.sel = i;
  click("tick");
  notify();
}

// A tap on the screen itself. On a list the tapped row is picked and opened (as if scrolled to and pressed);
// the title bar goes back (MENU); on Now Playing it plays / pauses; anywhere else it's the center button.
export function tap(row: number | "title") {
  if (!input()) return;
  const v = top();
  if (!v) return;
  if (row === "title") {
    back();
    return;
  }
  if (v.kind === "menu") {
    const i = v.top + row;
    if (i < 0 || i >= v.rows().length) return;
    v.sel = i;
    select();
  } else if (v.kind === "now") playPause();
  else select();
}

export function playPause() {
  if (!input()) return;
  click("press");
  if (playing() && game()!.press("play")) return notify();
  if (player.current()) player.toggle();
  else
    viaApple(() => {
      player.toggle();
      nowPlaying();
    });
  notify();
}

export function skip(d: 1 | -1) {
  if (!input()) return;
  click("press");
  if (playing() && game()!.press(d > 0 ? "next" : "prev")) return notify();
  if (player.current()) player.skip(d);
  notify();
}

export function toggleHold() {
  os.hold = !os.hold;
  os.holdFlash = os.hold ? now() : -1e9;
  click("press");
  notify();
}

// The keyboard. Arrows turn the wheel (↑ ↓) and press ⏮ ⏭ (← →), Enter is the center button, Escape /
// Backspace is MENU, Space is ▶❚❚, H is the hold switch; in a game the game has the keys first. Returns
// false if the key isn't one of the iPod's (and "root" when Escape found nothing further back, for the caller
// to close up).
export function key(k: string): boolean | "root" {
  const g = game();
  if (g && !os.hold) {
    if (g.state === "playing" && g.key(k, true)) return true;
    if (k === "Escape" || k === "Backspace") {
      click("press");
      quit();
      notify();
      return true;
    }
    if (k === "Enter" || k === " ") {
      select();
      return true;
    }
    if (k.startsWith("Arrow")) return true;
  }
  switch (k) {
    case "ArrowUp":
      scroll(-1);
      return true;
    case "ArrowDown":
      scroll(1);
      return true;
    case "ArrowLeft":
      skip(-1);
      return true;
    case "ArrowRight":
      skip(1);
      return true;
    case "Enter":
      select();
      return true;
    case " ":
      playPause();
      return true;
    case "Escape":
    case "Backspace":
      return back() ? "root" : true;
    case "h":
    case "H":
      toggleHold();
      return true;
  }
  return false;
}

// A key let go (games that move while it's held).
export function keyUp(k: string) {
  const g = game();
  if (g?.state === "playing") g.key(k, false);
}

// Anything on screen that moves on its own (progress bar, clock, overlays fading)?
export function animating() {
  const t = now();
  const v = top();
  return (
    t - os.holdFlash < 1300 ||
    t - os.toast.at < 2000 ||
    t - os.volumeAt < 1700 ||
    (v?.kind === "now" && player.loading()) ||
    (v?.kind === "now" && player.player.playing) ||
    v?.kind === "clock"
  );
}

// One line for screen readers: where you are and what's selected.
export function describe() {
  const v = top();
  if (!v) return "";
  if (os.hold) return "Hold is on";
  const t = player.current();
  switch (v.kind) {
    case "menu": {
      const rows = v.rows();
      const row = rows[Math.min(v.sel, rows.length - 1)];
      return `${v.title}: ${row?.label ?? ""}${row?.value ? ` (${row.value()})` : ""}, ${v.sel + 1} of ${rows.length}`;
    }
    case "now":
      return t ? `Now playing: ${t.title} by ${t.artist}, ${player.player.playing ? "playing" : "paused"}` : "Now Playing";
    case "game": {
      const g = gameById(v.id);
      if (g.state === "ready") return `${g.title}. ${g.help}. Press select to start; the arrow keys play too.`;
      if (g.state === "over") return `Game over, score ${g.score}. Best ${g.best}. Press select to play again.`;
      if (g.state === "paused") return `${g.title} paused, score ${g.score}. Select to go on, Menu to leave.`;
      return `${g.title}, score ${g.score}`;
    }
    case "clock":
      return `Clock: ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
    case "about":
      return "About this music player";
    case "consent":
      return "Songs are 30-second previews from Apple Music, streamed from Apple, who then sees your IP address. Select to go ahead, Menu to go back.";
  }
}
