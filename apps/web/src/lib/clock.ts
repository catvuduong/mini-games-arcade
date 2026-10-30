/** Wall-clock time in milliseconds. Read it only from event handlers and effects, never during render. */
export function currentTime(): number {
  return Date.now();
}
