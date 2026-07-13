"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";

const PHRASES = [
  "Best moisturizer I've ever used.",
  "Broke me out in two days.",
  "Life-changing.",
  "Total waste of money.",
];

/**
 * Types a phrase, holds, deletes, then advances — cycling through the
 * conflicting reviews to dramatize the "noise" the brand resolves.
 * Falls back to a single static quote when reduced motion is requested.
 */
export function TypingCycle() {
  const reduce = useReducedMotion();
  const [text, setText] = useState("");
  const [index, setIndex] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (reduce) return;

    let cancelled = false;
    let phrase = 0;
    let char = 0;
    let deleting = false;

    const tick = () => {
      if (cancelled) return;
      const current = PHRASES[phrase];

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
          phrase = (phrase + 1) % PHRASES.length;
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
  }, [reduce]);

  if (reduce) {
    return (
      <span className="font-display italic text-ink/70">
        &ldquo;{PHRASES[0]}&rdquo;
      </span>
    );
  }

  return (
    <span
      className="font-display italic text-ink/70"
      aria-live="off"
      key={index}
    >
      &ldquo;{text}
      <span className="inline-block w-[0.06em] translate-y-[0.08em] animate-pulse bg-amber align-middle">
        &nbsp;
      </span>
      &rdquo;
    </span>
  );
}
