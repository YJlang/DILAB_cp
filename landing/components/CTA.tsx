"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { motion, useReducedMotion } from "framer-motion";
import { useLang } from "@/lib/i18n";

const ParticleField = dynamic(() => import("./ParticleField"), { ssr: false });

const EASE = [0.22, 1, 0.36, 1] as const;

export function CTA() {
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
      count = cores <= 4 ? 600 : 1080;
    } else {
      count = w < 1024 ? 680 : cores >= 8 ? 1080 : 860;
    }
    setCanvas({ show: true, count, mobile });
  }, [reduce]);

  return (
    <section
      id="contact"
      className="relative flex min-h-screen flex-col overflow-hidden bg-ink py-24 text-paper"
    >
      {/* static fallback (mobile / reduced motion): a faint condensed band */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, rgba(250,247,242,0.18) 1px, transparent 0)",
          backgroundSize: "30px 30px",
          maskImage:
            "radial-gradient(ellipse 80% 26% at 50% 52%, black 10%, transparent 70%)",
          WebkitMaskImage:
            "radial-gradient(ellipse 80% 26% at 50% 52%, black 10%, transparent 70%)",
        }}
      />

      {/* the same 3D language as the hero — particles condense into a signal band */}
      {canvas.show && (
        <div className="pointer-events-none absolute inset-0">
          <ParticleField
            count={canvas.count}
            variant="cta"
            isMobile={canvas.mobile}
            dpr={canvas.mobile ? [1, 2] : [1, 1.8]}
            paperRatio={0.07}
          />
        </div>
      )}

      <div className="relative z-10 mx-auto max-w-4xl px-6 pt-[10vh] text-center sm:px-8">
        <motion.h2
          initial={reduce ? { opacity: 0 } : { opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.9, ease: EASE }}
          className="font-display mx-auto max-w-3xl text-balance"
          style={{
            fontSize: "clamp(2.1rem, 5vw, 4rem)",
            lineHeight: 1.06,
            letterSpacing: "-0.02em",
          }}
        >
          {t.cta.headline.pre}
          <span className="italic text-amber">{t.cta.headline.accent}</span>
          {t.cta.headline.post}
        </motion.h2>

        <motion.div
          initial={reduce ? { opacity: 0 } : { opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.9, delay: 0.2, ease: EASE }}
          className="mt-12"
        >
          <a
            href="mailto:hello@deepinsightlab.example"
            className="group inline-flex items-center gap-3 border border-paper/25 bg-paper px-8 py-4 text-sm font-medium text-ink transition-all duration-300 hover:gap-4 hover:bg-amber hover:text-paper"
          >
            {t.cta.button}
            <span className="transition-transform duration-300 group-hover:translate-x-1">
              &rarr;
            </span>
          </a>
        </motion.div>
      </div>
    </section>
  );
}
