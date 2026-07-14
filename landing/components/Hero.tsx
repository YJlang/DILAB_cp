"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { motion, useReducedMotion } from "framer-motion";
import { useLang } from "@/lib/i18n";
import { TypingCycle } from "./TypingCycle";

const ParticleField = dynamic(() => import("./ParticleField"), { ssr: false });

const EASE = [0.22, 1, 0.36, 1] as const;

export function Hero() {
  const reduce = useReducedMotion();
  const { t } = useLang();
  const [canvas, setCanvas] = useState<{
    show: boolean;
    count: number;
    mobile: boolean;
  }>({ show: false, count: 0, mobile: false });

  useEffect(() => {
    if (reduce) return; // reduced-motion keeps the static fallback (a11y)
    const w = window.innerWidth;
    const cores = navigator.hardwareConcurrency || 4;
    const mobile = w < 640;
    let count: number;
    if (mobile) {
      // same budget as desktop; only weak/old devices (<=4 cores) get trimmed
      count = cores <= 4 ? 600 : 1200;
    } else {
      count = w < 1024 ? 760 : cores >= 8 ? 1200 : 960;
    }
    setCanvas({ show: true, count, mobile });
  }, [reduce]);

  return (
    <section
      id="top"
      className="relative flex min-h-[100svh] flex-col justify-center overflow-hidden bg-paper"
    >
      {/* Static fallback texture (also the mobile / reduced-motion visual) */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.5]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, rgba(28,26,23,0.14) 1px, transparent 0)",
          backgroundSize: "26px 26px",
          maskImage:
            "radial-gradient(ellipse 70% 60% at 50% 45%, black 30%, transparent 80%)",
          WebkitMaskImage:
            "radial-gradient(ellipse 70% 60% at 50% 45%, black 30%, transparent 80%)",
        }}
      />

      {/* Live particle field — noise that begins to align as you scroll */}
      {canvas.show && (
        <div className="pointer-events-none absolute inset-0">
          <ParticleField
            count={canvas.count}
            isMobile={canvas.mobile}
            dpr={canvas.mobile ? [1, 2] : [1, 1.8]}
            paperRatio={0.07}
          />
        </div>
      )}

      {/* soft paper vignette to keep text crisp over the field */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 60% 50% at 22% 52%, rgba(250,247,242,0.92), rgba(250,247,242,0) 70%)",
        }}
      />

      <div className="relative z-10 mx-auto w-full max-w-6xl px-6 sm:px-8">
        <div className="max-w-3xl">
          <motion.p
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: EASE }}
            className="mb-6 text-lg sm:text-xl"
          >
            <TypingCycle />
          </motion.p>

          <motion.h1
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.12, ease: EASE }}
            className="headline"
            style={{ fontSize: "clamp(2.9rem, 8.4vw, 6.6rem)" }}
          >
            {t.hero.headline.line1}
            <br />
            {t.hero.headline.pre}
            <span className="italic text-amber">{t.hero.headline.accent}</span>
            {t.hero.headline.post}
          </motion.h1>

          <motion.p
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.28, ease: EASE }}
            className="mt-8 max-w-xl text-base leading-relaxed text-body sm:text-lg"
          >
            {t.hero.sub}
          </motion.p>

          <motion.div
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.42, ease: EASE }}
            className="mt-10"
          >
            <a
              href="#problem"
              className="group inline-flex items-center gap-2 border-b border-ink/30 pb-1 text-sm font-medium tracking-wide text-ink transition-colors hover:border-amber hover:text-amber"
            >
              {t.hero.cta}
              <span className="transition-transform duration-300 group-hover:translate-x-1">
                &rarr;
              </span>
            </a>
          </motion.div>
        </div>
      </div>

      {/* scroll cue */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.1, duration: 1 }}
        className="absolute bottom-8 left-1/2 z-10 -translate-x-1/2"
        aria-hidden
      >
        <div className="flex flex-col items-center gap-2">
          <span className="font-mono-label text-[0.6rem] uppercase tracking-[0.3em] text-body/60">
            {t.hero.scroll}
          </span>
          <span className="h-10 w-px bg-gradient-to-b from-ink/40 to-transparent" />
        </div>
      </motion.div>
    </section>
  );
}
