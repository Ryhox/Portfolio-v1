"use client";

import { useEffect, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { scroll, sky } from "@/lib/scroll";
import { currentTheme, theme } from "@/lib/theme";

// The sky behind the whole page: a clear blue day sky with two layers of drifting cumulus, lit by a soft
// sun (bright white tops, blue-grey bellies, see-through edges). The air right above the horizon stays
// clear and blue; the clouds build up higher, and rise past as you scroll (the near layer faster). At the
// very bottom the page comes to rest on a big rolling green hill, the classic desktop-wallpaper kind: a far
// ridge in the haze, then the hill itself, sunlit along its crest, wind rolling through the grass and cloud
// shadows sliding over it. In dark mode it's night: the blue deepens to ink, the clouds and the hill go dark
// and moonlit.
//
// Behind the tech stack the clouds even out to the same amount as the top of the sky, set by the scroll
// alone (no thick bank, no speed-up), so that part always looks the same.
//
// It also draws the tech stack's Liquid Glass (Stack.tsx): right under each capsule it shows the same sky,
// frosted, pulled in at the rim like a drop of glass, with a sheen where the light hits. Same pass, no copies.

// Most capsules the glass can draw at once.
const MAX_GLASS = 24;

const vertex = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.9999, 1.0);
  }
`;

const fragment = /* glsl */ `
  uniform float uTime;
  uniform float uScroll;
  uniform float uNight;
  uniform float uFloor;
  // Behind the tech stack the clouds spread evenly over the whole sky (0..1, straight from the scroll).
  uniform float uDense;
  // Phones: one octave of cloud detail less (on a small screen the finest one breaks the clouds into specks).
  uniform float uPhone;
  uniform vec2 uRes;
  // The tech stack's capsules: centre x, y and half width, height, in CSS px from the top left.
  uniform vec4 uGlass[${MAX_GLASS}];
  // and how much of each is there (it fades in with its capsule).
  uniform float uGlassA[${MAX_GLASS}];
  uniform int uGlassN;
  // Their bounds (min x, min y, max x, max y), so the rest of the sky skips them in one test.
  uniform vec4 uGlassBox;
  uniform vec3 uTop;
  uniform vec3 uMid;
  uniform vec3 uLow;
  varying vec2 vUv;

  float hash(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }
  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
  }
  float fbm(vec2 p, int n) {
    float s = 0.0;
    float a = 0.5;
    for (int i = 0; i < 5; i++) {
      if (i >= n) break;
      s += a * noise(p);
      p = mat2(1.6, 1.2, -1.2, 1.6) * p;
      a *= 0.5;
    }
    // Fewer octaves (the frosted look): the fine detail's average stands in, so there's as much cloud.
    return s + a * (1.0 - pow(0.5, float(5 - n)));
  }

  float fbm(vec2 p) {
    return fbm(p, 5);
  }

  // Cumulus: big shapes where the clouds are, billowy detail on top of them.
  float cloud(vec2 p, int n) {
    float base = fbm(p * 0.55, n);
    float puff = fbm(p * 1.8 + vec2(base * 1.6, 0.0), n);
    return base * 0.72 + puff * 0.42;
  }
  // One layer: x = coverage (soft at the edges), y = sunlight reaching it (how much cloud lies between it
  // and the sun, up and to the right). Clear sky costs one lookup. n = octaves (5 sharp, fewer = frosted);
  // frost also softens the edges, around the same middle.
  vec2 cumulus(vec2 p, float cover, int steps, int n, float frost) {
    if (cover <= 0.001) return vec2(0.0);
    float lo = 1.0 - cover;
    float d = cloud(p, n);
    float w = mix(0.16, 0.11, uDense);
    float soft = mix(w, 0.36, frost);
    float a = smoothstep(lo + (w - soft) * 0.5, lo + (w + soft) * 0.5, d);
    if (a <= 0.0) return vec2(0.0);
    float depth = 0.0;
    for (int i = 1; i <= 3; i++) {
      if (i > steps) break;
      depth += max(0.0, cloud(p + vec2(0.035, 0.1) * float(i), n) - lo);
    }
    return vec2(a, exp(-depth * 3.2));
  }

  // The hill's ridge, like the classic wallpaper: one big smooth swell, high from the left edge, topping out
  // a little left of centre, then one long slope down to the horizon on the right.
  float ridge(float X) {
    float s = X < 0.3 ? 0.78 : 0.5;
    return 0.04 + 0.22 * exp(-pow((X - 0.3) / s, 2.0));
  }
  // Far blue hills, just peeking over the horizon at the right where the slope runs out.
  float ridgeFar(float X) {
    return 0.075 + 0.05 * exp(-pow((X - 0.95) / 0.09, 2.0)) + 0.025 * exp(-pow((X - 0.86) / 0.05, 2.0));
  }

  vec3 skyAt(vec2 uv, int n, float frost) {
    float aspect = uRes.x / uRes.y;
    float night = uNight;

    // Sky: deep at the top, a lighter (still blue) haze toward the horizon.
    vec3 day = mix(uLow, uMid, smoothstep(0.0, 0.55, uv.y));
    day = mix(day, uTop, smoothstep(0.45, 1.0, uv.y));
    vec3 dark = mix(vec3(0.11, 0.16, 0.34), vec3(0.04, 0.07, 0.19), smoothstep(0.0, 0.6, uv.y));
    dark = mix(dark, vec3(0.02, 0.035, 0.11), smoothstep(0.5, 1.0, uv.y));
    vec3 col = mix(day, dark, night);

    // The sun, up in the corner, and the moon's glow at night.
    vec2 q = vec2(uv.x * aspect, uv.y);
    float sun = length(q - vec2(0.84 * aspect, 1.08));
    col += vec3(1.0, 0.97, 0.9) * (exp(-sun * sun * 2.2) * 0.3) * (1.0 - night);
    float moon = length(q - vec2(0.19 * aspect, 0.79));
    col += vec3(0.55, 0.66, 1.0) * exp(-moon * moon * 10.0) * 0.22 * night;

    // Two layers of cloud, wide and puffy, clear near the horizon and building up higher. They rise as
    // you scroll down (parallax) and drift across on their own, the near layer faster. The far layer is
    // smaller, fainter and takes on the sky's blue (air in between).
    // On a tall, narrow (phone) screen the clouds are drawn a little finer, so more than a slice of one
    // crosses it, but they stay big, soft shapes.
    float t = uTime;
    float k = clamp(0.62 / aspect, 1.0, 1.3);
    vec2 far = vec2(q.x * 0.75 + t * 0.005, q.y * 1.25 - uScroll * 0.2) * 2.4 * k;
    vec2 near = vec2(q.x * 0.6 + t * 0.011 + 7.3, q.y - uScroll * 0.5 + 2.1) * 1.35 * k;
    // Behind the tech stack, as much cloud low down as up high (the same amount the top of the sky has).
    // Over the hill at the end, a few more fair-weather clouds up high.
    float end = smoothstep(1.8, 1.0, uFloor / uRes.y);
    vec2 cf = cumulus(far, mix(0.36 * smoothstep(0.14, 0.5, uv.y), 0.36, uDense) + end * 0.03, 1, n, frost);
    vec2 cn = cumulus(near, mix(0.42 * smoothstep(0.24, 0.62, uv.y), 0.42, uDense) + end * 0.06 * smoothstep(0.45, 0.7, uv.y), n < 5 ? 1 : 3, n, frost);
    vec3 belly = vec3(0.6, 0.68, 0.8);
    vec3 sunlit = vec3(1.0, 0.995, 0.98);
    vec3 cloudFar = mix(mix(mix(belly, sunlit, cf.y), col, 0.3), mix(vec3(0.07, 0.11, 0.25), vec3(0.22, 0.28, 0.5), cf.y), night);
    vec3 cloudNear = mix(mix(belly, sunlit, cn.y), mix(vec3(0.05, 0.08, 0.2), vec3(0.3, 0.36, 0.6), cn.y), night);
    col = mix(col, cloudFar, cf.x * mix(0.7, 0.35, night));
    col = mix(col, cloudNear, cn.x * mix(0.96, 0.5, night));

    // At the very end: a low bank of white cumulus sitting on the horizon on the right, behind the hill.
    if (uFloor < uRes.y * 1.8) {
      float hz = (uFloor - 0.09 * uRes.y) / uRes.y - (1.0 - uv.y);
      float band = smoothstep(-0.01, 0.025, hz) * smoothstep(0.2, 0.06, hz);
      vec2 hp = vec2(q.x * 3.2 * k + t * 0.006 + 3.0, hz * 7.0 + 1.3);
      vec2 ch = cumulus(hp, 0.58 * band * smoothstep(0.35, 0.8, uv.x), 1, n, frost);
      vec3 cloudLow = mix(mix(belly, sunlit, 0.4 + 0.6 * ch.y), mix(vec3(0.05, 0.08, 0.2), vec3(0.3, 0.36, 0.6), ch.y), night);
      col = mix(col, cloudLow, ch.x * mix(0.97, 0.45, night));
    }
    return col;
  }

  // ---------- Liquid Glass (the tech stack's capsules) ----------
  // Signed distance to a capsule (negative inside), in px.
  float pill(vec2 px, vec4 g) {
    float a = max(g.z - g.w, 0.0);
    return length(px - vec2(clamp(px.x, g.x - a, g.x + a), g.y)) - g.w;
  }
  // The sky seen through one capsule: frosted, pulled in from just past the rim (the dome's edge bends
  // hardest, the middle hardly at all), lifted milky, with a thin sheen pooling top-left and bottom-right.
  vec3 glassAt(vec2 px, vec4 g, float d) {
    float a = max(g.z - g.w, 0.0);
    vec2 dir = px - vec2(clamp(px.x, g.x - a, g.x + a), g.y);
    float len = length(dir);
    vec2 n = len > 0.001 ? dir / len : vec2(0.0, -1.0);
    float inward = clamp(-d / g.w, 0.0, 1.0);
    float bend = 14.0 * pow(1.0 - inward, 3.0);
    vec2 at = px + n * bend;
    vec3 c = skyAt(vec2(at.x / uRes.x, 1.0 - at.y / uRes.y), 3, 1.0);
    // Sheen: a 2.5px band inside the rim, brightest where the rim faces the light (45deg, up-left).
    float band = pow(clamp(1.0 + d / 2.5, 0.0, 1.0), 1.5);
    float facing = pow(abs(dot(n, vec2(-0.7071, -0.7071))), 4.0);
    c += band * facing * 0.34;
    // The milky veil (lighter by day).
    c = mix(c, vec3(1.0), mix(0.15, 0.04, uNight));
    return c;
  }

  void main() {
    vec2 uv = vUv;
    float aspect = uRes.x / uRes.y;
    float night = uNight;
    float t = uTime;

    // Which capsule (if any) this pixel is in or right at the edge of.
    vec2 px = vec2(uv.x, 1.0 - uv.y) * uRes;
    float gd = 1e5;
    vec4 gc = vec4(0.0);
    float ga = 0.0;
    if (uGlassN > 0 && px.x > uGlassBox.x && px.y > uGlassBox.y && px.x < uGlassBox.z && px.y < uGlassBox.w) {
      for (int i = 0; i < ${MAX_GLASS}; i++) {
        if (i >= uGlassN) break;
        float d = pill(px, uGlass[i]);
        if (d < gd) {
          gd = d;
          gc = uGlass[i];
          ga = uGlassA[i];
        }
      }
    }
    vec3 col;
    if (gd < 1.0) {
      // Anti-aliased over about a pixel at the rim; inside, only the glass is drawn.
      float cover = clamp(0.5 - gd, 0.0, 1.0) * ga;
      vec3 glass = glassAt(px, gc, gd);
      col = cover < 1.0 ? mix(skyAt(uv, uPhone > 0.5 ? 4 : 5, uPhone * 0.3), glass, cover) : glass;
    } else {
      col = skyAt(uv, uPhone > 0.5 ? 4 : 5, uPhone * 0.3);
    }

    // The hill the page ends on. It rises with the last screen (its foot is the floor the footer sits on).
    float y = (1.0 - uv.y) * uRes.y;
    float x = uv.x * uRes.x;
    float H = uRes.y;
    // The hill's size goes by the screen's width (capped by its height), so on a tall, narrow phone it's
    // the same gentle swell as on a wide screen rather than a mountain up to the middle of it.
    float U = min(H, uRes.x * 0.8);
    float X = uv.x;
    if (uFloor < H * 1.8) {
      // (Just a breath of unevenness along the crest: it's a smooth, rolling hill.)
      float wob = (fbm(vec2(X * 4.0, 3.0)) - 0.5) * U * 0.004;
      float farTop = uFloor - ridgeFar(X) * U + (fbm(vec2(X * 22.0, 7.0)) - 0.5) * U * 0.012;
      float nearTop = uFloor - ridge(X) * U + wob;

      // The far hills: blue-violet in the haze.
      float farA = smoothstep(farTop - 1.2, farTop + 1.2, y);
      if (farA > 0.0) {
        float fd = clamp((y - farTop) / (U * 0.05), 0.0, 1.0);
        vec3 farDay = mix(mix(vec3(0.46, 0.52, 0.72), vec3(0.36, 0.44, 0.62), fd), uLow, 0.35);
        vec3 farNight = mix(vec3(0.05, 0.08, 0.16), vec3(0.03, 0.06, 0.12), fd);
        col = mix(col, mix(farDay, farNight, night), farA);
      }

      // The hill: vivid yellow-green on the crest, deepening down the slope, big cloud shadows sweeping
      // over it.
      float nearA = smoothstep(nearTop - 1.2, nearTop + 1.2, y);
      if (nearA > 0.0) {
        float d = (y - nearTop) / U;
        float slope = (ridge(X - 0.01) - ridge(X + 0.01)) * 50.0;
        float lit = clamp(0.55 + slope * 1.8, 0.0, 1.0);
        // Ground coordinates: wide across, squeezed toward the crest (it's farther away up there).
        vec2 g = vec2(X * aspect * 7.0, log(1.0 + d * 30.0) * 5.0);
        float patches = fbm(g * 0.6 + 2.0);
        // Grass blades: tied to the hill (they scroll with it, not stuck on the screen), and coarse enough
        // that they never shimmer into a grain like dust on the glass.
        float yh = y - uFloor;
        float blades = noise(vec2(x * 0.42, yh * 0.085)) * 0.55 + noise(vec2(x * 0.16, yh * 0.032)) * 0.45;
        // Wind: a faint breeze across the grass. Cloud shadows: big, soft, darker sweeps drifting over it.
        float wind = sin(g.x * 1.3 - g.y * 0.9 - t * 1.4 + patches * 5.0) * 0.5 + 0.5;
        float shade = smoothstep(0.46, 0.7, fbm(vec2(g.x * 0.11 + t * 0.02, g.y * 0.28)));

        vec3 grass = mix(vec3(0.5, 0.77, 0.12), vec3(0.33, 0.61, 0.08), smoothstep(0.0, 0.14, d));
        grass = mix(grass, vec3(0.16, 0.41, 0.05), smoothstep(0.12, 0.5, d));
        grass *= 0.8 + lit * 0.3;
        grass *= 0.9 + patches * 0.2;
        grass *= 0.94 + blades * 0.09;
        grass += vec3(0.03, 0.035, 0.0) * wind * (1.0 - smoothstep(0.0, 0.3, d));
        grass *= 1.0 - shade * 0.34;
        // A touch of light along the crest, and air between us and the far part of the hill.
        grass += vec3(0.07, 0.08, 0.02) * exp(-d * 260.0) * lit;
        grass = mix(grass, uLow, exp(-d * 40.0) * 0.12);

        vec3 moonlit = mix(vec3(0.06, 0.15, 0.15), vec3(0.015, 0.05, 0.06), smoothstep(0.0, 0.35, d));
        moonlit *= 0.85 + patches * 0.3 + blades * 0.08;
        moonlit += vec3(0.04, 0.09, 0.08) * wind * (1.0 - smoothstep(0.0, 0.3, d));
        moonlit += vec3(0.1, 0.24, 0.26) * exp(-d * 220.0);

        col = mix(col, mix(grass, moonlit, night), nearA);
      }
    }

    // Written as sRGB; the renderer expects linear light.
    gl_FragColor = vec4(pow(clamp(col, 0.0, 1.0), vec3(2.2)), 1.0);
    #include <colorspace_fragment>
  }
`;

const srgb = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  return new THREE.Vector3(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
};
const pal = (a: string, b: string, c: string) => [srgb(a), srgb(b), srgb(c)];
// top / middle / low per section: a clear blue day, a little brighter every section down.
const PALETTES: Record<string, THREE.Vector3[]> = {
  hero: pal("#2f7fe2", "#5ea8ef", "#a4d2f7"),
  intro: pal("#2f7fe2", "#5ea8ef", "#a4d2f7"),
  work: pal("#3587e5", "#66aff1", "#acd7f8"),
  // The end: the deep, saturated blue of the classic wallpaper, still light at the horizon.
  contact: pal("#1c57d2", "#3b80e6", "#79b2f1"),
};

// Single fullscreen backdrop, so its uniforms can live at module scope and be animated per frame.
const uniforms = {
  uTime: { value: 0 },
  uScroll: { value: 0 },
  uNight: { value: currentTheme() === "dark" ? 1 : 0 },
  uFloor: { value: 1e5 },
  uDense: { value: 0 },
  uPhone: { value: typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches ? 1 : 0 },
  uRes: { value: new THREE.Vector2(1, 1) },
  uGlass: { value: Array.from({ length: MAX_GLASS }, () => new THREE.Vector4()) },
  uGlassA: { value: new Array<number>(MAX_GLASS).fill(1) },
  uGlassN: { value: 0 },
  uGlassBox: { value: new THREE.Vector4() },
  uTop: { value: PALETTES.hero[0].clone() },
  uMid: { value: PALETTES.hero[1].clone() },
  uLow: { value: PALETTES.hero[2].clone() },
};

// Where each capsule sits in the page (document px, before any transform), measured once per layout change.
// Each frame then adds the scroll and GSAP's own transforms (read from its cache, not the page), so finding
// the glass never makes the browser lay the page out again in the middle of a frame.
type CapBox = { el: HTMLElement; cap: HTMLElement; gx: number; gy: number; w: number; h: number; lx: number; ly: number };
let caps: CapBox[] = [];
const inPage = (el: HTMLElement) => {
  let x = el.offsetWidth / 2;
  let y = el.offsetHeight / 2;
  for (let n: HTMLElement | null = el; n; n = n.offsetParent as HTMLElement | null) {
    x += n.offsetLeft;
    y += n.offsetTop;
  }
  return [x, y];
};
function measureCaps() {
  caps = sky.glass.flatMap((el) => {
    const cap = el.parentElement;
    if (!cap) return [];
    const [gx, gy] = inPage(el);
    const [lx, ly] = inPage(cap);
    return [{ el, cap, gx, gy, w: el.offsetWidth, h: el.offsetHeight, lx, ly }];
  });
}
const num = (el: HTMLElement, p: string) => Number(gsap.getProperty(el, p)) || 0;

export default function Backdrop() {
  // Re-measure whenever the layout can have moved (ScrollTrigger re-measures on resize, fonts, images).
  useEffect(() => {
    const again = () => measureCaps();
    ScrollTrigger.addEventListener("refresh", again);
    window.addEventListener("resize", again);
    document.fonts?.ready.then(again);
    return () => {
      ScrollTrigger.removeEventListener("refresh", again);
      window.removeEventListener("resize", again);
    };
  }, []);

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: vertex,
        fragmentShader: fragment,
        depthWrite: false,
        depthTest: false,
        toneMapped: false,
        uniforms,
      }),
    [],
  );

  useFrame((state, dt) => {
    // Blend toward the palette of whichever section fills the screen.
    const probe = scroll.y + scroll.vh * 0.5;
    let pal = PALETTES.hero;
    for (const [name, colors] of Object.entries(PALETTES)) {
      const top = scroll.anchors[name];
      if (top !== undefined && probe >= top) pal = colors;
    }
    const k = 1 - Math.exp(-3 * Math.min(dt, 1 / 30));
    uniforms.uTop.value.lerp(pal[0], k);
    uniforms.uMid.value.lerp(pal[1], k);
    uniforms.uLow.value.lerp(pal[2], k);
    uniforms.uTime.value = state.clock.elapsedTime;
    uniforms.uScroll.value = scroll.y / Math.max(1, scroll.vh);
    // Day and night ease into each other over about a second when the theme flips.
    const night = currentTheme() === "dark" ? 1 : 0;
    uniforms.uNight.value += (night - uniforms.uNight.value) * (1 - Math.exp(-4 * Math.min(dt, 1 / 30)));
    theme.night = uniforms.uNight.value;
    // Screen y of the floor (px from the top): the cloud bank sits right under the footer's floor line.
    uniforms.uFloor.value = Math.min(1e5, scroll.floor - scroll.y);
    // Behind the tech stack the clouds spread evenly, following the scroll exactly (no easing over time, so
    // it's the same sky at the same spot every time).
    uniforms.uDense.value = sky.dense;
    uniforms.uRes.value.set(state.size.width, state.size.height);

    // Where the capsules are this frame (after the scroll and the GSAP updates, so the glass and the capsule
    // on top always land in the same frame). Only while the tech stack is near.
    let n = 0;
    const box = uniforms.uGlassBox.value.set(1e9, 1e9, -1e9, -1e9);
    if (sky.glassNear) {
      if (sky.glassMoved || caps.length !== sky.glass.length) {
        sky.glassMoved = false;
        measureCaps();
      }
      const vh = state.size.height;
      for (const c of caps) {
        if (n >= MAX_GLASS) break;
        // Not in yet (it fades in with the scroll, Motion.tsx): no glass.
        if (c.cap.style.visibility === "hidden") continue;
        // Its row slot (drop-in: y + scale about its own centre), then the capsule's lean (hover: x, y, stretch).
        const s = num(c.cap, "scaleX") || 1;
        const gx = c.gx + num(c.el, "x");
        const gy = c.gy + num(c.el, "y");
        const x = c.lx + num(c.cap, "x") + (gx - c.lx) * s;
        const y = c.ly + num(c.cap, "y") + (gy - c.ly) * s - scroll.y;
        const hw = (c.w / 2) * s * (num(c.el, "scaleX") || 1);
        const hh = (c.h / 2) * s * (num(c.el, "scaleY") || 1);
        if (y + hh < -2 || y - hh > vh + 2) continue;
        const o = c.cap.style.opacity;
        uniforms.uGlassA.value[n] = o ? Math.min(1, Math.max(0, parseFloat(o))) : 1;
        uniforms.uGlass.value[n++].set(x, y, hw, hh);
        box.set(Math.min(box.x, x - hw - 2), Math.min(box.y, y - hh - 2), Math.max(box.z, x + hw + 2), Math.max(box.w, y + hh + 2));
      }
    }
    uniforms.uGlassN.value = n;
  });

  return (
    <mesh frustumCulled={false} renderOrder={-1000} material={material}>
      <planeGeometry args={[2, 2]} />
    </mesh>
  );
}
