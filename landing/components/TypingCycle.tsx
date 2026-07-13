"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { useLang } from "@/lib/i18n";

/**
 * Types a phrase, holds, deletes, then advances — cycling through the
 * conflicting reviews to dramatize the "noise" the brand resolves.
 * Restarts when the language changes; static fallback for reduced motion.
 */
export function TypingCycle() {
  const reduce = useReducedMotion();
  const { t, lang } = useLang();
  const phrases = t.hero.typing;
  const [text, setText] = useState("");
  const [index, setIndex] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (reduce) return;
    setText("");
    setIndex(0);

    let cancelled = false;
    let phrase = 0;
    let char = 0;
    let deleting = false;

    const tick = () => {
      if (cancelled) return;
      const current = phrases[phrase];

      if (!deleting) {
        char++;
        setText(current.slice(0, char));
        if (char === current.length) {
          deleting = true;
          timer.current = setTimeout(tick, 1500); // hold at full phrase
          return;
        }
        timer.current = setTimeout(tick, 45 + Math.random() * 45);
      } else {
        char--;
        setText(current.slice(0, char));
        if (char === 0) {
          deleting = false;
          phrase = (phrase + 1) % phrases.length;
          setIndex(phrase);
          timer.current = setTimeout(tick, 350); // pause before next
          return;
        }
        timer.current = setTimeout(tick, 24);
      }
    };

    timer.current = setTimeout(tick, 500);
    return () => {
      cancelled = true;
      if (timer.current) clearTimeout(timer.current);
    };
  }, [reduce, lang, phrases]);

  if (reduce) {
    return (
      <span className="font-display italic text-ink/70">
        &ldquo;{phrases[0]}&rdquo;
      </span>
    );
  }

  return (
    <span
      className="font-display italic text-ink/70"
      aria-live="off"
      key={`${lang}-${index}`}
    >
      &ldquo;{text}
      <span className="inline-block w-[0.06em] translate-y-[0.08em] animate-pulse bg-amber align-middle">
        &nbsp;
      </span>
      &rdquo;
    </span>
  );
}
