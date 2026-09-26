// 2048: slide the tiles with the wheel's four buttons (MENU up, ▶❚❚ down, ⏮ left, ⏭ right) or the arrow
// keys; equal tiles merge. Keep going past 2048 if you like.

import { loadBest, saveBest, step, type Game } from "./game";

const N = 4;
let grid: number[] = [];
// When each cell last got a new or merged tile (for a little pop).
let born: number[] = [];

const TILE: Record<number, [string, string]> = {
  2: ["#eef3fb", "#15171b"],
  4: ["#dfe9fb", "#15171b"],
  8: ["#9fd0ff", "#0f2257"],
  16: ["#6fb2ff", "#ffffff"],
  32: ["#4d86f7", "#ffffff"],
  64: ["#8f7cff", "#ffffff"],
  128: ["#ffc4ec", "#5a1d4a"],
  256: ["#ff9ad8", "#ffffff"],
  512: ["#ff6fb8", "#ffffff"],
  1024: ["#ffcf4a", "#4a3200"],
  2048: ["#ffb02e", "#ffffff"],
};

function spawn() {
  const free = grid.map((v, i) => (v ? -1 : i)).filter((i) => i >= 0);
  if (!free.length) return;
  const i = free[Math.floor(Math.random() * free.length)];
  grid[i] = Math.random() < 0.9 ? 2 : 4;
  born[i] = performance.now();
}

const at = (x: number, y: number) => y * N + x;

// Slide every line toward (dx, dy); true if anything moved.
function slide(dx: number, dy: number) {
  let moved = false;
  const now = performance.now();
  for (let line = 0; line < N; line++) {
    // The cells of this line, starting from the side the tiles move toward.
    const cells = Array.from({ length: N }, (_, k) => {
      const t = dx > 0 || dy > 0 ? N - 1 - k : k;
      return dx ? at(t, line) : at(line, t);
    });
    const vals = cells.map((c) => grid[c]).filter(Boolean);
    const out: number[] = [];
    const merged: boolean[] = [];
    for (const v of vals) {
      if (out.length && out[out.length - 1] === v && !merged[out.length - 1]) {
        out[out.length - 1] = v * 2;
        merged[out.length - 1] = true;
        g2048.score += v * 2;
      } else out.push(v);
    }
    cells.forEach((c, k) => {
      const v = out[k] ?? 0;
      if (grid[c] !== v) moved = true;
      grid[c] = v;
      if (merged[k]) born[c] = now;
    });
  }
  return moved;
}

const stuck = () => grid.every((v, i) => v && !(i % N < N - 1 && grid[i + 1] === v) && !(i + N < N * N && grid[i + N] === v));

function go(dx: number, dy: number) {
  if (!slide(dx, dy)) return true;
  spawn();
  if (stuck()) {
    g2048.state = "over";
    saveBest(g2048);
    step("press");
  } else step("tick");
  return true;
}

export const g2048: Game = {
  id: "2048",
  title: "2048",
  help: "Slide with the four buttons",
  state: "ready",
  score: 0,
  best: 0,
  start() {
    grid = Array(N * N).fill(0);
    born = Array(N * N).fill(0);
    this.score = 0;
    this.best = loadBest(this.id);
    spawn();
    spawn();
    this.state = "playing";
  },
  pause() {
    if (this.state === "playing") this.state = "paused";
  },
  resume() {
    if (this.state === "paused") this.state = "playing";
  },
  press(b) {
    if (b === "menu") return go(0, -1);
    if (b === "play") return go(0, 1);
    if (b === "prev") return go(-1, 0);
    if (b === "next") return go(1, 0);
    return false;
  },
  turn() {
    return false;
  },
  key(k, down) {
    if (!down) return false;
    if (k === "ArrowUp") return go(0, -1);
    if (k === "ArrowDown") return go(0, 1);
    if (k === "ArrowLeft") return go(-1, 0);
    if (k === "ArrowRight") return go(1, 0);
    return false;
  },
  draw(ctx, x0, y0, w, h, ui) {
    const gap = 10;
    const size = Math.min(w, h) - 24;
    const cell = (size - gap * (N + 1)) / N;
    const bx = x0 + (w - size) / 2;
    const by = y0 + (h - size) / 2;
    ctx.fillStyle = "#c9d3e2";
    ui.rrect(ctx, bx, by, size, size, 14);
    ctx.fill();
    const now = performance.now();
    for (let i = 0; i < N * N; i++) {
      const x = bx + gap + (i % N) * (cell + gap);
      const y = by + gap + Math.floor(i / N) * (cell + gap);
      const v = grid[i];
      if (!v) {
        ctx.fillStyle = "#dde4ee";
        ui.rrect(ctx, x, y, cell, cell, 10);
        ctx.fill();
        continue;
      }
      const [bg, fg] = TILE[v] ?? ["#15171b", "#ffffff"];
      const pop = Math.max(0, 1 - (now - born[i]) / 160);
      const s = 1 + pop * 0.08;
      const cx = x + cell / 2;
      const cy = y + cell / 2;
      ui.rrect(ctx, cx - (cell * s) / 2, cy - (cell * s) / 2, cell * s, cell * s, 10);
      ctx.fillStyle = bg;
      ctx.fill();
      ctx.fillStyle = fg;
      ctx.font = ui.font(v < 100 ? 52 : v < 1000 ? 42 : 32, 800);
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(String(v), cx, cy + 2);
    }
    if (now - Math.max(...born) < 200) step();
  },
};

g2048.best = loadBest(g2048.id);
