"use client";

import { motion } from "framer-motion";
import { Reveal, Stagger, staggerItem } from "./Reveal";

/* Hand-drawn line marks — no icon library, brand-specific glyphs. */
function GatherMark() {
  return (
    <svg viewBox="0 0 48 48" fill="none" className="h-9 w-9">
      <path
        d="M4 8h14M4 16h9M4 24h13M4 32h8M4 40h12"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M20 24h24M44 24l-6-5M44 24l-6 5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
function DistillMark() {
  return (
    <svg viewBox="0 0 48 48" fill="none" className="h-9 w-9">
      <path
        d="M6 8h36L28 26v12l-8 4V26L6 8Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}
function VerifyMark() {
  return (
    <svg viewBox="0 0 48 48" fill="none" className="h-9 w-9">
      <path
        d="M10 6h20l8 8v28H10V6Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M16 24l5 5 11-11"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const CARDS = [
  {
    n: "i",
    title: "Gather",
    mark: <GatherMark />,
    body: "Every voice, from quick reviews to expert deep-dives, collected in one place.",
  },
  {
    n: "ii",
    title: "Distill",
    mark: <DistillMark />,
    body: "Patterns emerge: what people love, what they doubt, and why.",
  },
  {
    n: "iii",
    title: "Verify",
    mark: <VerifyMark />,
    body: "Every conclusion stays traceable to the exact words that support it.",
  },
];

export function WhatWeDo() {
  return (
    <section
      id="approach"
      className="relative border-t border-line bg-paper py-24 sm:py-32"
    >
      <div className="mx-auto max-w-6xl px-6 sm:px-8">
        <Reveal>
          <p className="eyebrow mb-8">02 — What we do</p>
        </Reveal>
        <Reveal delay={0.08}>
          <h2
            className="headline max-w-2xl"
            style={{ fontSize: "clamp(2rem, 4.6vw, 3.6rem)" }}
          >
            We listen at scale.
            <br />
            Then we prove it.
          </h2>
        </Reveal>

        <Stagger className="mt-16 grid gap-px overflow-hidden border border-line bg-line sm:grid-cols-3">
          {CARDS.map((c) => (
            <motion.article
              key={c.title}
              variants={staggerItem}
              className="group relative bg-paper p-8 transition-colors duration-500 hover:bg-soft sm:p-10"
            >
              <span
                aria-hidden
                className="absolute left-0 top-0 h-px w-0 bg-amber transition-all duration-500 group-hover:w-full"
              />
              <div className="flex items-center justify-between">
                <span className="text-amber transition-transform duration-500 group-hover:-translate-y-0.5">
                  {c.mark}
                </span>
                <span className="font-mono-label text-xs uppercase tracking-[0.2em] text-body/50">
                  {c.n}
                </span>
              </div>
              <h3
                className="mt-10 font-display text-2xl text-ink"
                style={{ letterSpacing: "-0.01em" }}
              >
                {c.title}
              </h3>
              <p className="mt-4 text-[0.95rem] leading-relaxed text-body">
                {c.body}
              </p>
            </motion.article>
          ))}
        </Stagger>
      </div>
    </section>
  );
}
