import { describe, expect, it } from "vitest";
import {
  createBoard,
  createMinesGame,
  DIFFICULTIES,
  elapsedSeconds,
  flagCount,
  minesRemaining,
  neighbors,
  revealCell,
  toggleFlag,
  type Board,
  type Difficulty,
  type MinesGame,
} from "./minesweeper";

const SEEDS = Array.from({ length: 40 }, (_, i) => i + 1);

function countMines(board: Board): number {
  return board.cells.filter((cell) => cell.mine).length;
}

describe("minesweeper board generation", () => {
  it("places the configured number of mines for every difficulty", () => {
    for (const difficulty of Object.keys(DIFFICULTIES) as Difficulty[]) {
      const board = createBoard(difficulty, 0, 42);
      const { columns, rows, mines } = DIFFICULTIES[difficulty];
      expect(board.cells).toHaveLength(columns * rows);
      expect(countMines(board)).toBe(mines);
    }
  });

  it("never places a mine on the first click or its neighbours", () => {
    const difficulties = Object.keys(DIFFICULTIES) as Difficulty[];
    for (const difficulty of difficulties) {
      const { columns, rows } = DIFFICULTIES[difficulty];
      const clicks = [0, columns - 1, Math.floor((columns * rows) / 2), columns * rows - 1];
      for (const seed of SEEDS) {
        for (const click of clicks) {
          const board = createBoard(difficulty, click, seed);
          const safe = [click, ...neighbors(columns, rows, click)];
          for (const index of safe) {
            expect(board.cells[index].mine).toBe(false);
          }
        }
      }
    }
  });

  it("counts the mines touching every cell", () => {
    const board = createBoard("intermediate", 0, 9);
    board.cells.forEach((cell, index) => {
      const touching = neighbors(board.columns, board.rows, index).filter(
        (n) => board.cells[n].mine,
      ).length;
      expect(cell.adjacent).toBe(touching);
    });
  });

  it("generates the same board for the same seed", () => {
    expect(createBoard("beginner", 40, 5)).toEqual(createBoard("beginner", 40, 5));
  });
});

describe("minesweeper reveal and flood fill", () => {
  it("opens a connected region of empty cells and stops at the numbers", () => {
    const base = createMinesGame("beginner", 3);
    const game = revealCell(base, 0, 1000);
    const board = game.board as Board;

    expect(game.status).toBe("playing");
    expect(board.cells[0].revealed).toBe(true);

    board.cells.forEach((cell, index) => {
      if (cell.revealed && cell.adjacent === 0 && !cell.mine) {
        for (const n of neighbors(board.columns, board.rows, index)) {
          expect(board.cells[n].revealed).toBe(true);
        }
      }
    });
    expect(board.cells.filter((cell) => cell.revealed).length).toBeGreaterThan(1);
    expect(board.cells.some((cell) => cell.revealed && cell.mine)).toBe(false);
  });

  it("does not reveal flagged cells, even inside a flood fill", () => {
    const base = createMinesGame("beginner", 3);
    const start = revealCell(base, 0, 0);
    const board = start.board as Board;
    const target = board.cells.findIndex(
      (cell, index) => !cell.revealed && !cell.mine && index !== 0,
    );
    const flagged = toggleFlag(start, target);
    const next = revealCell(flagged, target, 0);
    expect(next.board?.cells[target].revealed).toBe(false);
    expect(next.flags[target]).toBe(true);
  });

  it("loses the game when a mine is revealed and shows every mine", () => {
    let game: MinesGame = revealCell(createMinesGame("beginner", 11), 0, 0);
    const board = game.board as Board;
    const mineIndex = board.cells.findIndex((cell) => cell.mine);
    game = revealCell(game, mineIndex, 5000);

    expect(game.status).toBe("lost");
    expect(game.endedAt).toBe(5000);
    expect(game.board?.cells.filter((cell) => cell.mine).every((cell) => cell.revealed)).toBe(true);
  });

  it("wins once every safe cell is revealed and flags the mines", () => {
    let game = revealCell(createMinesGame("beginner", 21), 0, 0);
    const safeCells = (game.board as Board).cells
      .map((cell, index) => (cell.mine ? -1 : index))
      .filter((index) => index >= 0);

    for (const index of safeCells) {
      game = revealCell(game, index, 2000);
    }

    expect(game.status).toBe("won");
    expect(flagCount(game)).toBe(DIFFICULTIES.beginner.mines);
    expect(minesRemaining(game)).toBe(0);
  });

  it("ignores clicks after the game has ended", () => {
    const won = { ...createMinesGame("beginner", 2), status: "won" as const };
    expect(revealCell(won, 0, 0)).toBe(won);
  });
});

describe("minesweeper flags, counter and timer", () => {
  it("toggles a flag on a hidden cell and updates the mine counter", () => {
    const game = createMinesGame("beginner", 1);
    const flagged = toggleFlag(game, 4);
    expect(flagged.flags[4]).toBe(true);
    expect(minesRemaining(flagged)).toBe(DIFFICULTIES.beginner.mines - 1);
    expect(toggleFlag(flagged, 4).flags[4]).toBe(false);
  });

  it("cannot flag a revealed cell", () => {
    const started = revealCell(createMinesGame("beginner", 4), 0, 0);
    const revealedIndex = (started.board as Board).cells.findIndex((cell) => cell.revealed);
    expect(toggleFlag(started, revealedIndex)).toBe(started);
  });

  it("measures elapsed seconds from the first reveal until the game ends", () => {
    const game: MinesGame = { ...createMinesGame("beginner", 1), startedAt: 1000, endedAt: null };
    expect(elapsedSeconds(game, 4500)).toBe(3);
    expect(elapsedSeconds({ ...game, endedAt: 6000 }, 9000)).toBe(5);
    expect(elapsedSeconds(createMinesGame("beginner", 1), 9000)).toBe(0);
  });
});
