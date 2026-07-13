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
const DARK = new THREE.Color("#221f1b");

// Where the "DILAB" wordmark forms, per variant (world units).
// hero forms it in the clear right-hand margin so it never fights the
// left-aligned headline; cta forms it large and low, on the dark stage.
const FORMATION = {
  hero: { width: 5.0, centerX: 3.0, centerY: -0.2, safeX: -3, safeY: 1.5 },
  cta: { width: 8.0, centerX: 0, centerY: -1.7, safeX: 0, safeY: 4 },
} as const;

// Auto-formation timing (seconds) — Antigravity-style self-assembly.
const HERO_START = 3.0;
const HERO_DURATION = 3.6;

// particle size when locked into a glyph — small + uniform so serifs read
const FORM_SCALE = 0.02;
const PAPER_RATIO = 0.07;

const smoothstep = (x: number) => x * x * (3 - 2 * x);

type Datum = {
  bx: number;
  by: number;
  bz: number;
  phase: number;
  spin: number;
  radius: number;
  delay: number; // per-particle stagger 0..1
  isPaper: boolean;
};

function buildData(count: number, paperCount: number) {
  const spreadX = 8;
  const spreadY = 4.6;
  const data: Datum[] = [];

  let madePaper = 0;
  const paperEvery = count / paperCount;

  for (let i = 0; i < count; i++) {
    const isPaper =
      madePaper < paperCount && i >= Math.round(madePaper * paperEvery);
    if (isPaper) madePaper++;

    data.push({
      bx: (Math.random() - 0.5) * 2 * spreadX,
      by: (Math.random() - 0.5) * 2 * spreadY,
      bz: -6 + Math.random() * 7.5, // -6 (far) .. 1.5 (near)
      phase: Math.random() * Math.PI * 2,
      spin: (Math.random() - 0.5) * 1.4,
      radius: 0.014 + Math.random() * 0.02, // ~45% of the old size
      delay: Math.random(),
      isPaper,
    });
  }
  return data;
}

/**
 * Render "DILAB", sample its opaque pixels densely, and map `count` of them
 * into a flat (near-plane) world-space wordmark. Runs once (and on resize).
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

  const padX = fontPx * 0.1;
  const canvas = document.createElement("canvas");
  canvas.width = Math.ceil(textW + padX * 2);
  canvas.height = Math.ceil(fontPx * 1.35);
  const ctx = canvas.getContext("2d")!;
  ctx.font = `800 ${fontPx}px ${fontFamily}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#fff";
  ctx.fillText("DILAB", canvas.width / 2, canvas.height / 2);

  const { data: pix } = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const cands: number[] = []; // packed x,y pairs
  const step = 1; // dense sampling → crisp serifs
  for (let y = 0; y < canvas.height; y += step) {
    for (let x = 0; x < canvas.width; x += step) {
      if (pix[(y * canvas.width + x) * 4 + 3] > 128) {
        cands.push(x, y);
      }
    }
  }
  const nPix = cands.length / 2;

  const scale = opts.width / canvas.width; // preserve aspect ratio
  const out = new Float32Array(count * 3);
  const n = Math.max(1, nPix);
  // partial Fisher–Yates: only shuffle the first `count` picks (O(count))
  for (let i = 0; i < count; i++) {
    const pick = i % n;
    const j = pick + Math.floor(Math.random() * (n - pick));
    const ax = cands[pick * 2];
    const ay = cands[pick * 2 + 1];
    cands[pick * 2] = cands[j * 2];
    cands[pick * 2 + 1] = cands[j * 2 + 1];
    cands[j * 2] = ax;
    cands[j * 2 + 1] = ay;

    const cx = cands[pick * 2];
    const cy = cands[pick * 2 + 1];
    const jx = (Math.random() - 0.5) * step * scale * 0.6;
    const jy = (Math.random() - 0.5) * step * scale * 0.6;
    out[i * 3] = (cx - canvas.width / 2) * scale + opts.centerX + jx;
    out[i * 3 + 1] = -(cy - canvas.height / 2) * scale + opts.centerY + jy;
    out[i * 3 + 2] = (Math.random() - 0.5) * 0.16; // flat near-plane
  }
  return out;
}

/** cheap coupled-sine field — organic, curl-like flow without a noise lib */
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

  const paperCount = Math.max(1, Math.round(count * PAPER_RATIO));
  const sphereCount = count - paperCount;
  const conf = FORMATION[variant];

  const data = useMemo(() => buildData(count, paperCount), [count, paperCount]);

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
        /* fall back to Georgia below */
      }
      if (!active) return;
      const fraunces = getComputedStyle(document.documentElement)
        .getPropertyValue("--font-fraunces")
        .trim();
      const family = `${fraunces || '"Fraunces"'}, Georgia, "Times New Roman", serif`;
      formation.current = sampleWordTargets(count, family, conf);
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
  }, [count, conf]);

  useFrame((state) => {
    const spheres = sphereRef.current;
    const papers = paperRef.current;
    if (!spheres || !papers) return;

    const t = state.clock.elapsedTime;
    const targets = formation.current;

    const rect = gl.domElement.getBoundingClientRect();
    const vh = window.innerHeight || 800;
    let global: number;
    if (variant === "hero") {
      // auto-assemble on a timer; a little scroll snaps it to fully-formed
      const timeProg = THREE.MathUtils.clamp(
        (t - HERO_START) / HERO_DURATION,
        0,
        1,
      );
      const scrollSnap = THREE.MathUtils.clamp(-rect.top / (vh * 0.35), 0, 1);
      global = Math.max(timeProg, scrollSnap);
    } else {
      // cta forms as it scrolls into view
      global = THREE.MathUtils.clamp((vh - rect.top) / (vh * 1.05), 0, 1);
    }

    // smooth camera parallax → sense of depth
    mouse.current.x += (mouse.current.tx - mouse.current.x) * 0.045;
    mouse.current.y += (mouse.current.ty - mouse.current.y) * 0.045;
    camera.position.x = mouse.current.x * 0.9;
    camera.position.y = mouse.current.y * 0.6;
    camera.lookAt(0, 0, 0);

    const STAGGER = 0.5;
    let si = 0;
    let pi = 0;
    let feSum = 0;

    for (let i = 0; i < count; i++) {
      const d = data[i];

      // per-particle staggered ease → organic, seeping assembly
      const localRaw = (global - d.delay * STAGGER) / (1 - STAGGER);
      const local = localRaw < 0 ? 0 : localRaw > 1 ? 1 : localRaw;
      const fe = smoothstep(local);
      feSum += fe;

      const settle = 1 - fe * 0.9;
      const f = flow(d.bx, d.by, d.bz, t, d.phase);
      const nx = d.bx + f.fx * settle;
      const ny = d.by + f.fy * settle;
      const nz = d.bz + f.fz * settle;

      const tx = targets ? targets[i * 3] : nx;
      const ty = targets ? targets[i * 3 + 1] : ny;
      const tz = targets ? targets[i * 3 + 2] : nz;

      // living tremor that persists even when fully formed
      const j = fe * 0.03;
      const x = nx + (tx - nx) * fe + Math.sin(t * 1.1 + d.phase) * j;
      const y = ny + (ty - ny) * fe + Math.cos(t * 0.9 + d.phase * 1.3) * j;
      const z = nz + (tz - nz) * fe;

      const depth = THREE.MathUtils.clamp((z + 6) / 7.5, 0, 1);

      // text safe-zone: dim free particles that drift over the copy
      const dist = Math.hypot(x - conf.safeX, y - conf.safeY) / 4.5;
      const safe = (1 - fe) * (1 - (dist < 0 ? 0 : dist > 1 ? 1 : dist));

      dummy.position.set(x, y, z);

      if (d.isPaper) {
        const rot = 0.5 + (1 - fe) * 0.6;
        dummy.rotation.set(
          (t * d.spin * 0.4 + d.phase) * rot,
          t * d.spin * 0.5 * rot,
          d.phase,
        );
        const free = d.radius * 2.0;
        const s = free + (FORM_SCALE * 1.6 - free) * fe;
        dummy.scale.set(s, s * 1.3, s);
        dummy.updateMatrix();
        papers.setMatrixAt(pi, dummy.matrix);

        if (variant === "hero") {
          tmpColor.copy(WARM).lerp(PAPER, 0.5 + safe * 0.4);
          tmpColor.lerp(INK, fe * 0.75);
        } else {
          tmpColor.copy(i % 6 === 0 ? AMBER : PAPER).lerp(DARK, (1 - fe) * 0.85);
        }
        papers.setColorAt(pi, tmpColor);
        pi++;
      } else {
        dummy.rotation.set(0, 0, 0);
        const free = d.radius * (0.65 + depth * 0.9);
        const s = free + (FORM_SCALE - free) * fe; // shrink to uniform glyph dots
        dummy.scale.setScalar(s);
        dummy.updateMatrix();
        spheres.setMatrixAt(si, dummy.matrix);

        if (variant === "hero") {
          // free: faint warm grey (extra-light over the copy); formed: crisp ink
          tmpColor.copy(WARM).lerp(PAPER, 0.42 + safe * 0.45);
          tmpColor.lerp(INK, fe);
        } else {
          // free: sunk into the dark bg; formed: bright paper/amber
          tmpColor.copy(i % 6 === 0 ? AMBER : PAPER).lerp(DARK, (1 - fe) * 0.9);
        }
        spheres.setColorAt(si, tmpColor);
        si++;
      }
    }

    spheres.instanceMatrix.needsUpdate = true;
    papers.instanceMatrix.needsUpdate = true;
    if (spheres.instanceColor) spheres.instanceColor.needsUpdate = true;
    if (papers.instanceColor) papers.instanceColor.needsUpdate = true;

    const avgFe = feSum / count;
    // background recedes; the wordmark surfaces
    const globalOpacity =
      variant === "hero" ? 0.42 + avgFe * 0.5 : 0.16 + avgFe * 0.62;
    (spheres.material as THREE.MeshBasicMaterial).opacity = globalOpacity;
    (papers.material as THREE.MeshBasicMaterial).opacity = globalOpacity * 0.75;
  });

  return (
    <>
      <instancedMesh
        ref={sphereRef}
        args={[undefined, undefined, sphereCount]}
        frustumCulled={false}
      >
        <sphereGeometry args={[1, 8, 8]} />
        <meshBasicMaterial transparent opacity={0.7} toneMapped={false} />
      </instancedMesh>
      <instancedMesh
        ref={paperRef}
        args={[undefined, undefined, paperCount]}
        frustumCulled={false}
      >
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial
          transparent
          opacity={0.6}
          side={THREE.DoubleSide}
          depthWrite={false}
          toneMapped={false}
        />
      </instancedMesh>
    </>
  );
}

export default function ParticleField({
  count = 800,
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
