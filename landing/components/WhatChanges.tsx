"use client";

import { motion } from "framer-motion";
import { useLang } from "@/lib/i18n";
import { Reveal, Stagger, staggerItem } from "./Reveal";

export function WhatChanges() {
  const { t } = useLang();
  return (
    <section
      id="changes"
      className="relative border-t border-line bg-paper py-24 sm:py-32"
    >
      <div className="mx-auto max-w-6xl px-6 sm:px-8">
        <div className="grid gap-8 md:grid-cols-12 md:items-end">
          <Reveal className="md:col-span-7">
            <p className="eyebrow mb-8">{t.changes.eyebrow}</p>
            <h2
              className="headline"
              style={{ fontSize: "clamp(2.1rem, 5vw, 4rem)" }}
            >
              {t.changes.headline.a}
              <br />
              <span className="italic text-amber">{t.changes.headline.b}</span>
            </h2>
          </Reveal>
        </div>

        <Stagger
          className="mt-16 grid gap-px overflow-hidden border border-line bg-line sm:grid-cols-2"
          gap={0.1}
        >
          {t.changes.cards.map((c, i) => (
            <motion.article
              key={c.k}
              variants={staggerItem}
              className="group relative flex flex-col gap-4 bg-soft p-8 transition-colors duration-500 hover:bg-paper sm:p-10"
            >
              <div className="flex items-baseline justify-between gap-4">
                <h3
                  className="font-display text-ink"
                  style={{
                    fontSize: "clamp(1.5rem, 2.6vw, 2.1rem)",
                    letterSpacing: "-0.015em",
                    lineHeight: 1.1,
                  }}
                >
                  {c.k}
                </h3>
                <span className="font-mono-label text-xs text-body/40">
                  {`0${i + 1}`}
                </span>
              </div>
              <span
                aria-hidden
                className="h-px w-8 bg-amber transition-all duration-500 group-hover:w-16"
              />
              <p className="text-[0.95rem] leading-relaxed text-body">{c.d}</p>
            </motion.article>
          ))}
        </Stagger>

        <Reveal delay={0.1}>
          <p className="mt-10 font-mono-label text-[0.7rem] uppercase tracking-[0.18em] text-body/50">
            {t.changes.footer}
          </p>
        </Reveal>
      </div>
    </section>
  );
}
