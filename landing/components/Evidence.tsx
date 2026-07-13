"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Reveal } from "./Reveal";

const AXES = [
  { name: "Absorption", score: 4.8 },
  { name: "Gentleness", score: 4.7 },
  { name: "Texture", score: 4.6 },
  { name: "Value", score: 4.5 },
  { name: "Scent", score: 4.2 },
];

const EVIDENCE = [
  {
    quote: "Absorbs fast, zero stickiness — even in summer.",
    source: "verified purchaser",
  },
  {
    quote: "Fragrance-free and gentle on reactive skin.",
    source: "dermatology blogger",
  },
  {
    quote: "Half the price of my old cream, same glow.",
    source: "repeat buyer",
  },
];

function Stars({ score }: { score: number }) {
  return (
    <span className="inline-flex gap-1" aria-hidden>
      {[0, 1, 2, 3, 4].map((i) => {
        const fill = Math.max(0, Math.min(1, score - i));
        return (
          <span key={i} className="relative inline-block h-4 w-4">
            <Star className="absolute inset-0 text-line" />
            <span
              className="absolute inset-0 overflow-hidden"
              style={{ width: `${fill * 100}%` }}
            >
              <Star className="h-4 w-4 text-amber" />
            </span>
          </span>
        );
      })}
    </span>
  );
}

function Star({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M12 2.5l2.9 6.1 6.6.9-4.8 4.6 1.2 6.6L12 18.6 6.1 21.3l1.2-6.6L2.5 9.5l6.6-.9L12 2.5z" />
    </svg>
  );
}

export function Evidence() {
  const [open, setOpen] = useState(false);
  const reduce = useReducedMotion();

  return (
    <section
      id="evidence"
      className="relative border-t border-line bg-soft py-24 sm:py-32"
    >
      <div className="mx-auto grid max-w-6xl gap-16 px-6 sm:px-8 md:grid-cols-12 md:items-center">
        {/* Left — narrative */}
        <div className="md:col-span-5">
          <Reveal>
            <p className="eyebrow mb-8">03 — Evidence-first</p>
          </Reveal>
          <Reveal delay={0.08}>
            <h2
              className="headline"
              style={{ fontSize: "clamp(2rem, 4.4vw, 3.4rem)" }}
            >
              Don&rsquo;t take our word for it.
              <br />
              Take theirs.
            </h2>
          </Reveal>
          <Reveal delay={0.16}>
            <p className="mt-8 max-w-md text-lg leading-relaxed text-body">
              Our platform, DILAB, scores products on five axes — and every
              score unfolds into the real sentences behind it.
            </p>
          </Reveal>
          <Reveal delay={0.24}>
            <p className="mt-6 font-mono-label text-xs uppercase tracking-[0.2em] text-amber">
              <span className="hidden sm:inline">Hover the card</span>
              <span className="sm:hidden">Tap the card</span>
              <span className="text-body/50">
                {" "}
                to reveal the proof
              </span>
            </p>
          </Reveal>
        </div>

        {/* Right — interactive score card */}
        <div className="md:col-span-6 md:col-start-7">
          <Reveal delay={0.1}>
            <motion.div
              role="button"
              tabIndex={0}
              aria-expanded={open}
              aria-label="Reveal the evidence behind the score"
              onHoverStart={() => setOpen(true)}
              onHoverEnd={() => setOpen(false)}
              onClick={() => setOpen((v) => !v)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setOpen((v) => !v);
                }
              }}
              className="relative z-20 cursor-pointer select-none border border-line bg-paper p-8 shadow-[0_1px_0_rgba(28,26,23,0.04)] transition-shadow duration-500 hover:shadow-[0_24px_60px_-30px_rgba(28,26,23,0.35)] sm:p-10"
            >
              <div className="flex items-start justify-between gap-6">
                <div>
                  <p className="font-mono-label text-[0.65rem] uppercase tracking-[0.22em] text-body/50">
                    Product score
                  </p>
                  <h3 className="mt-3 font-display text-xl text-ink">
                    Barrier Repair Moisturizer
                  </h3>
                </div>
                <div className="text-right">
                  <div
                    className="font-display leading-none text-ink"
                    style={{ fontSize: "clamp(2.6rem, 5vw, 3.6rem)" }}
                  >
                    4.6
                  </div>
                  <div className="mt-2 flex justify-end">
                    <Stars score={4.6} />
                  </div>
                </div>
              </div>

              <div className="mt-8 space-y-3">
                {AXES.map((a, i) => (
                  <div key={a.name} className="flex items-center gap-4">
                    <span className="w-24 shrink-0 font-mono-label text-[0.7rem] uppercase tracking-[0.12em] text-body">
                      {a.name}
                    </span>
                    <span className="relative h-[3px] flex-1 bg-line">
                      <motion.span
                        className="absolute inset-y-0 left-0 bg-amber"
                        initial={{ width: 0 }}
                        whileInView={{ width: `${(a.score / 5) * 100}%` }}
                        viewport={{ once: true, amount: 0.8 }}
                        transition={{
                          duration: reduce ? 0 : 0.9,
                          delay: reduce ? 0 : 0.2 + i * 0.08,
                          ease: [0.22, 1, 0.36, 1],
                        }}
                      />
                    </span>
                    <span className="w-8 shrink-0 text-right font-mono-label text-xs tabular-nums text-ink">
                      {a.score.toFixed(1)}
                    </span>
                  </div>
                ))}
              </div>

              <div className="mt-8 flex items-center gap-2 border-t border-line pt-5 text-xs text-body/60">
                <span
                  className={`h-1.5 w-1.5 rounded-full transition-colors duration-300 ${
                    open ? "bg-amber" : "bg-body/30"
                  }`}
                />
                <span className="font-mono-label uppercase tracking-[0.15em]">
                  {open ? "Evidence — 3 of 2,411 quotes" : "Backed by 2,411 quotes"}
                </span>
              </div>
            </motion.div>

            {/* Evidence cards — unfold from behind the score card */}
            <div
              className="grid transition-[grid-template-rows] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]"
              style={{ gridTemplateRows: open ? "1fr" : "0fr" }}
            >
              <div className="overflow-hidden">
                <div className="space-y-3 pt-3">
                  {EVIDENCE.map((e, i) => (
                    <div
                      key={e.quote}
                      className="border border-line bg-paper/70 p-5 backdrop-blur-sm transition-all duration-500"
                      style={{
                        transitionDelay: open ? `${120 + i * 90}ms` : "0ms",
                        transform: open
                          ? "translateY(0) rotate(0deg)"
                          : "translateY(-16px) rotate(-0.6deg)",
                        opacity: open ? 1 : 0,
                        marginLeft: `${i * 14}px`,
                      }}
                    >
                      <p className="font-display text-[1.05rem] italic leading-snug text-ink">
                        &ldquo;{e.quote}&rdquo;
                      </p>
                      <p className="mt-2 font-mono-label text-[0.65rem] uppercase tracking-[0.18em] text-amber">
                        {e.source}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
