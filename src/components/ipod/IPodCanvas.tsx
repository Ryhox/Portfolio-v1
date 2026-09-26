"use client";

import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { Environment, Lightformer } from "@react-three/drei";
import IPodModel from "./IPodModel";

// The iPod in its own little canvas, rendered only when something changes (the screen, a
// spring). Lit like a product shot (a neutral studio, filmic tone mapping), so the white plastic keeps its
// greys instead of glaring, the way the model looks on Sketchfab.
export default function IPodCanvas({ open, onExpand, onLoaded }: { open: boolean; onExpand: () => void; onLoaded: () => void }) {
  return (
    <Canvas
      className="ipod-canvas"
      frameloop="demand"
      // The dock is this same canvas under a CSS scale: measure the untransformed size.
      resize={{ offsetSize: true }}
      dpr={[1, 2]}
      // A wider lens up close: real perspective on its edges when it turns.
      camera={{ fov: 36, near: 0.3, far: 20, position: [0, 0, 3.7] }}
      gl={{ antialias: true, alpha: true }}
    >
      <ambientLight intensity={0.25} />
      <directionalLight position={[2, 3, 4]} intensity={1.2} />
      <Environment resolution={256} frames={1}>
        <color attach="background" args={["#4a505a"]} />
        {/* Soft light on the face (what it sees is in front of it), with one streak for the gloss to catch. */}
        <Lightformer form="rect" intensity={1.4} position={[0, 4, 4]} scale={[7, 3, 1]} />
        <Lightformer form="rect" intensity={2.4} position={[-2.2, 2, 3.5]} scale={[0.35, 6, 1]} />
        {/* Big bright boxes beside and behind it: the steel edges and back reflect these, so they read as
            polished metal instead of the dark room. */}
        <Lightformer form="rect" intensity={2.6} position={[5, 0.5, -1]} scale={[5, 9, 1]} />
        <Lightformer form="rect" intensity={2} position={[-5, 0.5, -1]} scale={[5, 9, 1]} />
        <Lightformer form="rect" intensity={1.6} position={[0, 0, -6]} scale={[10, 4, 1]} />
        <Lightformer form="rect" intensity={1.8} position={[0, 6, 0]} scale={[8, 8, 1]} />
      </Environment>
      <Suspense fallback={null}>
        <IPodModel open={open} onExpand={onExpand} onLoaded={onLoaded} />
      </Suspense>
    </Canvas>
  );
}
