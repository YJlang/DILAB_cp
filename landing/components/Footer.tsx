"use client";

import { useLang } from "@/lib/i18n";

export function Footer() {
  const { t } = useLang();
  return (
    <footer className="bg-ink text-paper/70">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 border-t border-line-dark px-6 py-10 text-sm sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <span className="font-display text-paper">{t.footer.org}</span>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-8">
          <a
            href="mailto:hello@deepinsightlab.example"
            className="link-underline w-fit text-paper/70 transition-colors hover:text-paper"
          >
            hello@deepinsightlab.example
          </a>
          <span className="font-mono-label text-xs tracking-[0.15em] text-paper/40">
            {t.footer.copyright}
          </span>
        </div>
      </div>
    </footer>
  );
}
