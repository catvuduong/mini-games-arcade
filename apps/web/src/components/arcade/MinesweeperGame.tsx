"use client";

import { useSearchParams } from "next/navigation";
import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
  type ReactNode,
} from "react";
import {
  createMinesGame,
  DIFFICULTIES,
  DIFFICULTY_IDS,
  elapsedSeconds,
  minesRemaining,
  revealCell,
  toggleFlag,
  type Difficulty,
  type MinesGame,
} from "@/lib/games/minesweeper";
import { currentTime } from "@/lib/clock";
import { formatTime } from "@/lib/format";
import { parseSeed, randomSeed } from "@/lib/random";
import { minesweeperBestKey, recordBest, useBest } from "@/lib/scores";
import { useMounted } from "@/lib/storage";
import { Stat } from "./Stat";

const LONG_PRESS_MS = 450;
const TICK_MS = 250;

/** Reads `?seed=` from the URL. The board only renders on the client, so random seeds never disagree with the server HTML. */
export function MinesweeperGame() {
  const mounted = useMounted();
  const seed = parseSeed(useSearchParams().get("seed"));
  if (!mounted) return <div className="game-loading" aria-hidden="true" />;
  return <MinesBoard seed={seed} />;
}

function MinesBoard({ seed }: { seed: number | undefined }) {
  const [difficulty, setDifficulty] = useState<Difficulty>("beginner");
  const [game, setGame] = useState<MinesGame>(() =>
    createMinesGame("beginner", seed ?? randomSeed()),
  );
  const [now, setNow] = useState(0);
  const best = useBest(minesweeperBestKey(difficulty));
  const pressTimer = useRef<number | null>(null);
  const longPressed = useRef(false);
  const pointerKind = useRef<string>("mouse");

  const { status, board } = game;
  const { columns, rows } = DIFFICULTIES[difficulty];
  const elapsed = elapsedSeconds(game, now);
  const running = status === "playing";

  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => setNow(Date.now()), TICK_MS);
    return () => window.clearInterval(id);
  }, [running]);

  const startGame = (next: Difficulty) => {
    setDifficulty(next);
    setGame(createMinesGame(next, seed ?? randomSeed()));
  };

  const reveal = (index: number) => {
    if (longPressed.current) {
      longPressed.current = false;
      return;
    }
    const time = currentTime();
    const next = revealCell(game, index, time);
    if (next === game) return;
    setNow(time);
    setGame(next);
    if (next.status === "won") {
      recordBest(minesweeperBestKey(difficulty), elapsedSeconds(next, time), true);
    }
  };

  const flag = (index: number) => {
    setGame((current) => toggleFlag(current, index));
  };

  const cancelPress = () => {
    if (pressTimer.current !== null) {
      window.clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
  };

  const onPointerDown = (index: number, event: PointerEvent<HTMLButtonElement>) => {
    pointerKind.current = event.pointerType;
    longPressed.current = false;
    if (event.pointerType === "mouse") return;
    pressTimer.current = window.setTimeout(() => {
      longPressed.current = true;
      pressTimer.current = null;
      flag(index);
    }, LONG_PRESS_MS);
  };

  const onContextMenu = (index: number, event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    // Touch long-press already flagged the cell; the browser's context menu must not flag it again.
    if (pointerKind.current !== "mouse") return;
    flag(index);
  };

  const onKeyDown = (index: number, event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key !== "f" && event.key !== "F") return;
    event.preventDefault();
    flag(index);
  };

  const cells: ReactNode[] = game.flags.map((flagged, index) => {
    const cell = board?.cells[index];
    const revealed = cell?.revealed ?? false;
    const row = Math.floor(index / columns) + 1;
    const col = (index % columns) + 1;

    let state = "hidden";
    let content: ReactNode = null;
    let className = "ms-cell";
    if (revealed && cell) {
      if (cell.mine) {
        state = "mine";
        content = "💣";
        className += " is-mine";
      } else if (cell.adjacent > 0) {
        state = `${cell.adjacent} nearby ${cell.adjacent === 1 ? "mine" : "mines"}`;
        content = cell.adjacent;
        className += ` is-open n${cell.adjacent}`;
      } else {
        state = "empty";
        className += " is-open";
      }
    } else if (flagged) {
      state = "flagged";
      content = "🚩";
      className += " is-flagged";
    }

    return (
      <button
        key={index}
        type="button"
        data-testid="cell"
        data-index={index}
        className={className}
        aria-label={`Row ${row}, column ${col}, ${state}`}
        onClick={() => reveal(index)}
        onContextMenu={(event) => onContextMenu(index, event)}
        onPointerDown={(event) => onPointerDown(index, event)}
        onPointerUp={cancelPress}
        onPointerLeave={cancelPress}
        onPointerCancel={cancelPress}
        onKeyDown={(event) => onKeyDown(index, event)}
      >
        {content}
      </button>
    );
  });

  const face = status === "lost" ? "😵" : status === "won" ? "😎" : "🙂";

  return (
    <section className="arcade-panel ms-panel" aria-label="Minesweeper">
      <div className="hud">
        <Stat label="Mines left" value={minesRemaining(game)} testId="mine-counter" />
        <div className="ms-face-wrap">
          <button
            type="button"
            className="ms-face"
            aria-label="New game"
            title="New game"
            onClick={() => startGame(difficulty)}
          >
            {face}
          </button>
        </div>
        <Stat label="Time" value={formatTime(elapsed)} testId="timer" />
        <Stat label="Best" value={best === null ? "—" : formatTime(best)} />
      </div>

      <div className="toolbar">
        <div className="segmented" role="group" aria-label="Difficulty">
          {DIFFICULTY_IDS.map((id) => (
            <button
              key={id}
              type="button"
              className="segment"
              aria-pressed={id === difficulty}
              onClick={() => startGame(id)}
            >
              {DIFFICULTIES[id].label}
            </button>
          ))}
        </div>
      </div>

      <div className="ms-scroll">
        <div
          className="ms-board"
          data-testid="board"
          role="group"
          aria-label={`${DIFFICULTIES[difficulty].label} minefield, ${columns} by ${rows}`}
          style={{ "--cols": columns } as CSSProperties}
        >
          {cells}
        </div>
      </div>

      {status === "lost" && (
        <div className="result-banner is-lost" role="status">
          <p>Boom! You hit a mine.</p>
          <button type="button" className="btn btn-primary" onClick={() => startGame(difficulty)}>
            Try again
          </button>
        </div>
      )}
      {status === "won" && (
        <div className="result-banner" role="status">
          <p>
            Minefield cleared in <strong>{formatTime(elapsed)}</strong>.
          </p>
          <button type="button" className="btn btn-primary" onClick={() => startGame(difficulty)}>
            Play again
          </button>
        </div>
      )}

      <p className="hint">
        Click to reveal. Right-click, long-press or press F to flag. The first click is always safe.
      </p>
    </section>
  );
}
