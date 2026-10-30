import { nextInt } from "../random";

export const BOARD_SIZE = 4;
export const WIN_VALUE = 2048;

export type Direction = "left" | "right" | "up" | "down";

/**
 * `spawned` and `merged` drive one-off animations, `absorbed` is a tile that
 * slides into a merge and then disappears. `settle` clears all three.
 */
export type TileKind = "normal" | "spawned" | "merged" | "absorbed";

export interface Tile {
  id: number;
  value: number;
  row: number;
  col: number;
  kind: TileKind;
}

interface Board {
  tiles: Tile[];
  score: number;
  nextId: number;
  /** Generator state for spawns, so the same seed replays the same game. */
  rng: number;
}

export interface Game2048 extends Board {
  /** Board before the last move, used by a single undo. */
  previous: Board | null;
  /** True once the player chose to keep going after reaching 2048. */
  keepGoing: boolean;
}

export function createGame(seed: number): Game2048 {
  const empty: Board = { tiles: [], score: 0, nextId: 1, rng: seed };
  return { ...spawn(spawn(empty)), previous: null, keepGoing: false };
}

function spawn(board: Board): Board {
  const occupied = new Set(
    board.tiles
      .filter((tile) => tile.kind !== "absorbed")
      .map((tile) => tile.row * BOARD_SIZE + tile.col),
  );
  const free: number[] = [];
  for (let cell = 0; cell < BOARD_SIZE * BOARD_SIZE; cell++) {
    if (!occupied.has(cell)) free.push(cell);
  }
  if (free.length === 0) return board;

  const [pick, afterPick] = nextInt(board.rng, free.length);
  const [roll, afterRoll] = nextInt(afterPick, 10);
  const cell = free[pick];
  const tile: Tile = {
    id: board.nextId,
    value: roll === 0 ? 4 : 2,
    row: Math.floor(cell / BOARD_SIZE),
    col: cell % BOARD_SIZE,
    kind: "spawned",
  };
  return {
    ...board,
    tiles: [...board.tiles, tile],
    nextId: board.nextId + 1,
    rng: afterRoll,
  };
}

interface Slide {
  tiles: Tile[];
  gained: number;
  moved: boolean;
}

/**
 * Slides every lane towards the edge in `direction`. Each tile merges at most
 * once per move, and merging starts from the tile nearest the edge.
 */
function slide(tiles: readonly Tile[], direction: Direction): Slide {
  const horizontal = direction === "left" || direction === "right";
  const towardHighIndex = direction === "right" || direction === "down";

  const lanes = new Map<number, Tile[]>();
  for (const tile of tiles) {
    const lane = horizontal ? tile.row : tile.col;
    lanes.set(lane, [...(lanes.get(lane) ?? []), tile]);
  }

  const result: Tile[] = [];
  let gained = 0;
  let moved = false;

  for (const [lane, laneTiles] of lanes) {
    const along = (tile: Tile) => (horizontal ? tile.col : tile.row);
    const ordered = [...laneTiles].sort((a, b) =>
      towardHighIndex ? along(b) - along(a) : along(a) - along(b),
    );
    const slotAt = (position: number) => {
      const index = towardHighIndex ? BOARD_SIZE - 1 - position : position;
      return horizontal ? { row: lane, col: index } : { row: index, col: lane };
    };

    let position = -1;
    let anchor: number | null = null;
    for (const tile of ordered) {
      if (anchor !== null && result[anchor].value === tile.value) {
        const target = result[anchor];
        const merged = target.value * 2;
        result[anchor] = { ...target, value: merged, kind: "merged" };
        result.push({ ...tile, row: target.row, col: target.col, kind: "absorbed" });
        gained += merged;
        moved = true;
        anchor = null;
      } else {
        position++;
        const slot = slotAt(position);
        if (slot.row !== tile.row || slot.col !== tile.col) moved = true;
        result.push({ ...tile, ...slot, kind: "normal" });
        anchor = result.length - 1;
      }
    }
  }

  return { tiles: result, gained, moved };
}

/**
 * Applies one move. Returns the same game when the move changes nothing, so
 * callers can compare references to decide whether anything happened.
 */
export function move(game: Game2048, direction: Direction): Game2048 {
  const current: Board = {
    tiles: game.tiles.filter((tile) => tile.kind !== "absorbed"),
    score: game.score,
    nextId: game.nextId,
    rng: game.rng,
  };
  const slid = slide(current.tiles, direction);
  if (!slid.moved) return game;

  const next = spawn({
    ...current,
    tiles: slid.tiles,
    score: current.score + slid.gained,
  });
  return { ...next, previous: current, keepGoing: game.keepGoing };
}

/** Drops absorbed tiles and clears animation markers once the animation ends. */
export function settle(game: Game2048): Game2048 {
  return {
    ...game,
    tiles: game.tiles
      .filter((tile) => tile.kind !== "absorbed")
      .map((tile) => (tile.kind === "normal" ? tile : { ...tile, kind: "normal" })),
  };
}

export function hasAnimations(game: Game2048): boolean {
  return game.tiles.some((tile) => tile.kind !== "normal");
}

/** Restores the board from before the last move. Only one step is kept. */
export function undo(game: Game2048): Game2048 {
  if (!game.previous) return game;
  return {
    ...game.previous,
    tiles: game.previous.tiles.map((tile) => ({ ...tile, kind: "normal" })),
    previous: null,
    keepGoing: game.keepGoing,
  };
}

export function keepPlaying(game: Game2048): Game2048 {
  return { ...game, keepGoing: true };
}

export function hasReachedWin(game: Game2048): boolean {
  return game.tiles.some((tile) => tile.value >= WIN_VALUE);
}

/** True when the win prompt should be shown: 2048 is on the board and the player has not chosen to continue. */
export function isWinPromptOpen(game: Game2048): boolean {
  return hasReachedWin(game) && !game.keepGoing;
}

/** True when the board is full and no two neighbours are equal. */
export function isGameOver(game: Game2048): boolean {
  return !canMerge(game.tiles);
}

function canMerge(tiles: readonly Tile[]): boolean {
  const grid: number[][] = Array.from({ length: BOARD_SIZE }, () =>
    Array.from({ length: BOARD_SIZE }, () => 0),
  );
  for (const tile of tiles) {
    if (tile.kind !== "absorbed") grid[tile.row][tile.col] = tile.value;
  }
  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      const value = grid[row][col];
      if (value === 0) return true;
      if (col + 1 < BOARD_SIZE && grid[row][col + 1] === value) return true;
      if (row + 1 < BOARD_SIZE && grid[row + 1][col] === value) return true;
    }
  }
  return false;
}
