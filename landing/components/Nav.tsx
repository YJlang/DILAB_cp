"use client";

import { useEffect, useState } from "react";
import { useLang } from "@/lib/i18n";
import { LangSwitch } from "./LangSwitch";

export function Nav() {
  const { t } = useLang();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-500 ${
        scrolled
          ? "border-b border-line bg-paper/80 backdrop-blur-md"
          : "border-b border-transparent bg-transparent"
      }`}
    >
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4 sm:px-8">
        <a
          href="#top"
          className="font-display text-lg tracking-tight text-ink"
          aria-label="Deep Insight Lab — home"
        >
          deep insight lab
        </a>
        <div className="flex items-center gap-5 sm:gap-7">
          <a
            href="#contact"
            className="group hidden items-center gap-2 text-sm font-medium text-ink sm:inline-flex"
          >
            <span className="link-underline">{t.nav.cta}</span>
            <span
              aria-hidden
              className="h-1.5 w-1.5 rounded-full bg-amber transition-transform duration-300 group-hover:scale-125"
            />
          </a>
          <LangSwitch />
        </div>
      </nav>
    </header>
  );
}
