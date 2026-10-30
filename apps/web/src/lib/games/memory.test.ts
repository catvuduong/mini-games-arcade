import { describe, expect, it } from "vitest";
import {
  createMemoryGame,
  flipCard,
  hideMismatch,
  isWon,
  MEMORY_LEVEL_IDS,
  MEMORY_LEVELS,
  type MemoryGame,
} from "./memory";

/** Card indices grouped by symbol, one group per emoji. */
function symbolGroups(game: MemoryGame): number[][] {
  const groups = new Map<string, number[]>();
  game.cards.forEach((card, index) => {
    groups.set(card.symbol, [...(groups.get(card.symbol) ?? []), index]);
  });
  return [...groups.values()];
}

/** `pair` is two cards with the same symbol; `other` is one card from each of two different symbols. */
function findPair(game: MemoryGame): { pair: [number, number]; other: [number, number] } {
  const [first, second] = symbolGroups(game);
  return {
    pair: [first[0], first[1]],
    other: [first[0], second[0]],
  };
}

describe("memory deck", () => {
  it("builds a deck with every emoji exactly twice for each level", () => {
    for (const level of MEMORY_LEVEL_IDS) {
      const game = createMemoryGame(level, 1);
      const { columns, rows } = MEMORY_LEVELS[level];
      expect(game.cards).toHaveLength(columns * rows);

      const counts = new Map<string, number>();
      for (const card of game.cards) {
        counts.set(card.symbol, (counts.get(card.symbol) ?? 0) + 1);
      }
      expect([...counts.values()].every((count) => count === 2)).toBe(true);
      expect(counts.size).toBe((columns * rows) / 2);
    }
  });

  it("shuffles deterministically from the seed", () => {
    expect(createMemoryGame("4x4", 1).cards).toEqual(createMemoryGame("4x4", 1).cards);
    expect(createMemoryGame("4x4", 1).cards).not.toEqual(createMemoryGame("4x4", 2).cards);
  });
});

describe("memory pair matching", () => {
  it("keeps a matching pair face up and counts one move", () => {
    const game = createMemoryGame("4x4", 3);
    const { pair } = findPair(game);

    const once = flipCard(game, pair[0]);
    expect(once.moves).toBe(0);
    expect(once.flipped).toEqual([pair[0]]);

    const twice = flipCard(once, pair[1]);
    expect(twice.moves).toBe(1);
    expect(twice.flipped).toEqual([]);
    expect(twice.cards[pair[0]].matched).toBe(true);
    expect(twice.cards[pair[1]].matched).toBe(true);
  });

  it("keeps a mismatch face up until it is hidden again", () => {
    const game = createMemoryGame("4x4", 3);
    const { other } = findPair(game);

    const mismatched = flipCard(flipCard(game, other[0]), other[1]);
    expect(mismatched.moves).toBe(1);
    expect(mismatched.flipped).toEqual([other[0], other[1]]);
    expect(mismatched.cards[other[0]].matched).toBe(false);

    const third = game.cards.findIndex((_, i) => !other.includes(i));
    expect(flipCard(mismatched, third)).toBe(mismatched);

    const hidden = hideMismatch(mismatched);
    expect(hidden.flipped).toEqual([]);
    expect(hidden.moves).toBe(1);
  });

  it("ignores a card that is already matched or already face up", () => {
    const game = createMemoryGame("4x4", 3);
    const { pair } = findPair(game);
    const matched = flipCard(flipCard(game, pair[0]), pair[1]);

    expect(flipCard(matched, pair[0])).toBe(matched);
    const once = flipCard(game, pair[0]);
    expect(flipCard(once, pair[0])).toBe(once);
  });

  it("is won when every pair has been matched", () => {
    let game = createMemoryGame("4x4", 8);
    for (const [a, b] of symbolGroups(game)) {
      game = flipCard(flipCard(game, a), b);
    }

    expect(isWon(game)).toBe(true);
    expect(game.moves).toBe(8);
  });
});
