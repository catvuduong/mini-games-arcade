import { describe, expect, it } from "vitest";
import { nextRandom, parseSeed, shuffle } from "./random";

describe("seeded random", () => {
  it("produces the same sequence from the same state", () => {
    const a = nextRandom(1);
    const b = nextRandom(1);
    expect(a).toEqual(b);
    expect(a[0]).toBeGreaterThanOrEqual(0);
    expect(a[0]).toBeLessThan(1);
  });

  it("shuffles into a permutation of the same items", () => {
    const items = ["a", "b", "c", "d", "e", "f"];
    const [shuffled] = shuffle(items, 99);
    expect([...shuffled].sort()).toEqual([...items].sort());
    expect(shuffle(items, 99)[0]).toEqual(shuffled);
  });

  it("reads numeric seeds as-is and hashes other text to a stable seed", () => {
    expect(parseSeed("1")).toBe(1);
    expect(parseSeed(null)).toBeUndefined();
    expect(parseSeed("arcade")).toBe(parseSeed("arcade"));
    expect(parseSeed("arcade")).not.toBe(parseSeed("arcades"));
  });
});
