// Pong against the computer: roll the wheel (or ↑ ↓) to move your paddle, the center button (or Space) serves.
// First to five.

import { block, frames, loadBest, saveBest, step, type Game } from "./game";

// The playfield, in screen px (the screen hands it 640 × 452).
const W = 640;
const H = 452;
const PW = 14;
const PH = 92;
const R = 9;
const WIN = 5;

let you = H / 2;
let cpu = H / 2;
let ball = { x: W / 2, y: H / 2, vx: 0, vy: 0 };
let points = { you: 0, cpu: 0 };
let serving = true;
let held = 0;
let stop: (() => void) | null = null;

function place(towardYou: boolean) {
  ball = { x: towardYou ? W * 0.75 : 40 + PW + R + 4, y: towardYou ? H / 2 : you, vx: 0, vy: 0 };
  serving = !towardYou;
  if (towardYou) window.setTimeout(() => pong.state === "playing" && serve(-1), 700);
}

function serve(dir: 1 | -1) {
  const a = (Math.random() - 0.5) * 0.8;
  ball.vx = Math.cos(a) * 320 * dir;
  ball.vy = Math.sin(a) * 320;
  serving = false;
  step("tick");
  return true;
}

function moveYou(dy: number) {
  you = Math.min(H - PH / 2, Math.max(PH / 2, you + dy));
  step();
  return true;
}

function point(toYou: boolean) {
  if (toYou) points.you++;
  else points.cpu++;
  pong.score = points.you;
  step("press");
  if (points.you >= WIN || points.cpu >= WIN) {
    pong.state = "over";
    // Best = most points taken off the computer in one game.
    saveBest(pong);
    return false;
  }
  // The one who lost the point gets the ball.
  place(toYou);
  return true;
}

function tick(dt: number) {
  if (pong.state !== "playing") return false;
  if (held) moveYou(held * 460 * dt);
  // The computer follows the ball, not quite fast enough.
  const target = ball.vx > 0 ? ball.y : H / 2;
  cpu += Math.max(-250 * dt, Math.min(250 * dt, target - cpu));
  cpu = Math.min(H - PH / 2, Math.max(PH / 2, cpu));
  if (serving) {
    ball.y = you;
    step();
    return true;
  }
  ball.x += ball.vx * dt;
  ball.y += ball.vy * dt;
  if (ball.y < R || ball.y > H - R) {
    ball.y = Math.min(H - R, Math.max(R, ball.y));
    ball.vy = -ball.vy;
  }
  // Paddles: bounce off at an angle from where it hit, a little faster each time.
  const hit = (py: number, side: 1 | -1) => {
    const k = (ball.y - py) / (PH / 2);
    const s = Math.min(720, Math.hypot(ball.vx, ball.vy) * 1.06);
    ball.vx = Math.cos(k * 0.9) * s * side;
    ball.vy = Math.sin(k * 0.9) * s;
    step("tick");
  };
  if (ball.vx < 0 && ball.x - R <= 40 + PW && ball.x > 30 && Math.abs(ball.y - you) <= PH / 2 + R) {
    ball.x = 40 + PW + R;
    hit(you, 1);
  }
  if (ball.vx > 0 && ball.x + R >= W - 40 - PW && ball.x < W - 30 && Math.abs(ball.y - cpu) <= PH / 2 + R) {
    ball.x = W - 40 - PW - R;
    hit(cpu, -1);
  }
  if (ball.x < -R) return point(false);
  if (ball.x > W + R) return point(true);
  step();
  return true;
}

function run() {
  stop?.();
  stop = frames(tick);
}

export const pong: Game = {
  id: "pong",
  title: "Pong",
  help: "Roll the wheel, first to five wins",
  state: "ready",
  score: 0,
  best: 0,
  status: () => `You ${points.you}  ·  ${points.cpu} CPU`,
  result: () => (points.you >= WIN ? `You win ${points.you}–${points.cpu}!` : `CPU wins ${points.cpu}–${points.you}`),
  start() {
    you = cpu = H / 2;
    points = { you: 0, cpu: 0 };
    held = 0;
    this.score = 0;
    this.best = loadBest(this.id);
    this.state = "playing";
    place(false);
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
    if (b === "center") return serving ? serve(1) : true;
    return false;
  },
  // Clockwise moves the paddle down.
  turn(d) {
    return moveYou(d * 34);
  },
  key(k, down) {
    if (k === "ArrowUp" || k === "ArrowDown") {
      const d = k === "ArrowUp" ? -1 : 1;
      if (down) held = d;
      else if (held === d) held = 0;
      return true;
    }
    if (down && k === " ") return serving ? serve(1) : true;
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
    ctx.fillStyle = "rgba(255,255,255,0.18)";
    for (let y = 8; y < H; y += 30) ctx.fillRect(W / 2 - 2, y, 4, 16);
    ctx.fillStyle = "rgba(255,255,255,0.14)";
    ctx.font = ui.font(120, 800);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(String(points.you), W / 4, H / 2);
    ctx.fillText(String(points.cpu), (W * 3) / 4, H / 2);
    block(ctx, ui, 40, you - PH / 2, PW, PH, "#6fb2ff", 7);
    block(ctx, ui, W - 40 - PW, cpu - PH / 2, PW, PH, "#ff9ad8", 7);
    const b = ctx.createRadialGradient(ball.x - 3, ball.y - 3, 1, ball.x, ball.y, R);
    b.addColorStop(0, "#ffffff");
    b.addColorStop(1, "#c9dcff");
    ctx.fillStyle = b;
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, R, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  },
};

pong.best = loadBest(pong.id);
