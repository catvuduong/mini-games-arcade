"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, type CSSProperties, type PointerEvent } from "react";
import {
  BOARD_SIZE,
  createGame,
  type Direction,
  type Game2048 as Game2048State,
  hasAnimations,
  isGameOver,
  isWinPromptOpen,
  keepPlaying,
  move,
  settle,
  undo,
} from "@/lib/games/game2048";
import { parseSeed, randomSeed } from "@/lib/random";
import { BEST_2048_KEY, recordBest, useBest } from "@/lib/scores";
import { useMounted } from "@/lib/storage";
import { Stat } from "./Stat";

const KEY_DIRECTIONS: Record<string, Direction> = {
  ArrowLeft: "left",
  ArrowRight: "right",
  ArrowUp: "up",
  ArrowDown: "down",
};
const SWIPE_THRESHOLD_PX = 30;
const SETTLE_MS = 180;

/** Reads `?seed=` from the URL. The board only renders on the client, so random seeds never disagree with the server HTML. */
export function Game2048() {
  const mounted = useMounted();
  const seed = parseSeed(useSearchParams().get("seed"));
  if (!mounted) return <div className="game-loading" aria-hidden="true" />;
  return <Board seed={seed} />;
}

function formatNumber(value: number): string {
  return value.toLocaleString("en-US");
}

function tileClass(value: number): string {
  return value > 2048 ? "super" : String(value);
}

function Board({ seed }: { seed: number | undefined }) {
  const [game, setGame] = useState<Game2048State>(() => createGame(seed ?? randomSeed()));
  const best = useBest(BEST_2048_KEY) ?? 0;
  const swipeStart = useRef<{ x: number; y: number } | null>(null);

  const showWin = isWinPromptOpen(game);
  const over = !showWin && isGameOver(game);
  const animating = hasAnimations(game);

  const restart = () => setGame(createGame(seed ?? randomSeed()));

  const play = (direction: Direction) => {
    if (showWin || over) return;
    const next = move(game, direction);
    if (next === game) return;
    setGame(next);
    recordBest(BEST_2048_KEY, next.score, false);
  };

  // Re-subscribes on every render so the handler always sees the latest board.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const direction = KEY_DIRECTIONS[event.key];
      if (!direction || event.altKey || event.ctrlKey || event.metaKey) return;
      event.preventDefault();
      play(direction);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  // Drop merged-away tiles and animation flags once the slide has finished.
  useEffect(() => {
    if (!animating) return;
    const id = window.setTimeout(() => setGame(settle), SETTLE_MS);
    return () => window.clearTimeout(id);
  }, [animating, game]);

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    swipeStart.current = { x: event.clientX, y: event.clientY };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onPointerUp = (event: PointerEvent<HTMLDivElement>) => {
    const start = swipeStart.current;
    swipeStart.current = null;
    if (!start) return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < SWIPE_THRESHOLD_PX) return;
    if (Math.abs(dx) > Math.abs(dy)) play(dx > 0 ? "right" : "left");
    else play(dy > 0 ? "down" : "up");
  };

  return (
    <section className="arcade-panel g2048-panel" aria-label="2048">
      <div className="hud">
        <Stat label="Score" value={formatNumber(game.score)} testId="score" />
        <Stat label="Best" value={formatNumber(Math.max(best, game.score))} testId="best" />
      </div>

      <div className="toolbar">
        <button
          type="button"
          className="btn"
          data-testid="undo"
          disabled={!game.previous}
          onClick={() => setGame(undo)}
        >
          Undo
        </button>
        <button type="button" className="btn" onClick={restart}>
          New game
        </button>
      </div>

      <div
        className="g2048-board"
        data-testid="board"
        role="application"
        tabIndex={0}
        aria-label="2048 board. Use the arrow keys or swipe to slide the tiles."
        style={{ "--size": BOARD_SIZE } as CSSProperties}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerCancel={() => {
          swipeStart.current = null;
        }}
      >
        <div className="g2048-grid" aria-hidden="true">
          {Array.from({ length: BOARD_SIZE * BOARD_SIZE }, (_, i) => (
            <span key={i} className="g2048-slot" />
          ))}
        </div>
        <div className="g2048-tiles" aria-hidden="true">
          {game.tiles.map((tile) => (
            <div
              key={tile.id}
              className={`g2048-tile tile-${tileClass(tile.value)} is-${tile.kind}`}
              style={{ "--row": tile.row, "--col": tile.col } as CSSProperties}
            >
              {tile.value}
            </div>
          ))}
        </div>

        {showWin && (
          <div className="board-overlay" role="dialog" aria-labelledby="g2048-win-title">
            <h2 id="g2048-win-title">2048 reached!</h2>
            <p>Keep going for a higher score, or start a fresh board.</p>
            <div className="overlay-actions">
              <button type="button" className="btn btn-primary" onClick={() => setGame(keepPlaying)}>
                Keep going
              </button>
              <button type="button" className="btn" onClick={restart}>
                New game
              </button>
            </div>
          </div>
        )}

        {over && (
          <div className="board-overlay" role="dialog" aria-labelledby="g2048-over-title">
            <h2 id="g2048-over-title">Game over</h2>
            <p>
              No moves left. Final score <strong>{formatNumber(game.score)}</strong>.
            </p>
            <div className="overlay-actions">
              <button type="button" className="btn" disabled={!game.previous} onClick={() => setGame(undo)}>
                Undo
              </button>
              <button type="button" className="btn btn-primary" onClick={restart}>
                Try again
              </button>
            </div>
          </div>
        )}
      </div>

      <p className="hint">Arrow keys or swipe to move. Undo takes back one move.</p>
    </section>
  );
}
