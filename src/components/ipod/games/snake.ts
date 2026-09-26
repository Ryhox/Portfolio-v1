// Snake. Steer with the wheel's buttons like a D-pad (MENU up, ▶❚❚ down, ⏮ left, ⏭ right), turn by rolling
// the wheel, or use the arrow keys; the center button pauses. It eats bubbles.

import { loadBest, saveBest, step, type Game } from "./game";

const COLS = 20;
const LINES = 13;
type P = { x: number; y: number };

let body: P[] = [];
let dir: P = { x: 1, y: 0 };
// Turns asked for but not taken yet (so quick double turns aren't lost).
let queue: P[] = [];
let food: P = { x: 0, y: 0 };
let ateAt = -1e9;
let roll = 0;
let timer = 0;

function placeFood() {
  const free: P[] = [];
  for (let y = 0; y < LINES; y++) for (let x = 0; x < COLS; x++) if (!body.some((b) => b.x === x && b.y === y)) free.push({ x, y });
  food = free[Math.floor(Math.random() * free.length)] ?? { x: 0, y: 0 };
}

function loop() {
  window.clearTimeout(timer);
  if (snake.state !== "playing") return;
  timer = window.setTimeout(() => {
    move();
    loop();
  }, Math.max(62, 135 - snake.score * 3));
}

function move() {
  const d = queue.shift() ?? dir;
  dir = d;
  const head = { x: body[0].x + d.x, y: body[0].y + d.y };
  const eats = head.x === food.x && head.y === food.y;
  // The tail moves out of the way this step (unless the snake grows).
  const rest = eats ? body : body.slice(0, -1);
  if (head.x < 0 || head.y < 0 || head.x >= COLS || head.y >= LINES || rest.some((b) => b.x === head.x && b.y === head.y)) {
    snake.state = "over";
    saveBest(snake);
    return step("press");
  }
  body = [head, ...rest];
  if (eats) {
    snake.score++;
    ateAt = performance.now();
    placeFood();
  }
  step(eats ? "tick" : undefined);
}

// Head that way (ignored if it would turn straight back on itself).
function turn(x: number, y: number) {
  const last = queue[queue.length - 1] ?? dir;
  if ((x === -last.x && y === -last.y) || (x === last.x && y === last.y)) return true;
  if (queue.length < 3) queue.push({ x, y });
  return true;
}

export const snake: Game = {
  id: "snake",
  title: "Snake",
  help: "Steer with the wheel or its buttons",
  state: "ready",
  score: 0,
  best: 0,
  start() {
    body = [
      { x: 6, y: 6 },
      { x: 5, y: 6 },
      { x: 4, y: 6 },
    ];
    dir = { x: 1, y: 0 };
    queue = [];
    roll = 0;
    this.score = 0;
    this.best = loadBest(this.id);
    placeFood();
    this.state = "playing";
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
    if (b === "menu") return turn(0, -1);
    if (b === "play") return turn(0, 1);
    if (b === "prev") return turn(-1, 0);
    if (b === "next") return turn(1, 0);
    return false;
  },
  // Rolling the wheel: two notches clockwise turn right, counterclockwise turn left.
  turn(d) {
    roll += d;
    if (Math.abs(roll) < 2) return true;
    roll = 0;
    const last = queue[queue.length - 1] ?? dir;
    if (d > 0) turn(-last.y, last.x);
    else turn(last.y, -last.x);
    step("tick");
    return true;
  },
  key(k, down) {
    if (!down) return false;
    if (k === "ArrowUp") return turn(0, -1);
    if (k === "ArrowDown") return turn(0, 1);
    if (k === "ArrowLeft") return turn(-1, 0);
    if (k === "ArrowRight") return turn(1, 0);
    return false;
  },
  draw(ctx, x0, y0, w, h, ui) {
    const cell = Math.floor(Math.min(w / COLS, h / LINES));
    const bw = COLS * cell;
    const bh = LINES * cell;
    const bx = x0 + (w - bw) / 2;
    const by = y0 + (h - bh) / 2;
    ctx.fillStyle = "#f4f7fb";
    ctx.fillRect(bx, by, bw, bh);
    ctx.fillStyle = "#e9eef5";
    for (let y = 0; y < LINES; y++) for (let x = y % 2; x < COLS; x += 2) ctx.fillRect(bx + x * cell, by + y * cell, cell, cell);
    const flash = Math.max(0, 1 - (performance.now() - ateAt) / 400);
    if (flash) {
      ctx.strokeStyle = `rgba(42,116,228,${flash})`;
      ctx.lineWidth = 8;
      ctx.strokeRect(bx + 4, by + 4, bw - 8, bh - 8);
    }
    if (!body.length) return;
    // The bubble.
    const fx = bx + food.x * cell + cell / 2;
    const fy = by + food.y * cell + cell / 2;
    const r = cell * 0.44;
    const bub = ctx.createRadialGradient(fx - r * 0.3, fy - r * 0.35, r * 0.1, fx, fy, r);
    bub.addColorStop(0, "#ffffff");
    bub.addColorStop(0.45, "#ffb4e4");
    bub.addColorStop(1, "#5fb0ff");
    ctx.fillStyle = bub;
    ctx.beginPath();
    ctx.arc(fx, fy, r, 0, Math.PI * 2);
    ctx.fill();
    // The snake, head first.
    body.forEach((p, i) => {
      const x = bx + p.x * cell;
      const y = by + p.y * cell;
      const inset = i === 0 ? 1 : 3;
      const g = ctx.createLinearGradient(0, y, 0, y + cell);
      g.addColorStop(0, "#7cbcff");
      g.addColorStop(0.5, "#3585f0");
      g.addColorStop(1, "#1a58c6");
      ctx.fillStyle = g;
      ui.rrect(ctx, x + inset, y + inset, cell - inset * 2, cell - inset * 2, i === 0 ? 11 : 8);
      ctx.fill();
      if (i === 0) {
        ctx.fillStyle = "#fff";
        for (const s of [-1, 1]) {
          ctx.beginPath();
          ctx.arc(x + cell / 2 + dir.x * 5 - dir.y * s * 7, y + cell / 2 + dir.y * 5 + dir.x * s * 7, 4.2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    });
  },
};

snake.best = loadBest(snake.id);
