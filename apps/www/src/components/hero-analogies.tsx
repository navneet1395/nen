"use client";

import React, { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";

export const ANALOGIES = [
  "Your API data is naked the moment TLS ends.", // Index 0: Main pitch (used on mobile)
  "If HTTPS encrypts everything, why do we hash passwords?",
  "If TLS is end-to-end, why can every proxy read your payload?",
  "If your connection is secure, why are your logs full of plaintext?",
];

// 3 distinct non-overlapping slots for desktop
// We pick indices 1 to 5 for the floating bubbles
const SLOTS = [
  { id: 1, position: "top-[-5%] left-[-5%] md:left-0", delay: 0 },
  { id: 2, position: "top-[40%] right-[-5%] md:right-0", delay: 2000 },
  { id: 3, position: "bottom-[0%] left-[5%] md:left-[10%]", delay: 4000 },
];

export function HeroAnalogies() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  // Hidden on mobile, only shows 3 slots on desktop
  return (
    <div className="absolute inset-0 pointer-events-none z-50 hidden md:block">
      <div className="relative w-full h-full max-w-7xl mx-auto">
        {SLOTS.map((slot, i) => (
          <FloatingBubble key={slot.id} slot={slot} index={i} />
        ))}
      </div>
    </div>
  );
}

function FloatingBubble({ slot, index }: { slot: typeof SLOTS[0], index: number }) {
  const [show, setShow] = useState(false);
  // Start with analogy index 1, 2, or 3.
  const [textIndex, setTextIndex] = useState((index % 5) + 1);

  useEffect(() => {
    const initialTimeout = setTimeout(() => {
      setShow(true);

      const interval = setInterval(() => {
        setShow(false); // Fade out
        setTimeout(() => {
          // Cycle to the next analogy (skipping index 0)
          setTextIndex((prev) => {
            let next = prev + 1;
            if (next >= ANALOGIES.length) next = 1;
            return next;
          });
          setShow(true);
        }, 1500);
      }, 7000);

      return () => clearInterval(interval);
    }, slot.delay);

    return () => clearTimeout(initialTimeout);
  }, [slot.delay]);

  return (
    <div
      className={`absolute ${slot.position} max-w-[260px] transition-all duration-1000 ease-in-out ${
        show ? "opacity-100 translate-y-0 scale-100 blur-none pointer-events-auto" : "opacity-0 translate-y-4 scale-95 blur-sm"
      }`}
    >
      {/* Bubble shape: rounded heavily but with one sharp corner like a thought tail */}
      <div className="relative rounded-[2rem] rounded-br-sm border border-primary/15 bg-muted/30 backdrop-blur-xl px-5 py-4 shadow-2xl shadow-black/20">
        <div className="flex items-start gap-3">
          <Sparkles className="w-5 h-5 text-primary/60 mt-0.5 flex-shrink-0" />
          <p className="text-sm font-medium text-muted-foreground leading-snug">
            {ANALOGIES[textIndex]}
          </p>
        </div>
      </div>
    </div>
  );
}

export function MobileAnalogiesTicker() {
  const [index, setIndex] = useState(0);
  const [fade, setFade] = useState(true);

  useEffect(() => {
    const id = setInterval(() => {
      setFade(false);
      setTimeout(() => {
        setIndex((prev) => (prev + 1) % ANALOGIES.length);
        setFade(true);
      }, 500);
    }, 4500);
    return () => clearInterval(id);
  }, []);

  return (
    <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-6 leading-tight relative z-20 min-h-[140px] flex items-center justify-center text-center">
      <span
        className={`transition-all duration-500 px-2 ${
          fade ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
        }`}
      >
        {index === 0 ? (
          <>
            Your API data is naked the{" "}
            <span className="gradient-text-hero glow-text">moment TLS ends</span>
          </>
        ) : (
          <span className="text-foreground/70 italic">"{ANALOGIES[index]}"</span>
        )}
      </span>
    </h1>
  );
}
