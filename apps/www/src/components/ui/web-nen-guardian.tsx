"use client";

import React, { useEffect, useState } from "react";
import { NenSprite } from "./nen-sprite";

/**
 * Nen — the little pixel guardian. A friendly aura-orb.
 * This is the web-adapted version of the Remotion component.
 * Uses requestAnimationFrame to mimic useCurrentFrame().
 */

const PALETTE: Record<string, string> = {
  o: "#0566C6", // C.blueDeep
  b: "#037EF6", // C.blue
  l: "#46B6FF", // C.blueLite
  w: "#FFFFFF", // C.white
  p: "#0B1220", // C.ink
  c: "#03D9FD", // C.cyan
  a: "#BfE4FF",
};

// 14 cols × 13 rows. Eyes open.
const OPEN = [
  "....oooooo....",
  "..oobbbbbboo..",
  ".obblllllllbo.",
  "obblllllllllbo",
  "obllwwllwwllbo",
  "obllpwllpwllbo",
  "obllwwllwwllbo",
  "obllllllllllbo",
  "obllllccllllbo",
  "obllllccllllbo",
  ".obllllllllbo.",
  "..oobbllbboo..",
  "....oooooo....",
];

// Eyes closed (blink)
const BLINK = [
  "....oooooo....",
  "..oobbbbbboo..",
  ".obblllllllbo.",
  "obblllllllllbo",
  "obllllllllllbo",
  "oblloolloollbo",
  "obllllllllllbo",
  "obllllllllllbo",
  "obllllccllllbo",
  "obllllccllllbo",
  ".obllllllllbo.",
  "..oobbllbboo..",
  "....oooooo....",
];

// Happy eyes (^ ^)
const HAPPY = [
  "....oooooo....",
  "..oobbbbbboo..",
  ".obblllllllbo.",
  "obblllllllllbo",
  "oblppllllpplbo",
  "obpwplllpwplbo",
  "obllllllllllbo",
  "obllllllllllbo",
  "obllllccllllbo",
  "obllllccllllbo",
  ".obllllllllbo.",
  "..oobbllbboo..",
  "....oooooo....",
];

// Wide eyes (alert)
const WIDE = [
  "....oooooo....",
  "..oobbbbbboo..",
  ".obblllllllbo.",
  "oblwwwllwwwlbo",
  "oblppwllppwlbo",
  "oblppwllppwlbo",
  "oblwwwllwwwlbo",
  "obllllllllllbo",
  "obllllllllllbo",
  "obllllccllllbo",
  ".obllllllllbo.",
  "..oobbllbboo..",
  "....oooooo....",
];

export type GuardianState =
  | "idle"
  | "walking"
  | "waving"
  | "sleeping"
  | "alert"
  | "sneaking"
  | "happy";

export const WebNenGuardian: React.FC<{
  pixel?: number;
  style?: React.CSSProperties;
  className?: string;
  aura?: boolean;
  state?: GuardianState;
}> = ({ pixel = 9, style, className, aura = true, state = "idle" }) => {
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    let animationFrameId: number;
    const startTime = performance.now();

    const render = (time: number) => {
      // Assuming ~30fps to match the Remotion version math
      const elapsed = time - startTime;
      const currentFrame = Math.floor((elapsed / 1000) * 30);
      setFrame(currentFrame);
      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  // Logic per state
  let bob = 0;
  let sway = 0;
  let scaleX = 1;
  let scaleY = 1;
  let grid = OPEN;

  // Base blinking logic
  const cyc = frame % 78;
  const isBlinking = cyc < 4;

  if (state === "idle") {
    bob = Math.sin(frame / 14) * 5;
    grid = isBlinking ? BLINK : OPEN;
  } else if (state === "walking") {
    bob = -Math.abs(Math.sin(frame / 5)) * 11;
    sway = Math.sin(frame / 5) * 7;
    grid = isBlinking ? BLINK : OPEN;
  } else if (state === "waving") {
    bob = Math.sin(frame / 10) * 3;
    // Fast sway back and forth
    sway = Math.sin(frame / 3) * 15;
    grid = HAPPY;
  } else if (state === "sleeping") {
    // Very slow breathing
    bob = Math.sin(frame / 25) * 4;
    scaleY = 0.95 + Math.sin(frame / 25) * 0.05;
    grid = BLINK; // always closed
  } else if (state === "alert") {
    // Jump up
    bob = -8;
    scaleY = 1.1;
    scaleX = 0.9;
    grid = WIDE;
  } else if (state === "sneaking") {
    // Squished and slow steps
    scaleY = 0.7;
    scaleX = 1.1;
    bob = -Math.abs(Math.sin(frame / 10)) * 4 + 4;
    sway = Math.sin(frame / 10) * 5;
    grid = WIDE;
  } else if (state === "happy") {
    bob = -Math.abs(Math.sin(frame / 6)) * 8;
    grid = HAPPY;
  }

  // Aura breathe based on state
  const auraSpeed = state === "sleeping" ? 30 : state === "alert" ? 10 : 18;
  const auraScale = 1 + Math.sin(frame / auraSpeed) * 0.06;
  const auraOpacity =
    state === "sleeping"
      ? 0.2
      : state === "alert"
        ? 0.5
        : 0.35 + Math.sin(frame / auraSpeed) * 0.1;

  const w = 14 * pixel;
  const h = 13 * pixel;

  return (
    <div
      className={className}
      style={{
        position: "relative",
        width: w,
        height: h,
        transform: `translateY(${bob}px) rotate(${sway}deg) scale(${scaleX}, ${scaleY})`,
        ...style,
      }}
    >
      {aura && (
        <div
          style={{
            position: "absolute",
            inset: -pixel * 2.5,
            borderRadius: "50%",
            background: `radial-gradient(circle, ${PALETTE.c}55 0%, ${PALETTE.b}22 45%, transparent 70%)`,
            transform: `scale(${auraScale})`,
            opacity: auraOpacity,
          }}
        />
      )}
      <NenSprite
        grid={grid}
        palette={PALETTE}
        pixel={pixel}
        style={{ position: "relative" }}
      />
    </div>
  );
};
