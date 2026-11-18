// The site's little sounds, all made in WebAudio (no files): the click wheel's tick and clack, and for the rest
// of the page a soft pop and a glassy tink. The iPod's Clicker setting switches them all.
//
// Browsers only let a page make sound after a click or a key, so nothing plays (or queues up) before that:
// the first press anywhere wakes the audio up.

let audio: { ctx: AudioContext; noise: AudioBuffer } | null = null;

function ensure() {
  if (audio) {
    if (audio.ctx.state === "suspended") audio.ctx.resume().catch(() => undefined);
    return audio;
  }
  const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  const ctx = new AC();
  const noise = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const d = noise.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  audio = { ctx, noise };
  return audio;
}

// Only once the page may make sound (otherwise hovers would pile up and all play at the first click).
function live() {
  if (!clicker.on || !audio || audio.ctx.state !== "running") return null;
  return audio;
}

if (typeof window !== "undefined") {
  const wake = () => {
    ensure();
    window.removeEventListener("pointerdown", wake, true);
    window.removeEventListener("keydown", wake, true);
  };
  window.addEventListener("pointerdown", wake, true);
  window.addEventListener("keydown", wake, true);
}

function hit(t: number, len: number, gain: number, type: BiquadFilterType, f: number) {
  if (!audio) return;
  const { ctx, noise } = audio;
  const src = ctx.createBufferSource();
  src.buffer = noise;
  const filt = ctx.createBiquadFilter();
  filt.type = type;
  filt.frequency.value = f;
  const g = ctx.createGain();
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + len);
  src.connect(filt).connect(g).connect(ctx.destination);
  src.start(t, Math.random() * 1.5);
  src.stop(t + len + 0.02);
}

function tone(t: number, from: number, to: number, len: number, gain: number, type: OscillatorType = "sine") {
  if (!audio) return;
  const { ctx } = audio;
  const o = ctx.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(from, t);
  o.frequency.exponentialRampToValueAtTime(to, t + len * 0.8);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + 0.006);
  g.gain.exponentialRampToValueAtTime(0.0001, t + len);
  o.connect(g).connect(ctx.destination);
  o.start(t);
  o.stop(t + len + 0.02);
}

export const clicker = { on: true };

export function click(kind: "tick" | "press") {
  if (!clicker.on || !ensure() || !audio) return;
  const t = audio.ctx.currentTime;
  if (kind === "tick") hit(t, 0.012, 0.18, "highpass", 3200);
  else {
    hit(t, 0.03, 0.25, "bandpass", 1400);
    hit(t + 0.05, 0.02, 0.1, "bandpass", 2600);
  }
}

let lastSfx = 0;
// Small sounds for the page: `tick` (pointing at something), `press`, `pop` (a drop of glass landing),
// `tink` (glass touching glass). Never more than one every 30 ms, so a fast sweep doesn't rattle.
export function sfx(kind: "tick" | "press" | "pop" | "tink", pitch = 1) {
  const a = live();
  if (!a) return;
  const t = a.ctx.currentTime;
  if (t - lastSfx < 0.03) return;
  lastSfx = t;
  if (kind === "tick") hit(t, 0.012, 0.12, "highpass", 3200 * pitch);
  else if (kind === "press") {
    hit(t, 0.03, 0.18, "bandpass", 1400);
    hit(t + 0.05, 0.02, 0.07, "bandpass", 2600);
  } else if (kind === "pop") {
    tone(t, 720 * pitch, 380 * pitch, 0.09, 0.05);
    hit(t, 0.008, 0.05, "highpass", 2400);
  } else {
    tone(t, 2400 * pitch, 2350 * pitch, 0.32, 0.018);
    tone(t + 0.012, 3620 * pitch, 3600 * pitch, 0.22, 0.01);
  }
}

