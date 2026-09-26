// The click wheel's clicker: a tiny tick while scrolling, a heavier clack for a button (WebAudio, no files).

let audio: { ctx: AudioContext; noise: AudioBuffer } | null = null;

function ensure() {
  if (audio) {
    if (audio.ctx.state === "suspended") audio.ctx.resume().catch(() => undefined);
    return audio;
  }
  const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  const ctx = new AC();
  const noise = ctx.createBuffer(1, ctx.sampleRate / 4, ctx.sampleRate);
  const d = noise.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  audio = { ctx, noise };
  return audio;
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
  src.start(t, Math.random() * 0.1);
  src.stop(t + len + 0.02);
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
