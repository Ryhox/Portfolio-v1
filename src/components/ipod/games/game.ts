// What every iPod game is: a state, a score, what it does with the wheel's buttons and turns (and the keys),
// and how it draws its playfield. The Ready / Paused / Game Over cards and the title bar are drawn around it
// by the screen (screen.ts); os.ts routes the controls.

export type Button = "menu" | "play" | "prev" | "next" | "center";
export type State = "ready" | "playing" | "paused" | "over";

// Drawing helpers the screen lends the games (its font and colors).
export type Ui = {
  font: (size: number, weight?: number) => string;
  ink: string;
  soft: string;
  rrect: (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => void;
};

export type Game = {
  id: string;
  title: string;
  // One line on the Ready card: how to play.
  help: string;
  state: State;
  score: number;
  best: number;
  // The title bar while playing (defaults to the score).
  status?: () => string;
  // The Game Over card's line (defaults to score and best).
  result?: () => string;
  start(): void;
  pause(): void;
  resume(): void;
  // Controls while playing. false = this game doesn't use it (MENU then pauses, ▶❚❚ plays music, …).
  press(b: Button): boolean;
  turn(d: 1 | -1): boolean;
  key(k: string, down: boolean): boolean;
  draw(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, ui: Ui): void;
};

// Games report here after every change (the screen redraws; "tick" / "press" also click).
export const events = { onStep: null as null | ((sound?: "tick" | "press") => void) };
export const step = (sound?: "tick" | "press") => events.onStep?.(sound);

const key = (id: string) => `ipod-best-${id}`;
export function loadBest(id: string) {
  try {
    return Number(localStorage.getItem(key(id))) || 0;
  } catch {
    return 0;
  }
}
export function saveBest(g: Game) {
  if (g.score <= g.best) return;
  g.best = g.score;
  try {
    localStorage.setItem(key(g.id), String(g.best));
  } catch {
    // Storage can be blocked; the best score just won't survive a reload.
  }
}

// A frame loop (seconds per frame, capped) that runs until the callback returns false.
export function frames(fn: (dt: number) => boolean) {
  let raf = 0;
  let last = 0;
  const tick = (t: number) => {
    const dt = last ? Math.min(0.05, (t - last) / 1000) : 1 / 60;
    last = t;
    if (fn(dt)) raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);
  return () => cancelAnimationFrame(raf);
}

// A glossy candy block, the look every game's pieces share.
export function block(ctx: CanvasRenderingContext2D, ui: Ui, x: number, y: number, w: number, h: number, color: string, r = 6) {
  const g = ctx.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, "rgba(255,255,255,0.55)");
  g.addColorStop(0.45, "rgba(255,255,255,0.08)");
  g.addColorStop(1, "rgba(0,0,0,0.12)");
  ui.rrect(ctx, x, y, w, h, r);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.fillStyle = g;
  ctx.fill();
}
