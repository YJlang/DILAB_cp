"use client";

import { useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

type Variant = "hero" | "cta";

const dummy = new THREE.Object3D();
const tmpColor = new THREE.Color();

// Palette (kept in sync with the CSS tokens)
const INK = new THREE.Color("#1c1a17");
const WARM = new THREE.Color("#8a8175");
const PAPER = new THREE.Color("#faf7f2");
const AMBER = new THREE.Color("#c77b3f");
const DARK = new THREE.Color("#2a2620");

type Datum = {
  bx: number;
  by: number;
  bz: number;
  tx: number;
  ty: number;
  tz: number;
  phase: number;
  spin: number;
  radius: number;
  isPaper: boolean;
};

function buildData(count: number, paperCount: number, variant: Variant) {
  const spreadX = 8;
  const spreadY = 4.6;
  const data: Datum[] = [];

  const cols = Math.ceil(Math.sqrt(count * 2.6));
  const rows = Math.ceil(count / cols);

  let madePaper = 0;
  const paperEvery = count / paperCount;

  for (let i = 0; i < count; i++) {
    // exactly `paperCount` paper scraps, evenly spread through the swarm
    const isPaper =
      madePaper < paperCount && i >= Math.round(madePaper * paperEvery);
    if (isPaper) madePaper++;

    // scattered "noise" cloud, wide in z for genuine depth
    const bx = (Math.random() - 0.5) * 2 * spreadX;
    const by = (Math.random() - 0.5) * 2 * spreadY;
    const bz = -6 + Math.random() * 7.5; // -6 (far) .. 1.5 (near)

    let tx: number, ty: number, tz: number;
    if (variant === "hero") {
      // "signal" target: a calm horizontal lattice near the focal plane
      const col = i % cols;
      const row = Math.floor(i / cols);
      tx = (col / (cols - 1) - 0.5) * 2 * spreadX;
      ty = (row / (rows - 1) - 0.5) * spreadY * 0.8;
      tz = -0.4 + Math.random() * 0.8;
    } else {
      // "convergence" target: a thin signal line LOW in the frame, kept clear
      // of the headline so the copy always stays legible
      tx = (Math.random() - 0.5) * spreadX * 1.15;
      ty = -2.55 + (Math.random() - 0.5) * 0.7;
      tz = -0.6 + Math.random() * 1.2;
    }

    data.push({
      bx,
      by,
      bz,
      tx,
      ty,
      tz,
      phase: Math.random() * Math.PI * 2,
      spin: (Math.random() - 0.5) * 1.4,
      radius: 0.03 + Math.random() * 0.05,
      isPaper,
    });
  }
  return data;
}

/** cheap coupled-sine field — reads as organic, curl-like flow without a noise lib */
function flow(x: number, y: number, z: number, t: number, phase: number) {
  return {
    fx:
      Math.sin(t * 0.32 + y * 0.5 + phase) * 0.22 +
      Math.cos(t * 0.21 + z * 0.4) * 0.12,
    fy:
      Math.cos(t * 0.27 + x * 0.5 + phase) * 0.22 +
      Math.sin(t * 0.19 + z * 0.35) * 0.12,
    fz: Math.sin(t * 0.17 + x * 0.35 + y * 0.4 + phase) * 0.16,
  };
}

function Swarm({ count, variant }: { count: number; variant: Variant }) {
  const sphereRef = useRef<THREE.InstancedMesh>(null);
  const paperRef = useRef<THREE.InstancedMesh>(null);
  const mouse = useRef({ x: 0, y: 0, tx: 0, ty: 0 });
  const { camera, gl } = useThree();

  const paperCount = Math.max(1, Math.round(count * 0.13));
  const sphereCount = count - paperCount;

  const data = useMemo(
    () => buildData(count, paperCount, variant),
    [count, paperCount, variant],
  );

  // global pointer (canvas is pointer-events:none, so listen on window)
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      mouse.current.tx = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.current.ty = -((e.clientY / window.innerHeight) * 2 - 1);
    };
    window.addEventListener("mousemove", onMove, { passive: true });
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  useFrame((state) => {
    const spheres = sphereRef.current;
    const papers = paperRef.current;
    if (!spheres || !papers) return;

    const t = state.clock.elapsedTime;

    // progress from the canvas's own position — unifies hero + cta
    const rect = gl.domElement.getBoundingClientRect();
    const vh = window.innerHeight || 800;
    let progress: number;
    if (variant === "hero") {
      progress = Math.min(Math.max(-rect.top / (vh * 0.9), 0), 1);
    } else {
      progress = Math.min(Math.max((vh - rect.top) / (vh * 1.05), 0), 1);
    }
    const ease = progress * progress * (3 - 2 * progress); // smoothstep
    const settle = 1 - ease * 0.82;

    // smooth camera parallax → immediate sense of depth
    mouse.current.x += (mouse.current.tx - mouse.current.x) * 0.045;
    mouse.current.y += (mouse.current.ty - mouse.current.y) * 0.045;
    camera.position.x = mouse.current.x * 0.9;
    camera.position.y = mouse.current.y * 0.6;
    camera.lookAt(0, 0, 0);

    let si = 0;
    let pi = 0;
    for (let i = 0; i < count; i++) {
      const d = data[i];

      const f = flow(d.bx, d.by, d.bz, t, d.phase);
      const nx = d.bx + f.fx * settle;
      const ny = d.by + f.fy * settle;
      const nz = d.bz + f.fz * settle;

      // noise -> signal: lerp scattered flow toward the aligned/converged target
      const x = nx + (d.tx - nx) * ease;
      const y = ny + (d.ty - ny) * ease;
      const z = nz + (d.tz - nz) * ease;

      // DoF cue from current depth
      const depth = THREE.MathUtils.clamp((z + 6) / 7.5, 0, 1);

      dummy.position.set(x, y, z);

      if (d.isPaper) {
        dummy.rotation.set(
          t * d.spin * 0.4 + d.phase,
          t * d.spin * 0.5,
          d.phase,
        );
        const s = d.radius * 2.4;
        dummy.scale.set(s, s * 1.35, s);
        dummy.updateMatrix();
        papers.setMatrixAt(pi, dummy.matrix);

        if (variant === "hero") {
          tmpColor.copy(WARM).lerp(PAPER, (1 - depth) * 0.7);
        } else {
          tmpColor.copy(i % 5 === 0 ? AMBER : PAPER);
          tmpColor.lerp(DARK, (1 - depth) * 0.55);
        }
        papers.setColorAt(pi, tmpColor);
        pi++;
      } else {
        dummy.rotation.set(0, 0, 0);
        dummy.scale.setScalar(d.radius * (0.65 + depth * 0.9));
        dummy.updateMatrix();
        spheres.setMatrixAt(si, dummy.matrix);

        if (variant === "hero") {
          tmpColor.copy(INK).lerp(WARM, 1 - depth);
          tmpColor.lerp(PAPER, (1 - depth) * 0.55);
        } else {
          tmpColor.copy(i % 6 === 0 ? AMBER : PAPER);
          tmpColor.lerp(DARK, (1 - depth) * 0.6);
        }
        spheres.setColorAt(si, tmpColor);
        si++;
      }
    }

    spheres.instanceMatrix.needsUpdate = true;
    papers.instanceMatrix.needsUpdate = true;
    if (spheres.instanceColor) spheres.instanceColor.needsUpdate = true;
    if (papers.instanceColor) papers.instanceColor.needsUpdate = true;

    // whole field breathes and quiets as it resolves.
    // CTA stays dim so the headline over it is never obscured.
    const globalOpacity =
      variant === "hero" ? 0.9 - ease * 0.14 : 0.18 + ease * 0.34;
    (spheres.material as THREE.MeshBasicMaterial).opacity = globalOpacity;
    (papers.material as THREE.MeshBasicMaterial).opacity = globalOpacity * 0.8;
  });

  return (
    <>
      <instancedMesh
        ref={sphereRef}
        args={[undefined, undefined, sphereCount]}
        frustumCulled={false}
      >
        <sphereGeometry args={[1, 10, 10]} />
        <meshBasicMaterial transparent opacity={0.9} toneMapped={false} />
      </instancedMesh>
      <instancedMesh
        ref={paperRef}
        args={[undefined, undefined, paperCount]}
        frustumCulled={false}
      >
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial
          transparent
          opacity={0.8}
          side={THREE.DoubleSide}
          depthWrite={false}
          toneMapped={false}
        />
      </instancedMesh>
    </>
  );
}

export default function ParticleField({
  count = 480,
  variant = "hero",
}: {
  count?: number;
  variant?: Variant;
}) {
  return (
    <Canvas
      dpr={[1, 1.8]}
      camera={{ position: [0, 0, 7.5], fov: 55 }}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      style={{ position: "absolute", inset: 0 }}
    >
      <Swarm count={count} variant={variant} />
    </Canvas>
  );
}
