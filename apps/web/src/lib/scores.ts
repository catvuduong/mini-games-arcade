import type { Difficulty } from "./games/minesweeper";
import type { MemoryLevel } from "./games/memory";
import { readItem, useStoredItem, writeItem } from "./storage";

export const BEST_2048_KEY = "arcade:best:2048";
export const DEMO_SEEDED_KEY = "arcade:demo-seeded";

export function memoryBestKey(level: MemoryLevel): string {
  return `arcade:best:memory:${level}`;
}

export function minesweeperBestKey(difficulty: Difficulty): string {
  return `arcade:best:minesweeper:${difficulty}`;
}

/** Personal best for a key, or null when none has been recorded yet. */
export function useBest(key: string): number | null {
  const raw = useStoredItem(key);
  if (raw === null) return null;
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}

/**
 * Saves `value` if it beats the stored best. For moves and times lower wins;
 * for scores higher wins.
 */
export function recordBest(key: string, value: number, lowerIsBetter: boolean): void {
  const raw = readItem(key);
  const stored = raw === null ? Number.NaN : Number(raw);
  const better = lowerIsBetter ? value < stored : value > stored;
  if (!Number.isFinite(stored) || better) writeItem(key, String(value));
}

/** Fills empty best-score slots with sample values the first time the arcade loads, so the home screen shows personal bests. */
export function seedDemoScores(): void {
  if (readItem(DEMO_SEEDED_KEY) !== null) return;
  const demo: Record<string, number> = {
    [memoryBestKey("4x4")]: 9,
    [memoryBestKey("4x5")]: 14,
    [memoryBestKey("6x6")]: 27,
    [BEST_2048_KEY]: 4820,
    [minesweeperBestKey("beginner")]: 17,
    [minesweeperBestKey("intermediate")]: 58,
    [minesweeperBestKey("expert")]: 214,
  };
  for (const [key, value] of Object.entries(demo)) {
    if (readItem(key) === null) writeItem(key, String(value));
  }
  writeItem(DEMO_SEEDED_KEY, "1");
}
