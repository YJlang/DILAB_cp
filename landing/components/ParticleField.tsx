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

// Where the "DILAB" wordmark forms, per variant, in world units.
// hero forms it low (below the headline) and early enough that it's still
// on-screen; cta forms it near centre as the closing flourish.
const FORMATION = {
  hero: { width: 6.6, centerX: 0.6, centerY: -1.35 },
  cta: { width: 8.2, centerX: 0, centerY: -1.7 },
} as const;

type Datum = {
  bx: number;
  by: number;
  bz: number;
  phase: number;
  spin: number;
  radius: number;
  isPaper: boolean;
};

function buildData(count: number, paperCount: number) {
  const spreadX = 8;
  const spreadY = 4.6;
  const data: Datum[] = [];

  let madePaper = 0;
  const paperEvery = count / paperCount;

  for (let i = 0; i < count; i++) {
    // exactly `paperCount` paper scraps, evenly spread through the swarm
    const isPaper =
      madePaper < paperCount && i >= Math.round(madePaper * paperEvery);
    if (isPaper) madePaper++;

    data.push({
      // scattered "noise" cloud, wide in z for genuine depth
      bx: (Math.random() - 0.5) * 2 * spreadX,
      by: (Math.random() - 0.5) * 2 * spreadY,
      bz: -6 + Math.random() * 7.5, // -6 (far) .. 1.5 (near)
      phase: Math.random() * Math.PI * 2,
      spin: (Math.random() - 0.5) * 1.4,
      radius: 0.03 + Math.random() * 0.05,
      isPaper,
    });
  }
  return data;
}

/**
 * Render "DILAB" to an offscreen canvas, sample its opaque pixels, and map
 * `count` of them into world-space target points. Runs once (and on resize).
 */
function sampleWordTargets(
  count: number,
  fontFamily: string,
  opts: { width: number; centerX: number; centerY: number },
): Float32Array {
  const fontPx = 360;
  const probe = document.createElement("canvas").getContext("2d")!;
  probe.font = `800 ${fontPx}px ${fontFamily}`;
  const textW = probe.measureText("DILAB").width;

  const padX = fontPx * 0.12;
  const canvas = document.createElement("canvas");
  canvas.width = Math.ceil(textW + padX * 2);
  canvas.height = Math.ceil(fontPx * 1.4);
  const ctx = canvas.getContext("2d")!;
  ctx.font = `800 ${fontPx}px ${fontFamily}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#fff";
  ctx.fillText("DILAB", canvas.width / 2, canvas.height / 2);

  const { data: pix } = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const cands: [number, number][] = [];
  const step = 2;
  for (let y = 0; y < canvas.height; y += step) {
    for (let x = 0; x < canvas.width; x += step) {
      if (pix[(y * canvas.width + x) * 4 + 3] > 128) cands.push([x, y]);
    }
  }
  // Fisher–Yates shuffle so particles are drawn from across the whole word
  for (let i = cands.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [cands[i], cands[j]] = [cands[j], cands[i]];
  }

  const scale = opts.width / canvas.width; // preserve aspect ratio
  const out = new Float32Array(count * 3);
  const n = Math.max(1, cands.length);
  for (let i = 0; i < count; i++) {
    const [cx, cy] = cands[i % n];
    const jx = (Math.random() - 0.5) * step * scale;
    const jy = (Math.random() - 0.5) * step * scale;
    out[i * 3] = (cx - canvas.width / 2) * scale + opts.centerX + jx;
    out[i * 3 + 1] = -(cy - canvas.height / 2) * scale + opts.centerY + jy;
    out[i * 3 + 2] = (Math.random() - 0.5) * 0.5;
  }
  return out;
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
  const formation = useRef<Float32Array | null>(null);
  const { camera, gl } = useThree();

  const paperCount = Math.max(1, Math.round(count * 0.13));
  const sphereCount = count - paperCount;

  const data = useMemo(
    () => buildData(count, paperCount),
    [count, paperCount],
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

  // build the "DILAB" formation targets once fonts are ready (+ on resize)
  useEffect(() => {
    let active = true;
    let debounce: ReturnType<typeof setTimeout>;

    const compute = async () => {
      try {
        await document.fonts.ready;
      } catch {
        /* fonts API unavailable — fall back to Georgia below */
      }
      if (!active) return;
      const fraunces = getComputedStyle(document.documentElement)
        .getPropertyValue("--font-fraunces")
        .trim();
      const family = `${fraunces || '"Fraunces"'}, Georgia, "Times New Roman", serif`;
      formation.current = sampleWordTargets(count, family, FORMATION[variant]);
    };

    compute();
    const onResize = () => {
      clearTimeout(debounce);
      debounce = setTimeout(compute, 250);
    };
    window.addEventListener("resize", onResize);
    return () => {
      active = false;
      clearTimeout(debounce);
      window.removeEventListener("resize", onResize);
    };
  }, [count, variant]);

  useFrame((state) => {
    const spheres = sphereRef.current;
    const papers = paperRef.current;
    if (!spheres || !papers) return;

    const t = state.clock.elapsedTime;
    const targets = formation.current;

    // progress from the canvas's own position — unifies hero + cta
    const rect = gl.domElement.getBoundingClientRect();
    const vh = window.innerHeight || 800;
    let progress: number;
    if (variant === "hero") {
      progress = Math.min(Math.max(-rect.top / (vh * 0.9), 0), 1);
    } else {
      progress = Math.min(Math.max((vh - rect.top) / (vh * 1.05), 0), 1);
    }

    // hero condenses into the word between 15%–50% of its scroll — fully formed
    // while it's still on-screen, below the exiting headline; cta forms
    // dramatically the moment it enters.
    let fp: number;
    if (variant === "hero") {
      fp = THREE.MathUtils.clamp((progress - 0.15) / 0.35, 0, 1);
    } else {
      fp = progress;
    }
    const formEase = fp * fp * (3 - 2 * fp); // smoothstep
    const settle = 1 - formEase * 0.85;

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

      // free drift -> DILAB formation
      const tx = targets ? targets[i * 3] : nx;
      const ty = targets ? targets[i * 3 + 1] : ny;
      const tz = targets ? targets[i * 3 + 2] : nz;

      // living letters: a small tremor that persists even when fully formed
      const j = formEase * 0.05;
      const x = nx + (tx - nx) * formEase + Math.sin(t * 0.9 + d.phase) * j;
      const y =
        ny + (ty - ny) * formEase + Math.cos(t * 0.8 + d.phase * 1.3) * j;
      const z = nz + (tz - nz) * formEase;

      // DoF cue from current depth
      const depth = THREE.MathUtils.clamp((z + 6) / 7.5, 0, 1);

      dummy.position.set(x, y, z);

      if (d.isPaper) {
        // scraps settle their tumble as they lock into letterforms
        const rot = 0.6 + (1 - formEase) * 0.6;
        dummy.rotation.set(
          (t * d.spin * 0.4 + d.phase) * rot,
          t * d.spin * 0.5 * rot,
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

    // hero stays legible; cta brightens as the wordmark resolves (the finale)
    const globalOpacity =
      variant === "hero" ? 0.9 - formEase * 0.1 : 0.18 + formEase * 0.52;
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
