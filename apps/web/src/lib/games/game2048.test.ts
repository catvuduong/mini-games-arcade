import { describe, expect, it } from "vitest";
import {
  createGame,
  hasAnimations,
  isGameOver,
  isWinPromptOpen,
  keepPlaying,
  move,
  settle,
  undo,
  type Game2048,
  type Tile,
} from "./game2048";

/** Builds a game whose tiles match `rows` (0 = empty). Ids and score start fresh. */
function gameFromRows(rows: number[][], score = 0): Game2048 {
  const tiles: Tile[] = [];
  let id = 1;
  rows.forEach((values, row) =>
    values.forEach((value, col) => {
      if (value !== 0) tiles.push({ id: id++, value, row, col, kind: "normal" });
    }),
  );
  return {
    tiles,
    score,
    nextId: id,
    rng: 1,
    previous: null,
    keepGoing: false,
  };
}

/** Values on the board, ignoring the tile spawned by the last move so slides can be checked exactly. */
function boardGrid(game: Game2048): number[][] {
  const grid = Array.from({ length: 4 }, () => [0, 0, 0, 0]);
  for (const tile of game.tiles) {
    if (tile.kind === "absorbed" || tile.kind === "spawned") continue;
    grid[tile.row][tile.col] = tile.value;
  }
  return grid;
}

const EMPTY = [0, 0, 0, 0];

describe("2048 slide and merge", () => {
  it("slides a lone tile to the edge", () => {
    const game = gameFromRows([[0, 0, 2, 0], EMPTY, EMPTY, EMPTY]);
    const next = move(game, "left");
    expect(next).not.toBe(game);
    expect(boardGrid(next)[0]).toEqual([2, 0, 0, 0]);
  });

  it("merges two equal neighbours once and scores the result", () => {
    const game = gameFromRows([[2, 2, 0, 0], EMPTY, EMPTY, EMPTY]);
    const next = move(game, "left");
    expect(boardGrid(next)[0]).toEqual([4, 0, 0, 0]);
    expect(next.score).toBe(4);
  });

  it("does not merge a tile twice in one move", () => {
    const game = gameFromRows([[2, 2, 2, 2], EMPTY, EMPTY, EMPTY]);
    const next = move(game, "left");
    expect(boardGrid(next)[0]).toEqual([4, 4, 0, 0]);
    expect(next.score).toBe(8);
  });

  it("merges starting from the tile nearest the edge the tiles move towards", () => {
    const game = gameFromRows([[2, 2, 4, 0], EMPTY, EMPTY, EMPTY]);
    const next = move(game, "left");
    expect(boardGrid(next)[0]).toEqual([4, 4, 0, 0]);
    expect(next.score).toBe(4);
  });

  it("slides and merges towards the right edge", () => {
    const game = gameFromRows([[2, 0, 2, 0], EMPTY, EMPTY, EMPTY]);
    const next = move(game, "right");
    expect(boardGrid(next)[0]).toEqual([0, 0, 0, 4]);
    expect(next.score).toBe(4);
  });

  it("slides and merges up and down through columns", () => {
    const game = gameFromRows([[8, 0, 0, 0], [8, 0, 0, 0], EMPTY, [0, 0, 0, 0]]);
    const up = move(game, "up");
    expect(boardGrid(up)[0][0]).toBe(16);
    expect(up.score).toBe(16);

    const down = move(game, "down");
    expect(boardGrid(down)[3][0]).toBe(16);
  });

  it("returns the same game when no tile can move", () => {
    const game = gameFromRows([
      [2, 4, 2, 4],
      [4, 2, 4, 2],
      [2, 4, 2, 4],
      [4, 2, 4, 2],
    ]);
    expect(move(game, "left")).toBe(game);
    expect(move(game, "up")).toBe(game);
  });

  it("spawns exactly one new tile after a move that changes the board", () => {
    const game = gameFromRows([[2, 0, 0, 0], EMPTY, EMPTY, EMPTY]);
    const next = move(game, "right");
    const spawned = next.tiles.filter((tile) => tile.kind === "spawned");
    expect(spawned).toHaveLength(1);
    expect([2, 4]).toContain(spawned[0].value);
  });

  it("marks merged and absorbed tiles for animation until they are settled", () => {
    const game = gameFromRows([[2, 2, 0, 0], EMPTY, EMPTY, EMPTY]);
    const moved = move(game, "left");
    expect(hasAnimations(moved)).toBe(true);
    expect(moved.tiles.filter((tile) => tile.kind === "absorbed")).toHaveLength(1);

    const settled = settle(moved);
    expect(hasAnimations(settled)).toBe(false);
    expect(settled.tiles.some((tile) => tile.kind === "absorbed")).toBe(false);
    expect(settled.tiles.find((tile) => tile.row === 0 && tile.col === 0)?.value).toBe(4);
  });
});

describe("2048 game over", () => {
  it("is over when the board is full and no neighbours are equal", () => {
    const game = gameFromRows([
      [2, 4, 2, 4],
      [4, 2, 4, 2],
      [2, 4, 2, 4],
      [4, 2, 4, 2],
    ]);
    expect(isGameOver(game)).toBe(true);
  });

  it("is not over while two equal tiles are next to each other", () => {
    const game = gameFromRows([
      [2, 4, 2, 4],
      [4, 2, 4, 2],
      [2, 4, 2, 4],
      [4, 2, 4, 4],
    ]);
    expect(isGameOver(game)).toBe(false);
  });

  it("is not over while there is an empty cell", () => {
    const game = gameFromRows([
      [2, 4, 2, 4],
      [4, 2, 4, 2],
      [2, 4, 2, 4],
      [4, 2, 4, 0],
    ]);
    expect(isGameOver(game)).toBe(false);
  });
});

describe("2048 win prompt, undo and seeds", () => {
  it("opens the win prompt once 2048 is on the board until the player keeps going", () => {
    const game = gameFromRows([[1024, 1024, 0, 0], EMPTY, EMPTY, EMPTY]);
    const won = move(game, "left");
    expect(isWinPromptOpen(won)).toBe(true);
    expect(isWinPromptOpen(keepPlaying(won))).toBe(false);
  });

  it("undo restores the board and score from before the last move, one step only", () => {
    const game = gameFromRows([[2, 2, 0, 0], EMPTY, EMPTY, EMPTY], 10);
    const moved = move(game, "left");
    const restored = undo(moved);
    expect(restored.score).toBe(10);
    expect(boardGrid(restored)[0]).toEqual([2, 2, 0, 0]);
    expect(restored.previous).toBeNull();
    expect(undo(restored)).toBe(restored);
  });

  it("the same seed produces the same starting board", () => {
    expect(createGame(7).tiles).toEqual(createGame(7).tiles);
    expect(createGame(7).tiles).toHaveLength(2);
  });
});
