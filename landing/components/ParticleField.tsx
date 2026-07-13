"use client";

import { useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

/* Soft round sprite so points read as ink specks / paper scraps, not squares. */
function makeDotTexture() {
  const size = 64;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const g = ctx.createRadialGradient(
    size / 2,
    size / 2,
    0,
    size / 2,
    size / 2,
    size / 2,
  );
  g.addColorStop(0, "rgba(28,26,23,1)");
  g.addColorStop(0.55, "rgba(28,26,23,0.75)");
  g.addColorStop(1, "rgba(28,26,23,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function Particles({ count }: { count: number }) {
  const pointsRef = useRef<THREE.Points>(null);
  const { viewport } = useThree();
  const mouse = useRef({ x: 0, y: 0 });

  const texture = useMemo(() => makeDotTexture(), []);

  // scattered = noise (random cloud); aligned = signal (calm horizontal lattice)
  const { positions, scattered, aligned, phase } = useMemo(() => {
    const spreadX = 7;
    const spreadY = 4.2;
    const scattered = new Float32Array(count * 3);
    const aligned = new Float32Array(count * 3);
    const phase = new Float32Array(count);

    const cols = Math.ceil(Math.sqrt(count * 2.4));
    const rows = Math.ceil(count / cols);

    for (let i = 0; i < count; i++) {
      scattered[i * 3] = (Math.random() - 0.5) * 2 * spreadX;
      scattered[i * 3 + 1] = (Math.random() - 0.5) * 2 * spreadY;
      scattered[i * 3 + 2] = (Math.random() - 0.5) * 3;

      const col = i % cols;
      const row = Math.floor(i / cols);
      aligned[i * 3] = (col / (cols - 1) - 0.5) * 2 * spreadX;
      aligned[i * 3 + 1] = (row / (rows - 1) - 0.5) * spreadY * 0.85;
      aligned[i * 3 + 2] = 0;

      phase[i] = Math.random() * Math.PI * 2;
    }
    return {
      positions: scattered.slice(),
      scattered,
      aligned,
      phase,
    };
  }, [count]);

  useFrame((state) => {
    const pts = pointsRef.current;
    if (!pts) return;

    const attr = pts.geometry.attributes.position as THREE.BufferAttribute;
    const arr = attr.array as Float32Array;
    const t = state.clock.elapsedTime;

    // scroll-driven alignment: read scroll here to avoid React re-renders
    const scrollY = typeof window !== "undefined" ? window.scrollY : 0;
    const heroH = typeof window !== "undefined" ? window.innerHeight : 800;
    const align = Math.min(Math.max(scrollY / (heroH * 0.9), 0), 1);
    const ease = align * align * (3 - 2 * align); // smoothstep

    // smooth mouse follow
    mouse.current.x += (state.pointer.x - mouse.current.x) * 0.05;
    mouse.current.y += (state.pointer.y - mouse.current.y) * 0.05;

    for (let i = 0; i < count; i++) {
      const ix = i * 3;
      const driftX = Math.sin(t * 0.28 + phase[i]) * 0.16 * (1 - ease);
      const driftY = Math.cos(t * 0.24 + phase[i]) * 0.16 * (1 - ease);

      const baseX = scattered[ix] + driftX;
      const baseY = scattered[ix + 1] + driftY;
      const baseZ = scattered[ix + 2];

      const tx = baseX + (aligned[ix] - baseX) * ease;
      const ty = baseY + (aligned[ix + 1] - baseY) * ease;
      const tz = baseZ + (aligned[ix + 2] - baseZ) * ease;

      // parallax by depth — nearer specks react more to the cursor
      const depth = (baseZ + 1.5) / 3;
      arr[ix] = tx + mouse.current.x * 0.4 * depth;
      arr[ix + 1] = ty + mouse.current.y * 0.4 * depth;
      arr[ix + 2] = tz;
    }
    attr.needsUpdate = true;

    // whole field breathes / settles as it aligns
    pts.rotation.z = mouse.current.x * 0.03 * (1 - ease);
    const s = 1 + Math.sin(t * 0.2) * 0.01;
    pts.scale.set(s, s, 1);

    // fade slightly as it condenses — signal is quieter than noise
    const mat = pts.material as THREE.PointsMaterial;
    mat.opacity = 0.6 - ease * 0.18;
  });

  const scale = Math.min(viewport.width / 10, 1.15);

  return (
    <points ref={pointsRef} scale={[scale, scale, 1]}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
          count={count}
        />
      </bufferGeometry>
      <pointsMaterial
        map={texture}
        size={0.11}
        sizeAttenuation
        transparent
        opacity={0.6}
        depthWrite={false}
        color="#1c1a17"
      />
    </points>
  );
}

export default function ParticleField({ count = 460 }: { count?: number }) {
  return (
    <Canvas
      dpr={[1, 1.8]}
      camera={{ position: [0, 0, 8], fov: 52 }}
      gl={{ antialias: true, alpha: true }}
      style={{ position: "absolute", inset: 0 }}
    >
      <Particles count={count} />
    </Canvas>
  );
}
