"use client";

import { useLang } from "@/lib/i18n";
import { Reveal } from "./Reveal";

export function About() {
  const { t } = useLang();
  return (
    <section
      id="about"
      className="relative border-t border-line bg-paper py-24 sm:py-32"
    >
      <div className="mx-auto max-w-6xl px-6 sm:px-8">
        <div className="grid gap-12 md:grid-cols-12 md:items-end">
          <Reveal className="md:col-span-7">
            <p className="eyebrow mb-8">{t.about.eyebrow}</p>
            <h2
              className="headline"
              style={{ fontSize: "clamp(2.2rem, 5vw, 4rem)" }}
            >
              {t.about.headline.a}
              <br />
              <span className="italic">{t.about.headline.accent}</span>
            </h2>
          </Reveal>
          <Reveal className="md:col-span-5" delay={0.15}>
            <p className="text-lg leading-relaxed text-body">{t.about.body}</p>
          </Reveal>
        </div>

        <Reveal delay={0.1}>
          <div className="mt-20 border-t border-line pt-8">
            <p className="mb-8 font-mono-label text-[0.65rem] uppercase tracking-[0.24em] text-body/50">
              {t.about.partnersLabel}
            </p>
            <div className="flex flex-wrap items-center gap-x-10 gap-y-6">
              {t.about.partners.map((p) => (
                <span
                  key={p}
                  className="font-display text-lg lowercase tracking-tight text-ink/70 transition-colors duration-300 hover:text-ink"
                >
                  {p}
                </span>
              ))}
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
