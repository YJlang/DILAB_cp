"use client";

import { Counter } from "./Counter";
import { Reveal } from "./Reveal";

const STATS = [
  { value: 12458, label: "review fragments" },
  { value: 47, label: "contradictions per product" },
  { value: 0, label: "clear answers" },
];

export function Problem() {
  return (
    <section
      id="problem"
      className="relative border-t border-line bg-soft py-24 sm:py-32"
    >
      <div className="mx-auto max-w-6xl px-6 sm:px-8">
        <Reveal>
          <p className="eyebrow mb-14">01 — The problem</p>
        </Reveal>

        <div className="grid gap-y-12 border-y border-line py-14 sm:grid-cols-3 sm:gap-x-8">
          {STATS.map((s, i) => (
            <Reveal
              key={s.label}
              delay={i * 0.12}
              className="flex flex-col gap-3 sm:border-l sm:border-line sm:pl-8 sm:first:border-l-0 sm:first:pl-0"
            >
              <span
                className="font-display tabular-nums text-ink"
                style={{ fontSize: "clamp(2.6rem, 6vw, 4.4rem)", lineHeight: 1 }}
              >
                <Counter value={s.value} />
              </span>
              <span className="font-mono-label text-xs uppercase tracking-[0.16em] text-body">
                {s.label}
              </span>
            </Reveal>
          ))}
        </div>

        <div className="mt-16 grid gap-8 md:grid-cols-12">
          <Reveal className="md:col-span-6">
            <h2
              className="headline"
              style={{ fontSize: "clamp(2rem, 4.4vw, 3.4rem)" }}
            >
              Everyone is talking.
              <br />
              No one is sure.
            </h2>
          </Reveal>
          <Reveal className="md:col-span-5 md:col-start-8" delay={0.15}>
            <p className="text-lg leading-relaxed text-body">
              Star ratings average away the truth. Sponsored posts blur it. Real
              signal drowns in noise — and decisions stall.
            </p>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
