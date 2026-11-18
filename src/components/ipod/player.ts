// What's playing on the iPod: Apple Music's 30-second previews of the playlist, in a plain audio element,
// with the real iPod's rules for skipping, shuffle and repeat.

import { playlist, type PlaylistTrack } from "@/playlist";

// preview / cover / link come from Apple (see lookup).
export type Track = PlaylistTrack & { preview?: string; cover?: string; link?: string };

export const songs: Track[] = playlist.map((t) => ({ ...t }));
export const library = () => songs;

export const player = {
  queue: [] as Track[],
  index: -1,
  playing: false,
  volume: 0.8,
  shuffle: false,
  repeat: "off" as "off" | "one" | "all",
  // Stopped (nothing started yet, or stop() was pressed): the mini player on the page stays away.
  stopped: true,
  listeners: new Set<() => void>(),
};

// A moment of silence: played inside the first press so the browser lets this element make sound later
// (the preview's address may only arrive after the press is over).
const SILENT = "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=";

const emit = () => player.listeners.forEach((l) => l());
const wrap = (i: number, n: number) => ((i % n) + n) % n;

let audio: HTMLAudioElement | null = null;
let looked: Promise<void> | null = null;

function el() {
  if (!audio) {
    audio = new Audio();
    audio.preload = "auto";
    audio.addEventListener("ended", ended);
    for (const e of ["playing", "waiting", "loadedmetadata", "seeked"]) audio.addEventListener(e, emit);
  }
  return audio;
}

// Preview, cover and link for every song, from Apple (once).
function lookup() {
  looked ??= fetch(`https://itunes.apple.com/lookup?id=${songs.map((s) => s.apple).join(",")}&country=us`)
    .then((r) => r.json())
    .then((j: { results: { trackId: number; previewUrl?: string; artworkUrl100?: string; trackViewUrl?: string }[] }) => {
      for (const r of j.results) {
        const s = songs.find((x) => x.apple === r.trackId);
        if (!s) continue;
        s.preview = r.previewUrl;
        s.cover = r.artworkUrl100?.replace("100x100bb", "600x600bb");
        s.link = r.trackViewUrl;
      }
      emit();
    })
    .catch(() => {
      looked = null;
    });
  return looked;
}

export const current = () => player.queue[player.index] ?? null;
const loaded = () => !!audio && !!current()?.preview && audio.src === current()?.preview;
export const position = () => (loaded() ? audio!.currentTime : 0);
export const duration = () => (loaded() && Number.isFinite(audio!.duration) ? audio!.duration : 0);
// Asked to play, not making sound yet.
export const loading = () => player.playing && (!loaded() || audio!.readyState < 3);

async function begin() {
  const t = current();
  if (!t) return;
  const a = el();
  player.playing = true;
  player.stopped = false;
  emit();
  if (!t.preview) {
    a.src = SILENT;
    a.play().catch(() => undefined);
    await lookup();
  }
  // Something else was asked for in the meantime.
  if (current() !== t || !player.playing) return;
  if (!t.preview) {
    player.playing = false;
    return emit();
  }
  a.src = t.preview;
  a.volume = player.volume;
  a.play().catch(() => {
    player.playing = false;
    emit();
  });
  session();
}

export function play(queue: Track[], index: number) {
  player.queue = queue;
  player.index = wrap(index, queue.length);
  begin();
}

export function toggle() {
  const t = current();
  if (!t) return play(library(), 0);
  if (player.playing) {
    audio?.pause();
    player.playing = false;
  } else if (loaded() && !audio!.ended) {
    player.playing = true;
    player.stopped = false;
    audio!.play().catch(() => {
      player.playing = false;
      emit();
    });
  } else begin();
  session();
  emit();
}

export function skip(dir: 1 | -1) {
  if (!current()) return;
  // Back: restart the song first, unless it only just started.
  if (dir < 0 && position() > 3) return seek(0);
  const n = player.queue.length;
  player.index = wrap(player.shuffle && n > 1 ? player.index + 1 + Math.floor(Math.random() * (n - 1)) : player.index + dir, n);
  if (player.playing) begin();
  else {
    audio?.pause();
    audio?.removeAttribute("src");
    session();
    emit();
  }
}

// Stop: silence, back to the start of the song, and the mini player on the page goes away (the iPod keeps
// its queue, so play picks the same song up again).
export function stop() {
  audio?.pause();
  if (loaded()) audio!.currentTime = 0;
  player.playing = false;
  player.stopped = true;
  session();
  emit();
}

export function seek(to: number) {
  if (!loaded()) return;
  audio!.currentTime = Math.max(0, Math.min(duration() - 0.2, to));
  emit();
}

export function setVolume(v: number) {
  player.volume = Math.min(1, Math.max(0, v));
  if (audio) audio.volume = player.volume;
  emit();
}

export function shuffleAll() {
  player.shuffle = true;
  play(library(), Math.floor(Math.random() * library().length));
}

function ended() {
  if (!loaded()) return;
  if (player.repeat === "one") {
    audio!.currentTime = 0;
    audio!.play().catch(() => undefined);
    return;
  }
  if (!player.shuffle && player.index === player.queue.length - 1 && player.repeat === "off") {
    player.playing = false;
    session();
    return emit();
  }
  skip(1);
}

// Lock screen / media keys.
function session() {
  const ms = typeof navigator !== "undefined" ? navigator.mediaSession : undefined;
  const t = current();
  if (!ms || !t) return;
  try {
    ms.metadata = new MediaMetadata({ title: t.title, artist: t.artist, album: t.album, artwork: t.cover ? [{ src: t.cover, sizes: "600x600", type: "image/jpeg" }] : [] });
    ms.playbackState = player.playing ? "playing" : "paused";
    ms.setActionHandler("play", () => !player.playing && toggle());
    ms.setActionHandler("pause", () => player.playing && toggle());
    ms.setActionHandler("nexttrack", () => skip(1));
    ms.setActionHandler("previoustrack", () => skip(-1));
  } catch {
    // Media Session is best effort.
  }
}
