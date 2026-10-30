import { shuffle } from "../random";

export type Difficulty = "beginner" | "intermediate" | "expert";

export const DIFFICULTIES: Record<
  Difficulty,
  { label: string; columns: number; rows: number; mines: number }
> = {
  beginner: { label: "Beginner", columns: 9, rows: 9, mines: 10 },
  intermediate: { label: "Intermediate", columns: 16, rows: 16, mines: 40 },
  expert: { label: "Expert", columns: 30, rows: 16, mines: 99 },
};

export const DIFFICULTY_IDS = Object.keys(DIFFICULTIES) as Difficulty[];

export interface Cell {
  mine: boolean;
  adjacent: number;
  revealed: boolean;
}

export interface Board {
  columns: number;
  rows: number;
  mines: number;
  cells: Cell[];
}

export type MinesStatus = "ready" | "playing" | "won" | "lost";

export interface MinesGame {
  difficulty: Difficulty;
  seed: number;
  status: MinesStatus;
  /** Created on the first reveal, so the first click is always safe. */
  board: Board | null;
  flags: boolean[];
  startedAt: number | null;
  endedAt: number | null;
}

export function createMinesGame(difficulty: Difficulty, seed: number): MinesGame {
  const { columns, rows } = DIFFICULTIES[difficulty];
  return {
    difficulty,
    seed,
    status: "ready",
    board: null,
    flags: Array.from({ length: columns * rows }, () => false),
    startedAt: null,
    endedAt: null,
  };
}

/** Indices of the cells around `index` that are on the board. */
export function neighbors(columns: number, rows: number, index: number): number[] {
  const row = Math.floor(index / columns);
  const col = index % columns;
  const result: number[] = [];
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const r = row + dr;
      const c = col + dc;
      if (r >= 0 && r < rows && c >= 0 && c < columns) result.push(r * columns + c);
    }
  }
  return result;
}

/**
 * Places the mines, keeping `safeIndex` and its neighbours free so the first
 * click always opens a region.
 */
export function createBoard(difficulty: Difficulty, safeIndex: number, seed: number): Board {
  const { columns, rows, mines } = DIFFICULTIES[difficulty];
  const excluded = new Set([safeIndex, ...neighbors(columns, rows, safeIndex)]);
  const candidates: number[] = [];
  for (let i = 0; i < columns * rows; i++) {
    if (!excluded.has(i)) candidates.push(i);
  }
  const [shuffled] = shuffle(candidates, seed);
  const mined = new Set(shuffled.slice(0, mines));

  const cells: Cell[] = Array.from({ length: columns * rows }, (_, i) => ({
    mine: mined.has(i),
    adjacent: neighbors(columns, rows, i).filter((n) => mined.has(n)).length,
    revealed: false,
  }));
  return { columns, rows, mines, cells };
}

/** Reveals `start` and, if it is empty, every connected empty cell and its border. Flagged cells are left alone. */
function floodReveal(board: Board, flags: readonly boolean[], start: number): Cell[] {
  const cells = [...board.cells];
  const stack = [start];
  while (stack.length > 0) {
    const index = stack.pop() as number;
    const cell = cells[index];
    if (cell.revealed || flags[index]) continue;
    cells[index] = { ...cell, revealed: true };
    if (cell.adjacent === 0 && !cell.mine) {
      stack.push(...neighbors(board.columns, board.rows, index));
    }
  }
  return cells;
}

export function revealCell(game: MinesGame, index: number, now: number): MinesGame {
  if (game.status === "won" || game.status === "lost") return game;
  if (game.flags[index]) return game;

  const board = game.board ?? createBoard(game.difficulty, index, game.seed);
  if (board.cells[index].revealed) return game;

  const started: MinesGame = {
    ...game,
    status: "playing",
    board,
    startedAt: game.startedAt ?? now,
  };

  if (board.cells[index].mine) {
    const cells = board.cells.map((cell) =>
      cell.mine ? { ...cell, revealed: true } : cell,
    );
    return { ...started, status: "lost", endedAt: now, board: { ...board, cells } };
  }

  const cells = floodReveal(board, game.flags, index);
  const revealedSafe = cells.filter((cell) => cell.revealed && !cell.mine).length;
  const updated = { ...board, cells };
  if (revealedSafe === cells.length - board.mines) {
    return {
      ...started,
      status: "won",
      endedAt: now,
      board: updated,
      flags: cells.map((cell) => cell.mine),
    };
  }
  return { ...started, board: updated };
}

export function toggleFlag(game: MinesGame, index: number): MinesGame {
  if (game.status === "won" || game.status === "lost") return game;
  if (game.board?.cells[index].revealed) return game;
  return {
    ...game,
    flags: game.flags.map((flagged, i) => (i === index ? !flagged : flagged)),
  };
}

export function flagCount(game: MinesGame): number {
  return game.flags.filter(Boolean).length;
}

/** Mines left to find, as shown on the counter. Can go negative when over-flagged. */
export function minesRemaining(game: MinesGame): number {
  return DIFFICULTIES[game.difficulty].mines - flagCount(game);
}

export function elapsedSeconds(game: MinesGame, now: number): number {
  if (game.startedAt === null) return 0;
  return Math.floor(((game.endedAt ?? now) - game.startedAt) / 1000);
}
