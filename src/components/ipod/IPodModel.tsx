"use client";
/* eslint-disable react-hooks/immutability -- three objects and textures are driven imperatively. */

import { useGLTF } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import * as ipod from "./os";
import { draw, HEAD, loadSiteFont, ROW_H, SH, SW } from "./screen";

export const MODEL = "/models/ipod.glb";

// Where things are on the model's front, in its own units (x = out of the face, y = up, -z = right).
// Measured from its texture: on the front, y = 2.833 u - 0.977 and z = 2.833 v - 0.559.
const FRONT = 0.1386;
const WHEEL = { y: -0.387, z: -0.002, R: 0.42, r: 0.129 };
const GLASS = { y0: 0.2168, y1: 0.8697, z0: -0.3972, z1: 0.3996, r: 0.035 };
// One notch of the wheel.
const NOTCH = Math.PI / 12;
type Zone = ipod.Button;
type Spring = { x: number; v: number };

// A damped spring toward `to`. Returns whether it's still moving.
function spring(s: Spring, to: number, dt: number, k: number, c: number) {
  s.v += (k * (to - s.x) - c * s.v) * dt;
  s.x += s.v * dt;
  return Math.abs(to - s.x) > 1e-4 || Math.abs(s.v) > 1e-3;
}

// Which control a point on the face is (face coords from the wheel's center: x right, y up).
function zoneAt(fx: number, fy: number): Zone | null {
  const d = Math.hypot(fx, fy);
  if (d <= WHEEL.r) return "center";
  if (d > WHEEL.R + 0.03) return null;
  const a = Math.atan2(fy, fx);
  if (Math.abs(a) <= Math.PI / 4) return "next";
  if (Math.abs(a) >= (Math.PI * 3) / 4) return "prev";
  return a > 0 ? "menu" : "play";
}

const FIRE: Record<Zone, () => void> = {
  menu: () => ipod.back(),
  play: ipod.playPause,
  prev: () => ipod.skip(-1),
  next: () => ipod.skip(1),
  center: ipod.select,
};

// The rounded screen, sized to the glass, with 0..1 UVs.
function screenGeometry() {
  const w = GLASS.z1 - GLASS.z0;
  const h = GLASS.y1 - GLASS.y0;
  const r = GLASS.r;
  const shape = new THREE.Shape();
  shape.moveTo(-w / 2 + r, -h / 2);
  shape.lineTo(w / 2 - r, -h / 2);
  shape.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r);
  shape.lineTo(w / 2, h / 2 - r);
  shape.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2);
  shape.lineTo(-w / 2 + r, h / 2);
  shape.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r);
  shape.lineTo(-w / 2, -h / 2 + r);
  shape.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2);
  const geo = new THREE.ShapeGeometry(shape, 6);
  const pos = geo.getAttribute("position");
  const uv = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) {
    uv[i * 2] = (pos.getX(i) + w / 2) / w;
    uv[i * 2 + 1] = (pos.getY(i) + h / 2) / h;
  }
  geo.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  return geo;
}

export default function IPodModel({ open, onExpand, onLoaded }: { open: boolean; onExpand: () => void; onLoaded?: () => void }) {
  const { scene } = useGLTF(MODEL);
  const gl = useThree((s) => s.gl);
  const camera = useThree((s) => s.camera);
  const invalidate = useThree((s) => s.invalidate);

  const model = useRef<THREE.Group>(null);
  const turn = useRef<THREE.Group>(null);
  const holdBox = useRef<THREE.Mesh>(null);
  const orange = useRef<THREE.Mesh>(null);

  // What the pointer and the springs share between frames.
  const st = useRef({
    open,
    hold: { x: 0, v: 0 },
    // Turned (around its upright axis only) toward the middle of the screen, a little more once picked up.
    yaw: { x: -0.16, v: 0 },
  });
  useEffect(() => {
    st.current.open = open;
    invalidate();
  }, [open, invalidate]);
  // On phones it comes up in the middle of the screen, so there it faces you straight on.
  const phone = useRef(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 899px)");
    const sync = () => {
      phone.current = mq.matches;
      invalidate();
    };
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, [invalidate]);

  const screen = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = SW;
    canvas.height = SH;
    const ctx = canvas.getContext("2d")!;
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;
    // Unlit and not tone mapped: it glows like a backlit LCD.
    const mat = new THREE.MeshBasicMaterial({ map: tex, toneMapped: false });
    return { ctx, tex, mat, geo: screenGeometry() };
  }, []);

  const hold = useMemo(
    () => ({
      box: new THREE.BoxGeometry(0.3, 0.16, 0.3),
      boxMat: new THREE.MeshBasicMaterial(),
      orange: new THREE.PlaneGeometry(0.06, 0.07),
      orangeMat: new THREE.MeshBasicMaterial({ color: "#ff8a1f", toneMapped: false }),
    }),
    [],
  );

  useEffect(
    () => () => {
      screen.tex.dispose();
      screen.mat.dispose();
      screen.geo.dispose();
      hold.box.dispose();
      hold.boxMat.dispose();
      hold.orange.dispose();
      hold.orangeMat.dispose();
    },
    [screen, hold],
  );

  const holdSwitch = useMemo(() => scene.getObjectByName("Switch_low") ?? null, [scene]);

  // A touch of clear coat: the real one's front is glossy polycarbonate, so it catches the light.
  useMemo(() => {
    const glossy = new Map<THREE.Material, THREE.MeshPhysicalMaterial>();
    scene.traverse((o) => {
      const mesh = o as THREE.Mesh;
      const m = mesh.material as THREE.MeshStandardMaterial | undefined;
      if (!mesh.isMesh || !m || (m as THREE.MeshPhysicalMaterial).isMeshPhysicalMaterial) return;
      let p = glossy.get(m);
      if (!p) {
        p = new THREE.MeshPhysicalMaterial({
          map: m.map,
          normalMap: m.normalMap,
          normalScale: m.normalScale,
          roughnessMap: m.roughnessMap,
          metalnessMap: m.metalnessMap,
          metalness: m.metalness,
          color: m.color,
          // A little smoother and shinier than the scan: it reads as polished metal and gloss.
          roughness: Math.min(1, m.roughness * 0.6),
          envMapIntensity: 1.5,
          clearcoat: 1,
          clearcoatRoughness: 0.05,
        });
        glossy.set(m, p);
      }
      mesh.material = p;
    });
  }, [scene]);


  // ---------- Screen ----------
  useEffect(() => {
    loadSiteFont();
    let raf = 0;
    const redraw = () => {
      draw(screen.ctx);
      screen.tex.needsUpdate = true;
      invalidate();
    };
    const schedule = () => {
      if (!raf)
        raf = requestAnimationFrame(() => {
          raf = 0;
          redraw();
        });
    };
    ipod.os.listeners.add(schedule);
    document.fonts?.ready.then(() => {
      loadSiteFont();
      schedule();
    });
    const iv = window.setInterval(() => {
      if (ipod.os.dirty || ipod.animating()) redraw();
    }, 120);
    redraw();
    onLoaded?.();
    return () => {
      ipod.os.listeners.delete(schedule);
      window.clearInterval(iv);
      cancelAnimationFrame(raf);
    };
  }, [screen, invalidate, onLoaded]);

  // ---------- Pointer and mouse wheel ----------
  useEffect(() => {
    const el = gl.domElement;
    const s = st.current;
    const ray = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    const inv = new THREE.Matrix4();
    const local = new THREE.Ray();

    // Where the pointer is on the face (relative to the wheel), and whether it's on the hold switch.
    const pick = (e: { clientX: number; clientY: number }) => {
      const r = el.getBoundingClientRect();
      ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(ndc, camera);
      const onHold = !!holdBox.current && ray.intersectObject(holdBox.current).length > 0;
      const m = model.current;
      if (!m) return null;
      inv.copy(m.matrixWorld).invert();
      local.copy(ray.ray).applyMatrix4(inv);
      const t = (FRONT - local.origin.x) / local.direction.x;
      if (!Number.isFinite(t) || t < 0) return null;
      const z = local.origin.z + local.direction.z * t;
      const y = local.origin.y + local.direction.y * t;
      const fx = -(z - WHEEL.z);
      const fy = y - WHEEL.y;
      // On the glass: where on the screen's own pixels (its left edge is the face's right-hand z).
      const screen =
        z >= GLASS.z0 && z <= GLASS.z1 && y >= GLASS.y0 && y <= GLASS.y1
          ? { x: ((GLASS.z1 - z) / (GLASS.z1 - GLASS.z0)) * SW, y: ((GLASS.y1 - y) / (GLASS.y1 - GLASS.y0)) * SH }
          : null;
      return { fx, fy, zone: zoneAt(fx, fy), hold: onHold, screen };
    };

    let drag: null | { id: number; zone: Zone; last: number; turned: number; acc: number; moved: boolean } = null;

    const down = (e: PointerEvent) => {
      if (!s.open) {
        onExpand();
        return;
      }
      const hit = pick(e);
      if (!hit) return;
      if (hit.hold) {
        ipod.toggleHold();
        return;
      }
      // The screen can be tapped too: a row opens, the title bar goes back.
      if (hit.screen) {
        e.preventDefault();
        ipod.tap(hit.screen.y < HEAD ? "title" : Math.floor((hit.screen.y - HEAD) / ROW_H));
        invalidate();
        return;
      }
      if (!hit.zone) return;
      e.preventDefault();
      el.setPointerCapture(e.pointerId);
      drag = { id: e.pointerId, zone: hit.zone, last: Math.atan2(hit.fy, hit.fx), turned: 0, acc: 0, moved: false };
    };

    const move = (e: PointerEvent) => {
      const hit = pick(e);
      if (drag && e.pointerId === drag.id && hit) {
        // Around the ring: past a small turn it's scrolling, not a press.
        if (drag.zone !== "center") {
          const a = Math.atan2(hit.fy, hit.fx);
          let d = a - drag.last;
          if (d > Math.PI) d -= Math.PI * 2;
          if (d < -Math.PI) d += Math.PI * 2;
          drag.last = a;
          drag.turned += d;
          if (!drag.moved && Math.abs(drag.turned) > 0.22) drag.moved = true;
          if (drag.moved) {
            drag.acc += d;
            // Clockwise (the angle going down) scrolls down.
            while (drag.acc <= -NOTCH) {
              drag.acc += NOTCH;
              ipod.scroll(1);
            }
            while (drag.acc >= NOTCH) {
              drag.acc -= NOTCH;
              ipod.scroll(-1);
            }
          }
        }
      } else if (e.pointerType === "mouse") {
        if (s.open && hit?.screen && hit.screen.y >= HEAD) ipod.hover(Math.floor((hit.screen.y - HEAD) / ROW_H));
        const cursor = !s.open || hit?.zone || hit?.hold || hit?.screen ? "pointer" : "";
        if (el.style.cursor !== cursor) el.style.cursor = cursor;
      }
      invalidate();
    };

    const up = (e: PointerEvent) => {
      if (!drag || e.pointerId !== drag.id) return;
      if (!drag.moved) FIRE[drag.zone]();
      drag = null;
    };


    // A mouse wheel / trackpad over the iPod turns its wheel: one notch of a mouse wheel is one step
    // (whatever distance the browser reports for it), a trackpad steps every little way.
    let acc = 0;
    const wheel = (e: WheelEvent) => {
      if (!s.open) return;
      e.preventDefault();
      if (!e.deltaY) return;
      if (e.deltaMode !== 0 || Math.abs(e.deltaY) >= 40) {
        acc = 0;
        ipod.scroll(e.deltaY > 0 ? 1 : -1);
        return;
      }
      acc += e.deltaY;
      if (Math.abs(acc) >= 40) {
        ipod.scroll(acc > 0 ? 1 : -1);
        acc = 0;
      }
    };

    el.addEventListener("pointerdown", down);
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
    el.addEventListener("wheel", wheel, { passive: false });
    return () => {
      el.removeEventListener("pointerdown", down);
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("pointercancel", up);
      el.removeEventListener("wheel", wheel);
    };
  }, [gl, camera, invalidate, onExpand]);

  // ---------- Springs ----------
  useFrame((_, delta) => {
    const s = st.current;
    const dt = Math.min(delta, 1 / 30);
    let moving = spring(s.yaw, phone.current ? 0 : s.open ? -0.34 : -0.16, dt, 90, 15);
    if (turn.current) turn.current.rotation.y = s.yaw.x;
    // The hold switch slides over (and shows its orange).
    moving = spring(s.hold, ipod.os.hold ? 1 : 0, dt, 400, 24) || moving;
    if (holdSwitch) holdSwitch.position.z = -0.07 * s.hold.x;
    if (orange.current) orange.current.visible = s.hold.x > 0.35;
    if (moving) invalidate();
  });

  return (
    <group ref={turn}>
      <group ref={model} rotation-y={-Math.PI / 2}>
        <primitive object={scene} scale={10} />
        <mesh geometry={screen.geo} material={screen.mat} position={[FRONT + 0.002, (GLASS.y0 + GLASS.y1) / 2, (GLASS.z0 + GLASS.z1) / 2]} rotation-y={Math.PI / 2} />
        {/* Behind the hold switch: orange when it's on. And a generous invisible target for clicking it. */}
        <mesh ref={orange} geometry={hold.orange} material={hold.orangeMat} position={[0, 0.9955, -0.218]} rotation-x={-Math.PI / 2} rotation-z={Math.PI / 2} visible={false} />
        <mesh ref={holdBox} geometry={hold.box} material={hold.boxMat} position={[0, 0.97, -0.28]} visible={false} />
      </group>
    </group>
  );
}

useGLTF.preload(MODEL);
