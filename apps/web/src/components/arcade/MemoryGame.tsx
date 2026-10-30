"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState, type CSSProperties } from "react";
import {
  createMemoryGame,
  flipCard,
  hideMismatch,
  isWon,
  matchedPairs,
  MEMORY_LEVEL_IDS,
  MEMORY_LEVELS,
  type MemoryGame as MemoryGameState,
  type MemoryLevel,
} from "@/lib/games/memory";
import { currentTime } from "@/lib/clock";
import { formatTime } from "@/lib/format";
import { parseSeed, randomSeed } from "@/lib/random";
import { memoryBestKey, recordBest, useBest } from "@/lib/scores";
import { useMounted } from "@/lib/storage";
import { Confetti } from "./Confetti";
import { Stat } from "./Stat";

const MISMATCH_DELAY_MS = 900;
const TICK_MS = 250;

interface Session {
  game: MemoryGameState;
  startedAt: number | null;
  endedAt: number | null;
}

/** Reads `?seed=` from the URL. The board only renders on the client, so random seeds never disagree with the server HTML. */
export function MemoryGame() {
  const mounted = useMounted();
  const seed = parseSeed(useSearchParams().get("seed"));
  if (!mounted) return <div className="game-loading" aria-hidden="true" />;
  return <MemoryBoard seed={seed} />;
}

function MemoryBoard({ seed }: { seed: number | undefined }) {
  const [level, setLevel] = useState<MemoryLevel>("4x4");
  const [session, setSession] = useState<Session>(() => ({
    game: createMemoryGame("4x4", seed ?? randomSeed()),
    startedAt: null,
    endedAt: null,
  }));
  const [now, setNow] = useState(0);
  const best = useBest(memoryBestKey(level));

  const { game, startedAt, endedAt } = session;
  const won = isWon(game);
  const running = startedAt !== null && endedAt === null;
  const mismatch = game.flipped.length === 2;
  const elapsed = startedAt === null ? 0 : Math.floor(((endedAt ?? now) - startedAt) / 1000);

  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => setNow(Date.now()), TICK_MS);
    return () => window.clearInterval(id);
  }, [running]);

  useEffect(() => {
    if (!mismatch) return;
    const id = window.setTimeout(
      () => setSession((prev) => ({ ...prev, game: hideMismatch(prev.game) })),
      MISMATCH_DELAY_MS,
    );
    return () => window.clearTimeout(id);
  }, [mismatch]);

  const startGame = (nextLevel: MemoryLevel) => {
    setLevel(nextLevel);
    setSession({
      game: createMemoryGame(nextLevel, seed ?? randomSeed()),
      startedAt: null,
      endedAt: null,
    });
  };

  const flip = (index: number) => {
    const next = flipCard(game, index);
    if (next === game) return;
    const time = currentTime();
    const finished = isWon(next);
    setNow(time);
    setSession({
      game: next,
      startedAt: startedAt ?? time,
      endedAt: finished ? time : null,
    });
    if (finished) recordBest(memoryBestKey(level), next.moves, true);
  };

  const { columns } = MEMORY_LEVELS[level];
  const pairs = game.cards.length / 2;

  return (
    <section className="arcade-panel memory-panel" aria-label="Memory Match">
      <div className="hud">
        <Stat label="Moves" value={game.moves} testId="moves" />
        <Stat label="Time" value={formatTime(elapsed)} testId="timer" />
        <Stat label="Pairs" value={`${matchedPairs(game)} / ${pairs}`} />
        <Stat label="Best" value={best === null ? "—" : `${best} moves`} />
      </div>

      <div className="toolbar">
        <div className="segmented" role="group" aria-label="Difficulty">
          {MEMORY_LEVEL_IDS.map((id) => (
            <button
              key={id}
              type="button"
              className="segment"
              aria-pressed={id === level}
              onClick={() => startGame(id)}
            >
              {MEMORY_LEVELS[id].label}
            </button>
          ))}
        </div>
        <button type="button" className="btn" onClick={() => startGame(level)}>
          New game
        </button>
      </div>

      <div
        className="memory-board"
        data-testid="board"
        role="group"
        aria-label={`${MEMORY_LEVELS[level].label} board of face-down cards`}
        style={{ "--columns": columns } as CSSProperties}
      >
        {game.cards.map((card, index) => {
          const faceUp = card.matched || game.flipped.includes(index);
          return (
            <button
              key={index}
              type="button"
              data-testid="memory-card"
              className={`memory-card${faceUp ? " is-up" : ""}${card.matched ? " is-matched" : ""}`}
              aria-label={`Card ${index + 1}, ${faceUp ? card.symbol : "face down"}${card.matched ? ", matched" : ""}`}
              onClick={() => flip(index)}
            >
              <span className="memory-card-flipper">
                <span className="memory-face memory-back" aria-hidden="true" />
                <span className="memory-face memory-front" aria-hidden="true">
                  {card.symbol}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      {won && (
        <div className="result-banner" role="status">
          <p>
            Board cleared in <strong>{game.moves}</strong> moves and{" "}
            <strong>{formatTime(elapsed)}</strong>.
          </p>
          <button type="button" className="btn btn-primary" onClick={() => startGame(level)}>
            Play again
          </button>
        </div>
      )}
      {won && <Confetti />}
    </section>
  );
}
