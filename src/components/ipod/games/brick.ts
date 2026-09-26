// Brick, the iPod's own game: roll the wheel (or ⏮ / ⏭, or ← →) to move the paddle, the center button (or
// Space) launches the ball. Three balls; clear the wall and a faster one comes down.

import { block, frames, loadBest, saveBest, step, type Game } from "./game";

// The playfield, in screen px (the screen hands it 640 × 452).
const W = 640;
const H = 452;
const COLS = 10;
const ROWS = 5;
const BW = 60;
const BH = 22;
const GAP = 4;
const LEFT = (W - (COLS * BW + (COLS - 1) * GAP)) / 2;
const TOP = 38;
const PW = 116;
const PH = 16;
const PY = H - 34;
const R = 9;
const ROW_COLORS = ["#ff6f86", "#ff9f45", "#ffcf4a", "#6fdc7a", "#4fc8ff"];

let bricks: boolean[] = [];
let px = W / 2;
let ball = { x: W / 2, y: PY - R, vx: 0, vy: 0, stuck: true };
let speed = 330;
let lives = 3;
let wall = 1;
let stop: (() => void) | null = null;
// Held arrow keys: -1, 0, 1.
let held = 0;

function newWall() {
  bricks = Array(COLS * ROWS).fill(true);
  ball = { x: px, y: PY - R, vx: 0, vy: 0, stuck: true };
}

function launch() {
  if (!ball.stuck) return false;
  const a = -Math.PI / 2 + (Math.random() - 0.5) * 0.9;
  ball = { ...ball, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, stuck: false };
  step("tick");
  return true;
}

function movePaddle(dx: number) {
  px = Math.min(W - PW / 2, Math.max(PW / 2, px + dx));
  if (ball.stuck) ball.x = px;
  step();
  return true;
}

function tick(dt: number) {
  if (brick.state !== "playing") return false;
  if (held) movePaddle(held * 520 * dt);
  if (ball.stuck) return true;
  ball.x += ball.vx * dt;
  ball.y += ball.vy * dt;
  // Walls.
  if (ball.x < R) {
    ball.x = R;
    ball.vx = Math.abs(ball.vx);
  } else if (ball.x > W - R) {
    ball.x = W - R;
    ball.vx = -Math.abs(ball.vx);
  }
  if (ball.y < R) {
    ball.y = R;
    ball.vy = Math.abs(ball.vy);
  }
  // Paddle: the further from its middle, the steeper the bounce.
  if (ball.vy > 0 && ball.y + R >= PY && ball.y + R <= PY + PH + 8 && Math.abs(ball.x - px) <= PW / 2 + R) {
    const k = (ball.x - px) / (PW / 2);
    const a = -Math.PI / 2 + k * 1.05;
    ball.vx = Math.cos(a) * speed;
    ball.vy = Math.sin(a) * speed;
    ball.y = PY - R;
    step("tick");
  }
  // Bricks: bounce off the side it came in through.
  for (let i = 0; i < bricks.length; i++) {
    if (!bricks[i]) continue;
    const bx = LEFT + (i % COLS) * (BW + GAP);
    const by = TOP + Math.floor(i / COLS) * (BH + GAP);
    const cx = Math.max(bx, Math.min(ball.x, bx + BW));
    const cy = Math.max(by, Math.min(ball.y, by + BH));
    if ((ball.x - cx) ** 2 + (ball.y - cy) ** 2 > R * R) continue;
    bricks[i] = false;
    brick.score += 10 * wall;
    const overlapX = Math.min(ball.x + R - bx, bx + BW - (ball.x - R));
    const overlapY = Math.min(ball.y + R - by, by + BH - (ball.y - R));
    if (overlapX < overlapY) ball.vx = -ball.vx;
    else ball.vy = -ball.vy;
    step("tick");
    break;
  }
  if (!bricks.some(Boolean)) {
    wall++;
    speed *= 1.12;
    newWall();
    step("press");
  }
  // Missed.
  if (ball.y > H + R) {
    lives--;
    if (lives <= 0) {
      brick.state = "over";
      saveBest(brick);
      step("press");
      return false;
    }
    ball = { x: px, y: PY - R, vx: 0, vy: 0, stuck: true };
    step("press");
  }
  step();
  return true;
}

function run() {
  stop?.();
  stop = frames(tick);
}

export const brick: Game = {
  id: "brick",
  title: "Brick",
  help: "Roll the wheel to move, center launches",
  state: "ready",
  score: 0,
  best: 0,
  status: () => `Score ${brick.score}  ·  ${"●".repeat(Math.max(0, lives))}`,
  start() {
    px = W / 2;
    speed = 330;
    lives = 3;
    wall = 1;
    held = 0;
    this.score = 0;
    this.best = loadBest(this.id);
    newWall();
    this.state = "playing";
    run();
  },
  pause() {
    if (this.state !== "playing") return;
    this.state = "paused";
    held = 0;
    stop?.();
  },
  resume() {
    if (this.state !== "paused") return;
    this.state = "playing";
    run();
  },
  press(b) {
    if (b === "center") return launch();
    if (b === "prev") return movePaddle(-60);
    if (b === "next") return movePaddle(60);
    return false;
  },
  turn(d) {
    return movePaddle(d * 38);
  },
  key(k, down) {
    if (k === "ArrowLeft" || k === "ArrowRight") {
      const d = k === "ArrowLeft" ? -1 : 1;
      if (down) held = d;
      else if (held === d) held = 0;
      return true;
    }
    if (down && k === " ") return launch();
    return false;
  },
  draw(ctx, x0, y0, w, h, ui) {
    ctx.save();
    ctx.translate(x0 + (w - W) / 2, y0 + (h - H) / 2);
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "#0f1a3a");
    g.addColorStop(1, "#1d3470");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    bricks.forEach((on, i) => {
      if (!on) return;
      block(ctx, ui, LEFT + (i % COLS) * (BW + GAP), TOP + Math.floor(i / COLS) * (BH + GAP), BW, BH, ROW_COLORS[Math.floor(i / COLS) % ROW_COLORS.length], 5);
    });
    block(ctx, ui, px - PW / 2, PY, PW, PH, "#e8edf5", 8);
    const b = ctx.createRadialGradient(ball.x - 3, ball.y - 3, 1, ball.x, ball.y, R);
    b.addColorStop(0, "#ffffff");
    b.addColorStop(1, "#9fc8ff");
    ctx.fillStyle = b;
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, R, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  },
};

brick.best = loadBest(brick.id);
