"use client";

import { Suspense, useEffect, type RefObject } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { useProgress } from "@react-three/drei";
import Backdrop from "./Backdrop";
import TickerDrive from "./TickerDrive";
import { intro } from "@/lib/intro";

// Touch devices get a lighter render budget (they're usually phones with dense screens and small GPUs).
const COARSE = typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches;

function Ready({ onReady }: { onReady: () => void }) {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);
  useEffect(() => {
    let alive = true;
    const t0 = performance.now();
    // Compile every shader in parallel (KHR_parallel_shader_compile) so the page never freezes,
    // then reveal once the first real frame is on screen.
    gl.compileAsync(scene, camera)
      .catch(() => undefined)
      .finally(() => {
        if (process.env.NODE_ENV !== "production") console.info("[scene] shaders ready in", Math.round(performance.now() - t0), "ms");
        requestAnimationFrame(() => requestAnimationFrame(() => alive && onReady()));
      });
    return () => {
      alive = false;
    };
  }, [gl, scene, camera, onReady]);
  return null;
}

// Forwards the global three.js loading progress (models on both canvases) to the loader.
function Progress({ onProgress }: { onProgress: (p: number) => void }) {
  const progress = useProgress((s) => s.progress);
  useEffect(() => onProgress(progress), [progress, onProgress]);
  return null;
}

// The sky behind the whole page (Backdrop): one fullscreen shader.
export default function Scene({
  eventSource,
  onReady,
  onProgress,
}: {
  eventSource: RefObject<HTMLElement | null>;
  onReady: () => void;
  onProgress: (p: number) => void;
}) {
  return (
    <Canvas
      className="scene-canvas"
      eventSource={eventSource as RefObject<HTMLElement>}
      eventPrefix="client"
      frameloop="never"
      flat
      // Soft clouds don't need every device pixel.
      dpr={COARSE ? [0.75, 1] : 1}
      gl={{ antialias: false, powerPreference: "high-performance" }}
    >
      {/* While the loader is up, only tick a few times a second (compile), then full rate. */}
      <TickerDrive active={() => Number.isFinite(intro.at)} />
      <Progress onProgress={onProgress} />
      <Backdrop />
      <Suspense fallback={null}>
        <Ready onReady={onReady} />
      </Suspense>
    </Canvas>
  );
}
