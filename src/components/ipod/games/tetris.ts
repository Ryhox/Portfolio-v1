// Tetris. Roll the wheel (or ⏮ / ⏭) to move, the center button turns the piece, ▶❚❚ drops it. Keys: ← →
// move, ↑ turns, ↓ drops a row, Space drops all the way.

import { block, loadBest, saveBest, step, type Game } from "./game";

const COLS = 10;
const ROWS = 20;

type Kind = "I" | "O" | "T" | "S" | "Z" | "J" | "L";
type Cell = [number, number];

const SHAPES: Record<Kind, Cell[]> = {
  I: [
    [0, 1],
    [1, 1],
    [2, 1],
    [3, 1],
  ],
  O: [
    [1, 0],
    [2, 0],
    [1, 1],
    [2, 1],
  ],
  T: [
    [1, 0],
    [0, 1],
    [1, 1],
    [2, 1],
  ],
  S: [
    [1, 0],
    [2, 0],
    [0, 1],
    [1, 1],
  ],
  Z: [
    [0, 0],
    [1, 0],
    [1, 1],
    [2, 1],
  ],
  J: [
    [0, 0],
    [0, 1],
    [1, 1],
    [2, 1],
  ],
  L: [
    [2, 0],
    [0, 1],
    [1, 1],
    [2, 1],
  ],
};
const COLOR: Record<Kind, string> = { I: "#4fc8ff", O: "#ffcf4a", T: "#b48cff", S: "#6fdc7a", Z: "#ff6f86", J: "#4d86f7", L: "#ff9f45" };

let board: (Kind | null)[][] = [];
let piece = { kind: "T" as Kind, cells: SHAPES.T, x: 3, y: 0 };
let bag: Kind[] = [];
let next: Kind = "T";
let lines = 0;
let timer = 0;

const level = () => Math.floor(lines / 10) + 1;

function draw7() {
  if (!bag.length) {
    bag = Object.keys(SHAPES) as Kind[];
    for (let i = bag.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [bag[i], bag[j]] = [bag[j], bag[i]];
    }
  }
  return bag.pop()!;
}

const fits = (cells: Cell[], x: number, y: number) =>
  cells.every(([cx, cy]) => {
    const bx = x + cx;
    const by = y + cy;
    return bx >= 0 && bx < COLS && by < ROWS && (by < 0 || !board[by][bx]);
  });

function spawn() {
  piece = { kind: next, cells: SHAPES[next], x: 3, y: 0 };
  next = draw7();
  if (!fits(piece.cells, piece.x, piece.y)) {
    tetris.state = "over";
    window.clearTimeout(timer);
    saveBest(tetris);
    step("press");
  }
}

function lock() {
  for (const [cx, cy] of piece.cells) if (piece.y + cy >= 0) board[piece.y + cy][piece.x + cx] = piece.kind;
  const kept = board.filter((row) => row.some((c) => !c));
  const cleared = ROWS - kept.length;
  if (cleared) {
    board = [...Array.from({ length: cleared }, () => Array<Kind | null>(COLS).fill(null)), ...kept];
    tetris.score += [0, 100, 300, 500, 800][cleared] * level();
    lines += cleared;
  }
  spawn();
  step(cleared ? "press" : "tick");
}

function fall() {
  if (fits(piece.cells, piece.x, piece.y + 1)) piece.y++;
  else lock();
  step();
}

function loop() {
  window.clearTimeout(timer);
  if (tetris.state !== "playing") return;
  timer = window.setTimeout(() => {
    fall();
    loop();
  }, Math.max(90, 720 - (level() - 1) * 65));
}

function shift(dx: number) {
  if (fits(piece.cells, piece.x + dx, piece.y)) {
    piece.x += dx;
    step();
  }
  return true;
}

// Turn clockwise, nudging off the walls if needed.
function rotate() {
  if (piece.kind === "O") return true;
  const n = piece.kind === "I" ? 4 : 3;
  const cells = piece.cells.map(([x, y]) => [n - 1 - y, x] as Cell);
  for (const kick of [0, -1, 1, -2, 2]) {
    if (fits(cells, piece.x + kick, piece.y)) {
      piece.cells = cells;
      piece.x += kick;
      step("tick");
      break;
    }
  }
  return true;
}

function drop() {
  while (fits(piece.cells, piece.x, piece.y + 1)) {
    piece.y++;
    tetris.score += 2;
  }
  lock();
  return true;
}

export const tetris: Game = {
  id: "tetris",
  title: "Tetris",
  help: "Wheel moves, center turns, play drops",
  state: "ready",
  score: 0,
  best: 0,
  result: () => `Score ${tetris.score} · Lines ${lines}`,
  start() {
    board = Array.from({ length: ROWS }, () => Array<Kind | null>(COLS).fill(null));
    bag = [];
    lines = 0;
    this.score = 0;
    this.best = loadBest(this.id);
    next = draw7();
    this.state = "playing";
    spawn();
    loop();
  },
  pause() {
    if (this.state !== "playing") return;
    this.state = "paused";
    window.clearTimeout(timer);
  },
  resume() {
    if (this.state !== "paused") return;
    this.state = "playing";
    loop();
  },
  press(b) {
    if (b === "prev") return shift(-1);
    if (b === "next") return shift(1);
    if (b === "center") return rotate();
    if (b === "play") return drop();
    return false;
  },
  turn(d) {
    return shift(d);
  },
  key(k, down) {
    if (!down) return false;
    if (k === "ArrowLeft") return shift(-1);
    if (k === "ArrowRight") return shift(1);
    if (k === "ArrowUp") return rotate();
    if (k === " ") return drop();
    if (k === "ArrowDown") {
      if (fits(piece.cells, piece.x, piece.y + 1)) {
        piece.y++;
        this.score++;
        step();
      }
      return true;
    }
    return false;
  },
  draw(ctx, x0, y0, w, h, ui) {
    const cell = Math.floor((h - 16) / ROWS);
    const bw = COLS * cell;
    const bh = ROWS * cell;
    const bx = x0 + 40;
    const by = y0 + (h - bh) / 2;
    ctx.fillStyle = "#101a33";
    ui.rrect(ctx, bx - 6, by - 6, bw + 12, bh + 12, 10);
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.05)";
    ctx.lineWidth = 1;
    for (let x = 1; x < COLS; x++) {
      ctx.beginPath();
      ctx.moveTo(bx + x * cell, by);
      ctx.lineTo(bx + x * cell, by + bh);
      ctx.stroke();
    }
    if (!board.length) return;
    board.forEach((row, y) => row.forEach((k, x) => k && block(ctx, ui, bx + x * cell + 1, by + y * cell + 1, cell - 2, cell - 2, COLOR[k], 4)));
    if (this.state !== "over") {
      // Where it will land.
      let gy = piece.y;
      while (fits(piece.cells, piece.x, gy + 1)) gy++;
      ctx.strokeStyle = "rgba(255,255,255,0.35)";
      ctx.lineWidth = 2;
      for (const [cx, cy] of piece.cells) if (gy + cy >= 0) ctx.strokeRect(bx + (piece.x + cx) * cell + 2, by + (gy + cy) * cell + 2, cell - 4, cell - 4);
      for (const [cx, cy] of piece.cells) if (piece.y + cy >= 0) block(ctx, ui, bx + (piece.x + cx) * cell + 1, by + (piece.y + cy) * cell + 1, cell - 2, cell - 2, COLOR[piece.kind], 4);
    }
    // Next piece, lines, level.
    const px = bx + bw + 44;
    ctx.fillStyle = ui.soft;
    ctx.font = ui.font(28, 800);
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    ctx.fillText("NEXT", px, by + 30);
    const s = 34;
    for (const [cx, cy] of SHAPES[next]) block(ctx, ui, px + cx * s, by + 52 + cy * s, s - 3, s - 3, COLOR[next], 5);
    ctx.fillStyle = ui.soft;
    ctx.fillText("LINES", px, by + 212);
    ctx.fillText("LEVEL", px, by + 318);
    ctx.fillStyle = ui.ink;
    ctx.font = ui.font(56, 800);
    ctx.fillText(String(lines), px, by + 270);
    ctx.fillText(String(level()), px, by + 376);
  },
};

tetris.best = loadBest(tetris.id);
