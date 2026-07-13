"use client";

import { useMemo } from "react";
import { motion, useReducedMotion } from "framer-motion";

/* Deterministic PRNG so scattered dots match between server and client. */
function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const DOT_COUNT = 40;

function ConvergeField() {
  const reduce = useReducedMotion();
  const dots = useMemo(() => {
    const rand = mulberry32(20260713);
    return Array.from({ length: DOT_COUNT }, (_, i) => {
      // scattered start
      const sx = rand() * 100;
      const sy = rand() * 100;
      // converged target: tight band across the middle (noise -> a line of signal)
      const tx = 50 + (rand() - 0.5) * 46;
      const ty = 50 + (rand() - 0.5) * 8;
      const amber = i % 6 === 0;
      const size = 2 + rand() * 3;
      return { sx, sy, tx, ty, amber, size, i };
    });
  }, []);

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {dots.map((d) => (
        <motion.span
          key={d.i}
          className="absolute rounded-full"
          style={{
            width: d.size,
            height: d.size,
            background: d.amber ? "var(--amber)" : "rgba(250,247,242,0.55)",
            left: `${d.sx}%`,
            top: `${d.sy}%`,
          }}
          initial={
            reduce
              ? { opacity: 0.5, left: `${d.tx}%`, top: `${d.ty}%` }
              : { opacity: 0, left: `${d.sx}%`, top: `${d.sy}%` }
          }
          whileInView={{
            opacity: d.amber ? 0.9 : 0.5,
            left: `${d.tx}%`,
            top: `${d.ty}%`,
          }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{
            duration: reduce ? 0 : 1.6,
            delay: reduce ? 0 : (d.i % 10) * 0.06,
            ease: [0.22, 1, 0.36, 1],
          }}
        />
      ))}
    </div>
  );
}

export function CTA() {
  const reduce = useReducedMotion();
  return (
    <section
      id="contact"
      className="relative overflow-hidden bg-ink py-32 text-paper sm:py-40"
    >
      <ConvergeField />

      <div className="relative z-10 mx-auto max-w-4xl px-6 text-center sm:px-8">
        <motion.h2
          initial={reduce ? { opacity: 0 } : { opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          className="font-display mx-auto max-w-3xl text-balance"
          style={{
            fontSize: "clamp(2.1rem, 5vw, 4rem)",
            lineHeight: 1.02,
            letterSpacing: "-0.02em",
          }}
        >
          Curious what ten thousand voices say about{" "}
          <span className="italic text-amber">your</span> product?
        </motion.h2>

        <motion.div
          initial={reduce ? { opacity: 0 } : { opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.9, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
          className="mt-12"
        >
          <a
            href="mailto:hello@deepinsightlab.example"
            className="group inline-flex items-center gap-3 border border-paper/25 bg-paper px-8 py-4 text-sm font-medium text-ink transition-all duration-300 hover:gap-4 hover:bg-amber hover:text-paper"
          >
            Start a conversation
            <span className="transition-transform duration-300 group-hover:translate-x-1">
              &rarr;
            </span>
          </a>
        </motion.div>
      </div>
    </section>
  );
}
