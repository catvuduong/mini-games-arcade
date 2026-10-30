/**
 * Seeded pseudo-random helpers (mulberry32). Every function takes the current
 * generator state and returns the next state, so game logic stays pure and the
 * same seed always produces the same board.
 */

const UINT32_RANGE = 0x1_0000_0000;

/** Returns a float in [0, 1) and the next generator state. */
export function nextRandom(state: number): [number, number] {
  const next = (state + 0x6d2b79f5) | 0;
  let t = Math.imul(next ^ (next >>> 15), next | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return [((t ^ (t >>> 14)) >>> 0) / UINT32_RANGE, next];
}

/** Returns an integer in [0, max) and the next generator state. */
export function nextInt(state: number, max: number): [number, number] {
  const [value, next] = nextRandom(state);
  return [Math.floor(value * max), next];
}

/** Fisher-Yates shuffle that returns a new array and the next generator state. */
export function shuffle<T>(items: readonly T[], state: number): [T[], number] {
  const result = [...items];
  let current = state;
  for (let i = result.length - 1; i > 0; i--) {
    const [j, next] = nextInt(current, i + 1);
    current = next;
    [result[i], result[j]] = [result[j], result[i]];
  }
  return [result, current];
}

/**
 * Turns the `seed` query parameter into a generator state. Numbers are used as
 * they are; any other text is hashed (FNV-1a) so every string gives a stable seed.
 */
export function parseSeed(raw: string | null): number | undefined {
  if (!raw) return undefined;
  if (/^\d+$/.test(raw)) return Number(raw) >>> 0;
  let hash = 0x811c9dc5;
  for (const ch of raw) {
    hash ^= ch.charCodeAt(0);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/** A fresh seed for games that are not pinned by the URL. */
export function randomSeed(): number {
  return Math.floor(Math.random() * UINT32_RANGE);
}
