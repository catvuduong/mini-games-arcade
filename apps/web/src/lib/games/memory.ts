import { shuffle } from "../random";

export type MemoryLevel = "4x4" | "4x5" | "6x6";

export const MEMORY_LEVELS: Record<
  MemoryLevel,
  { label: string; columns: number; rows: number }
> = {
  "4x4": { label: "4×4", columns: 4, rows: 4 },
  "4x5": { label: "4×5", columns: 4, rows: 5 },
  "6x6": { label: "6×6", columns: 6, rows: 6 },
};

export const MEMORY_LEVEL_IDS = Object.keys(MEMORY_LEVELS) as MemoryLevel[];

const EMOJI_POOL = [
  "🍎", "🍌", "🍇", "🍓", "🍒", "🍑", "🥝", "🍍", "🌽", "🍄",
  "🐶", "🐱", "🦊", "🐸", "🐼", "🐙", "🚀", "⭐",
];

export interface MemoryCard {
  symbol: string;
  matched: boolean;
}

export interface MemoryGame {
  level: MemoryLevel;
  cards: MemoryCard[];
  /** Indices of face-up cards that are waiting to be compared (at most two). */
  flipped: number[];
  moves: number;
}

/** Builds a shuffled deck where every emoji appears exactly twice. */
export function createMemoryGame(level: MemoryLevel, seed: number): MemoryGame {
  const { columns, rows } = MEMORY_LEVELS[level];
  const pairs = (columns * rows) / 2;
  const [pool, state] = shuffle(EMOJI_POOL, seed);
  const symbols = pool.slice(0, pairs);
  const [deck] = shuffle([...symbols, ...symbols], state);
  return {
    level,
    cards: deck.map((symbol) => ({ symbol, matched: false })),
    flipped: [],
    moves: 0,
  };
}

/**
 * Turns a card face up. Two face-up cards count as one move; a matching pair
 * stays face up for good, a mismatch stays face up until `hideMismatch`.
 */
export function flipCard(game: MemoryGame, index: number): MemoryGame {
  const card = game.cards[index];
  if (!card || card.matched || game.flipped.includes(index)) return game;
  if (game.flipped.length === 2) return game;

  const flipped = [...game.flipped, index];
  if (flipped.length < 2) return { ...game, flipped };

  const moves = game.moves + 1;
  const [first, second] = flipped;
  if (game.cards[first].symbol !== game.cards[second].symbol) {
    return { ...game, flipped, moves };
  }

  const cards = game.cards.map((c, i) =>
    flipped.includes(i) ? { ...c, matched: true } : c,
  );
  return { ...game, cards, flipped: [], moves };
}

/** Turns back the two mismatched cards once the player has seen them. */
export function hideMismatch(game: MemoryGame): MemoryGame {
  if (game.flipped.length !== 2) return game;
  return { ...game, flipped: [] };
}

export function isWon(game: MemoryGame): boolean {
  return game.cards.every((card) => card.matched);
}

export function matchedPairs(game: MemoryGame): number {
  return game.cards.filter((card) => card.matched).length / 2;
}
