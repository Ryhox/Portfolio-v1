// Draws the iPod's screen into a canvas that the 3D model shows through its glass. Classic look (a silver
// title bar, a white list, a glossy blue bar on the selected row), with big type so it reads at iPod size.

import { game as current, notify, os, ROWS, top, type View } from "./os";
import * as player from "./player";
import { GAMES, type Game, type Ui } from "./games";

export const SW = 640;
export const SH = 524;
const HEAD = 72;
const ROW_H = (SH - HEAD) / ROWS;
const INK = "#101216";
const SOFT = "#4f5763";

let family = "system-ui, sans-serif";
export const font = (size: number, weight = 600) => `${weight} ${size}px ${family}`;

// The page's own sans (next/font gives it a generated family name, published as --font-sans).
export function loadSiteFont() {
  const v = getComputedStyle(document.documentElement).getPropertyValue("--font-sans").trim();
  if (v) family = `${v}, system-ui, sans-serif`;
}

// The real battery, where the browser shares it.
const battery = { level: 0.86, charging: false };
if (typeof navigator !== "undefined" && "getBattery" in navigator) {
  (navigator as Navigator & { getBattery: () => Promise<{ level: number; charging: boolean; addEventListener: (e: string, f: () => void) => void }> })
    .getBattery()
    .then((b) => {
      const sync = () => {
        battery.level = b.level;
        battery.charging = b.charging;
        notify();
      };
      sync();
      b.addEventListener("levelchange", sync);
      b.addEventListener("chargingchange", sync);
    })
    .catch(() => undefined);
}

// ---------- Helpers ----------

function rrect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

function fit(ctx: CanvasRenderingContext2D, text: string, max: number) {
  if (ctx.measureText(text).width <= max) return text;
  let t = text;
  while (t.length > 1 && ctx.measureText(t + "…").width > max) t = t.slice(0, -1);
  return t.trimEnd() + "…";
}

function lines(ctx: CanvasRenderingContext2D, text: string, max: number, limit = 99) {
  const out: string[] = [];
  let line = "";
  for (const word of text.split(" ")) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width > max && line) {
      out.push(line);
      line = word;
    } else line = next;
  }
  if (line) out.push(line);
  if (out.length > limit) {
    out.length = limit;
    out[limit - 1] = fit(ctx, out[limit - 1] + " …", max);
  }
  return out;
}

const time = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

function blueBar(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  const g = ctx.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, "#6fb2ff");
  g.addColorStop(0.5, "#3585f0");
  g.addColorStop(0.51, "#2269dc");
  g.addColorStop(1, "#1a58c6");
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = "rgba(255,255,255,0.4)";
  ctx.fillRect(x, y, w, 3);
}

function playIcon(ctx: CanvasRenderingContext2D, x: number, y: number, s: number) {
  ctx.beginPath();
  ctx.moveTo(x, y - s);
  ctx.lineTo(x + s * 1.6, y);
  ctx.lineTo(x, y + s);
  ctx.closePath();
  ctx.fill();
}

function pauseIcon(ctx: CanvasRenderingContext2D, x: number, y: number, s: number) {
  ctx.fillRect(x, y - s, s * 0.6, s * 2);
  ctx.fillRect(x + s, y - s, s * 0.6, s * 2);
}

function lock(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, color: string) {
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = s * 0.22;
  ctx.beginPath();
  ctx.arc(x, y - s * 0.2, s * 0.42, Math.PI, 0);
  ctx.stroke();
  rrect(ctx, x - s * 0.62, y - s * 0.2, s * 1.24, s, s * 0.14);
  ctx.fill();
}

const covers = new Map<string, HTMLImageElement>();
let blank: HTMLCanvasElement | null = null;

// The song's real cover from Apple, once it has loaded (CORS, so the screen can still go to the GPU).
// Until then a plain glossy square with a note.
function art(t: player.Track): CanvasImageSource {
  let img = t.cover ? covers.get(t.cover) : undefined;
  if (t.cover && !img) {
    img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = notify;
    img.src = t.cover;
    covers.set(t.cover, img);
  }
  if (img?.complete && img.naturalWidth) return img;
  if (!blank) {
    blank = document.createElement("canvas");
    blank.width = blank.height = 256;
    const ctx = blank.getContext("2d")!;
    const g = ctx.createLinearGradient(0, 0, 256, 256);
    g.addColorStop(0, "#dfe6f0");
    g.addColorStop(1, "#aeb9c9");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 256, 256);
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.beginPath();
    ctx.ellipse(92, 178, 28, 21, -0.4, 0, Math.PI * 2);
    ctx.ellipse(176, 158, 28, 21, -0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(110, 70, 12, 108);
    ctx.fillRect(194, 50, 12, 108);
    ctx.beginPath();
    ctx.moveTo(110, 70);
    ctx.lineTo(206, 50);
    ctx.lineTo(206, 80);
    ctx.lineTo(110, 100);
    ctx.fill();
  }
  return blank;
}

// ---------- Title bar ----------

function header(ctx: CanvasRenderingContext2D, title: string) {
  const g = ctx.createLinearGradient(0, 0, 0, HEAD);
  g.addColorStop(0, "#fdfdfe");
  g.addColorStop(1, "#c9d0d8");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, SW, HEAD);
  ctx.fillStyle = "#7f8791";
  ctx.fillRect(0, HEAD - 3, SW, 3);

  ctx.fillStyle = INK;
  ctx.font = font(38, 800);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(fit(ctx, title, 380), SW / 2, HEAD / 2 + 1);

  // Play state on the left.
  if (player.current()) {
    ctx.fillStyle = "#2a74e4";
    if (player.player.playing) playIcon(ctx, 24, HEAD / 2, 14);
    else pauseIcon(ctx, 22, HEAD / 2, 14);
  }
  if (os.hold) lock(ctx, SW - 118, HEAD / 2 + 3, 28, "#5f6772");

  // Battery on the right.
  const bx = SW - 84;
  const by = 21;
  ctx.strokeStyle = "#5f6772";
  ctx.lineWidth = 3;
  rrect(ctx, bx, by, 58, 30, 6);
  ctx.stroke();
  ctx.fillStyle = "#5f6772";
  ctx.fillRect(bx + 58, by + 9, 5, 12);
  const lv = Math.max(0.08, battery.level);
  const bg = ctx.createLinearGradient(0, by, 0, by + 30);
  bg.addColorStop(0, lv < 0.2 ? "#ff9b8a" : "#a6f08e");
  bg.addColorStop(1, lv < 0.2 ? "#e0402c" : "#35a922");
  ctx.fillStyle = bg;
  ctx.fillRect(bx + 4.5, by + 4.5, 49 * lv, 21);
}

// ---------- Screens ----------

function list(ctx: CanvasRenderingContext2D, v: Extract<View, { kind: "menu" }>) {
  header(ctx, v.title);
  const rows = v.rows();
  v.sel = Math.min(v.sel, rows.length - 1);
  v.top = Math.max(0, Math.min(v.top, rows.length - ROWS));
  const scrolls = rows.length > ROWS;
  const right = scrolls ? SW - 30 : SW;
  for (let r = 0; r < ROWS; r++) {
    const i = v.top + r;
    const row = rows[i];
    if (!row) break;
    const y = HEAD + r * ROW_H;
    const mid = y + ROW_H / 2 + 2;
    const sel = i === v.sel;
    if (sel) blueBar(ctx, 0, y, right, ROW_H);
    else if (r > 0) {
      ctx.fillStyle = "#e6e9ee";
      ctx.fillRect(24, y, right - 48, 2);
    }
    ctx.textBaseline = "middle";
    let edge = right - 26;
    if (row.more) {
      ctx.strokeStyle = sel ? "#fff" : "#7f8791";
      ctx.lineWidth = 6;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      ctx.moveTo(edge - 12, mid - 16);
      ctx.lineTo(edge, mid);
      ctx.lineTo(edge - 12, mid + 16);
      ctx.stroke();
      edge -= 34;
    }
    const value = row.value?.();
    if (value) {
      ctx.font = font(38, 600);
      ctx.textAlign = "right";
      ctx.fillStyle = sel ? "rgba(255,255,255,0.92)" : SOFT;
      ctx.fillText(value, edge, mid);
      edge -= ctx.measureText(value).width + 22;
    }
    ctx.font = font(46, 700);
    ctx.textAlign = "left";
    ctx.fillStyle = sel ? "#fff" : INK;
    ctx.fillText(fit(ctx, row.label, edge - 28), 28, mid);
  }
  if (scrolls) {
    const x = SW - 24;
    const y0 = HEAD + 8;
    const h = SH - HEAD - 16;
    ctx.fillStyle = "#e3e7ec";
    rrect(ctx, x, y0, 16, h, 8);
    ctx.fill();
    ctx.strokeStyle = "#a7afb8";
    ctx.lineWidth = 2;
    ctx.stroke();
    const th = Math.max(48, (h * ROWS) / rows.length);
    const ty = y0 + ((h - th) * v.top) / Math.max(1, rows.length - ROWS);
    const g = ctx.createLinearGradient(x, 0, x + 16, 0);
    g.addColorStop(0, "#6fb2ff");
    g.addColorStop(1, "#1f63d4");
    ctx.fillStyle = g;
    rrect(ctx, x, ty, 16, th, 8);
    ctx.fill();
  }
}

function bar(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, p: number, knob: boolean) {
  const h = 24;
  rrect(ctx, x, y, w, h, h / 2);
  ctx.fillStyle = "#e3e7ec";
  ctx.fill();
  ctx.strokeStyle = "#8f98a3";
  ctx.lineWidth = 2;
  ctx.stroke();
  const fw = Math.max(h, w * Math.min(1, Math.max(0, p)));
  ctx.save();
  rrect(ctx, x, y, fw, h, h / 2);
  ctx.clip();
  blueBar(ctx, x, y, fw, h);
  ctx.restore();
  if (knob) {
    const kx = x + w * Math.min(1, Math.max(0, p));
    ctx.fillStyle = "#fff";
    ctx.strokeStyle = "#1f63d4";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(kx, y - 12);
    ctx.lineTo(kx + 16, y + h / 2);
    ctx.lineTo(kx, y + h + 12);
    ctx.lineTo(kx - 16, y + h / 2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
}

function nowPlaying(ctx: CanvasRenderingContext2D) {
  header(ctx, "Now Playing");
  const t = player.current();
  if (!t) {
    ctx.fillStyle = SOFT;
    ctx.font = font(40, 700);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("Nothing playing", SW / 2, (SH + HEAD) / 2);
    return;
  }
  const { queue, index } = player.player;

  // The cover, and what it is.
  const as = 236;
  const ax = 26;
  const ay = HEAD + 26;
  ctx.drawImage(art(t), ax, ay, as, as);
  ctx.strokeStyle = "rgba(0,0,0,0.12)";
  ctx.lineWidth = 2;
  ctx.strokeRect(ax, ay, as, as);

  const tx = ax + as + 26;
  const tw = SW - tx - 22;
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = SOFT;
  ctx.font = font(30, 700);
  ctx.fillText(`${index + 1} of ${queue.length}`, tx, ay + 30);
  ctx.fillStyle = INK;
  ctx.font = font(46, 800);
  const title = lines(ctx, t.title, tw - (t.explicit ? 44 : 0), 2);
  title.forEach((l, k) => ctx.fillText(l, tx, ay + 86 + k * 52));
  // The little E for explicit, after the title.
  if (t.explicit) {
    const ex = tx + ctx.measureText(title[title.length - 1]).width + 12;
    const ey = ay + 86 + (title.length - 1) * 52 - 32;
    rrect(ctx, ex, ey, 32, 32, 6);
    ctx.fillStyle = SOFT;
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.font = font(24, 800);
    ctx.textAlign = "center";
    ctx.fillText("E", ex + 16, ey + 25);
    ctx.textAlign = "left";
  }
  let y = ay + 86 + title.length * 52 + 2;
  ctx.fillStyle = SOFT;
  ctx.font = font(36, 600);
  ctx.fillText(fit(ctx, t.artist, tw), tx, y);
  y += 44;
  ctx.fillStyle = "#e0284a";
  ctx.font = font(28, 700);
  ctx.fillText(player.loading() ? "Loading…" : "Preview · Apple Music", tx, y);

  // Progress (or the volume, for a moment after turning the wheel).
  const by = SH - 96;
  const x0 = 26;
  const w = SW - 52;
  if (performance.now() - os.volumeAt < 1500 && !os.scrub) {
    ctx.fillStyle = SOFT;
    ctx.font = font(30, 700);
    ctx.textAlign = "left";
    ctx.fillText("Volume", x0, by - 18);
    bar(ctx, x0, by, w, player.player.volume, false);
    return;
  }
  const d = player.duration();
  const p = player.position();
  const scrubbing = os.scrub;
  bar(ctx, x0, by, w, d ? p / d : 0, scrubbing);
  ctx.fillStyle = SOFT;
  ctx.font = font(32, 700);
  ctx.textAlign = "left";
  ctx.fillText(time(p), x0, by + 66);
  ctx.textAlign = "right";
  ctx.fillText(d ? `-${time(Math.max(0, d - p))}` : "--:--", x0 + w, by + 66);
  if (scrubbing) {
    ctx.textAlign = "center";
    ctx.fillStyle = "#1f63d4";
    ctx.fillText("Scrubbing", SW / 2, by + 66);
  }
}

// What the games draw with.
const UI: Ui = { font, ink: INK, soft: SOFT, rrect };

// A game: its score in the title bar, its playfield, and the Ready / Paused / Game Over card over it.
function play(ctx: CanvasRenderingContext2D, g: Game) {
  header(ctx, g.state === "ready" ? g.title : (g.status?.() ?? `Score ${g.score}`));
  g.draw(ctx, 0, HEAD, SW, SH - HEAD, UI);
  if (g.state === "playing") return;
  ctx.fillStyle = "rgba(244,247,251,0.82)";
  ctx.fillRect(0, HEAD, SW, SH - HEAD);
  const title = g.state === "ready" ? g.title : g.state === "paused" ? "Paused" : "Game Over";
  const sub =
    g.state === "ready" ? g.help : g.state === "paused" ? "MENU to leave" : (g.result?.() ?? `Score ${g.score} · Best ${g.best}`);
  const cy = HEAD + (SH - HEAD) / 2;
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = INK;
  ctx.font = font(64, 800);
  ctx.fillText(title, SW / 2, cy - 50);
  ctx.fillStyle = SOFT;
  ctx.font = font(32, 700);
  ctx.fillText(fit(ctx, sub, SW - 60), SW / 2, cy);
  if (g.state === "ready" && g.best) {
    ctx.font = font(26, 700);
    ctx.fillText(`Best ${g.best}`, SW / 2, cy + 150);
  }
  const label = g.state === "over" ? "Play again" : g.state === "paused" ? "Resume" : "Start";
  rrect(ctx, SW / 2 - 150, cy + 30, 300, 70, 35);
  ctx.save();
  ctx.clip();
  blueBar(ctx, SW / 2 - 150, cy + 30, 300, 70);
  ctx.restore();
  ctx.fillStyle = "#fff";
  ctx.font = font(38, 800);
  ctx.textBaseline = "middle";
  ctx.fillText(label, SW / 2, cy + 67);
}

function clock(ctx: CanvasRenderingContext2D) {
  header(ctx, "Clock");
  const d = new Date();
  const cx = 168;
  const cy = HEAD + (SH - HEAD) / 2;
  const r = 150;
  const face = ctx.createRadialGradient(cx - 40, cy - 50, 10, cx, cy, r);
  face.addColorStop(0, "#ffffff");
  face.addColorStop(1, "#dce3ec");
  ctx.fillStyle = face;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#9aa3ae";
  ctx.lineWidth = 6;
  ctx.stroke();
  ctx.strokeStyle = INK;
  for (let k = 0; k < 12; k++) {
    const a = (k / 12) * Math.PI * 2;
    const long = k % 3 === 0;
    ctx.lineWidth = long ? 8 : 4;
    ctx.beginPath();
    ctx.moveTo(cx + Math.sin(a) * (r - 14), cy - Math.cos(a) * (r - 14));
    ctx.lineTo(cx + Math.sin(a) * (r - (long ? 38 : 28)), cy - Math.cos(a) * (r - (long ? 38 : 28)));
    ctx.stroke();
  }
  const sec = d.getSeconds();
  const min = d.getMinutes() + sec / 60;
  const hr = (d.getHours() % 12) + min / 60;
  const hand = (a: number, len: number, wdt: number, color: string) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = wdt;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(cx - Math.sin(a) * 16, cy + Math.cos(a) * 16);
    ctx.lineTo(cx + Math.sin(a) * len, cy - Math.cos(a) * len);
    ctx.stroke();
  };
  hand((hr / 12) * Math.PI * 2, r * 0.5, 11, INK);
  hand((min / 60) * Math.PI * 2, r * 0.75, 7, INK);
  hand((sec / 60) * Math.PI * 2, r * 0.82, 3.5, "#2a74e4");
  ctx.fillStyle = "#2a74e4";
  ctx.beginPath();
  ctx.arc(cx, cy, 9, 0, Math.PI * 2);
  ctx.fill();

  const x = 346;
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = INK;
  ctx.font = font(84, 800);
  ctx.fillText(d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }), x, cy + 20);
  ctx.fillStyle = SOFT;
  ctx.font = font(36, 700);
  ctx.fillText(d.toLocaleDateString([], { weekday: "short", day: "numeric", month: "short" }), x + 4, cy + 72);
}

function about(ctx: CanvasRenderingContext2D) {
  header(ctx, "About");
  ctx.textBaseline = "alphabetic";
  ctx.textAlign = "center";
  ctx.fillStyle = INK;
  ctx.font = font(46, 800);
  ctx.fillText("ryPod", SW / 2, HEAD + 70);
  const rows: [string, string][] = [
    ["Songs", String(player.songs.length)],
    ["Games", String(GAMES.length)],
    ["Version", "2026.9"],
  ];
  rows.forEach(([k, v], i) => {
    const y = HEAD + 146 + i * 66;
    ctx.fillStyle = INK;
    ctx.font = font(38, 700);
    ctx.textAlign = "left";
    ctx.fillText(k, 32, y);
    ctx.fillStyle = SOFT;
    ctx.font = font(38, 600);
    ctx.textAlign = "right";
    ctx.fillText(v, SW - 32, y);
    ctx.fillStyle = "#e3e7ec";
    ctx.fillRect(32, y + 22, SW - 64, 2);
  });
  ctx.textAlign = "center";
  ctx.fillStyle = SOFT;
  ctx.font = font(24, 600);
  ctx.fillText("3D model: Timothy Ahene, CC BY 4.0", SW / 2, SH - 52);
  ctx.fillText("A fan-made toy, not made by Apple", SW / 2, SH - 20);
}

function consent(ctx: CanvasRenderingContext2D) {
  header(ctx, "Music");
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = INK;
  ctx.font = font(36, 700);
  let y = HEAD + 58;
  for (const l of lines(ctx, "Songs are 30-second previews from Apple Music.", SW - 60)) {
    ctx.fillText(l, 30, y);
    y += 46;
  }
  ctx.fillStyle = SOFT;
  ctx.font = font(30, 600);
  y += 8;
  for (const l of lines(ctx, "They stream from Apple, who then sees your IP address. More: ryhox.dev/privacy", SW - 60)) {
    ctx.fillText(l, 30, y);
    y += 40;
  }
  const by = SH - 96;
  rrect(ctx, 30, by, 250, 66, 33);
  ctx.save();
  ctx.clip();
  blueBar(ctx, 30, by, 250, 66);
  ctx.restore();
  ctx.fillStyle = "#fff";
  ctx.font = font(32, 800);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("Center: OK", 155, by + 34);
  ctx.fillStyle = SOFT;
  ctx.textAlign = "right";
  ctx.font = font(30, 700);
  ctx.fillText("MENU: back", SW - 30, by + 34);
}

// ---------- The LCD behind the glass ----------

let grid: CanvasPattern | null = null;

// A cool LCD tint, a faint pixel grid, the edges falling off, the bezel's shadow and a reflection.
function glass(ctx: CanvasRenderingContext2D) {
  ctx.globalCompositeOperation = "multiply";
  ctx.fillStyle = "#e9f1fb";
  ctx.fillRect(0, 0, SW, SH);
  if (!grid) {
    const cell = document.createElement("canvas");
    cell.width = cell.height = 4;
    const g = cell.getContext("2d")!;
    g.fillStyle = "#fff";
    g.fillRect(0, 0, 4, 4);
    g.fillStyle = "rgba(40,60,90,0.09)";
    g.fillRect(3, 0, 1, 4);
    g.fillRect(0, 3, 4, 1);
    grid = ctx.createPattern(cell, "repeat");
  }
  if (grid) {
    ctx.fillStyle = grid;
    ctx.fillRect(0, 0, SW, SH);
  }
  const v = ctx.createRadialGradient(SW / 2, SH / 2, SH * 0.35, SW / 2, SH / 2, SW * 0.72);
  v.addColorStop(0, "#fff");
  v.addColorStop(1, "#c9d2de");
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, SW, SH);
  const top = ctx.createLinearGradient(0, 0, 0, 26);
  top.addColorStop(0, "rgba(20,30,50,0.45)");
  top.addColorStop(1, "rgba(20,30,50,0)");
  ctx.globalCompositeOperation = "source-over";
  ctx.fillStyle = top;
  ctx.fillRect(0, 0, SW, 26);
  ctx.globalCompositeOperation = "screen";
  const sheen = ctx.createLinearGradient(0, 0, SW * 0.7, SH);
  sheen.addColorStop(0, "rgba(255,255,255,0.16)");
  sheen.addColorStop(0.4, "rgba(255,255,255,0.05)");
  sheen.addColorStop(0.41, "rgba(255,255,255,0)");
  ctx.fillStyle = sheen;
  ctx.fillRect(0, 0, SW, SH);
  ctx.globalCompositeOperation = "source-over";
  ctx.strokeStyle = "rgba(0,0,0,0.55)";
  ctx.lineWidth = 6;
  ctx.strokeRect(0, 0, SW, SH);
}

// ---------- Frame ----------

export function draw(ctx: CanvasRenderingContext2D) {
  const t = performance.now();
  ctx.save();
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, SW, SH);
  const v = top();
  if (!v) return;
  if (v.kind === "menu") list(ctx, v);
  else if (v.kind === "now") nowPlaying(ctx);
  else if (v.kind === "game") play(ctx, current()!);
  else if (v.kind === "clock") clock(ctx);
  else if (v.kind === "about") about(ctx);
  else if (v.kind === "consent") consent(ctx);

  // Toast (e.g. "Copied").
  const ta = t - os.toast.at;
  if (ta < 2000) {
    ctx.globalAlpha = Math.min(1, (2000 - ta) / 300);
    ctx.font = font(34, 700);
    const w = ctx.measureText(os.toast.text).width + 60;
    rrect(ctx, (SW - w) / 2, SH - 110, w, 70, 35);
    ctx.fillStyle = "rgba(18,22,34,0.9)";
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(os.toast.text, SW / 2, SH - 74);
    ctx.globalAlpha = 1;
  }

  // Tried a control while on hold: the lock shows up.
  const ha = t - os.holdFlash;
  if (ha < 1300) {
    ctx.globalAlpha = Math.min(1, (1300 - ha) / 300);
    rrect(ctx, SW / 2 - 90, SH / 2 - 70, 180, 170, 30);
    ctx.fillStyle = "rgba(18,22,34,0.88)";
    ctx.fill();
    lock(ctx, SW / 2, SH / 2 - 2, 70, "#fff");
    ctx.globalAlpha = 1;
  }

  glass(ctx);
  ctx.restore();
  os.dirty = false;
}
