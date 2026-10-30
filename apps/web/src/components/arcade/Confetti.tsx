"use client";

import { useState, type CSSProperties } from "react";

const COLORS = ["#f472b6", "#22d3ee", "#facc15", "#a3e635", "#c084fc", "#fb923c"];
const PIECE_COUNT = 90;

/** A one-off burst of falling paper. Rendered only when a game is won; CSS turns it off for reduced motion. */
export function Confetti() {
  const [pieces] = useState(() =>
    Array.from({ length: PIECE_COUNT }, (_, id) => ({
      id,
      left: Math.random() * 100,
      delay: Math.random() * 0.6,
      duration: 2.2 + Math.random() * 1.8,
      drift: (Math.random() - 0.5) * 180,
      spin: 360 + Math.random() * 720,
      color: COLORS[id % COLORS.length],
    })),
  );

  return (
    <div className="confetti" aria-hidden="true" data-testid="confetti">
      {pieces.map((piece) => (
        <span
          key={piece.id}
          className="confetti-piece"
          style={
            {
              left: `${piece.left}%`,
              background: piece.color,
              animationDelay: `${piece.delay}s`,
              animationDuration: `${piece.duration}s`,
              "--drift": `${piece.drift}px`,
              "--spin": `${piece.spin}deg`,
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}
