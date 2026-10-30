import { useSyncExternalStore } from "react";

const listeners = new Set<() => void>();

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

const subscribeNever = () => () => {};

/** Reads a value from localStorage. Returns null when storage is blocked or missing. */
export function readItem(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

/** Writes a value to localStorage and tells every mounted component about it. */
export function writeItem(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Storage is full or blocked (private mode): the game still works, nothing is saved.
  }
  listeners.forEach((listener) => listener());
}

/** Live value of a localStorage key. Renders as null on the server and during hydration. */
export function useStoredItem(key: string): string | null {
  return useSyncExternalStore(
    subscribe,
    () => readItem(key),
    () => null,
  );
}

/** False on the server and during hydration, true once the client has mounted. */
export function useMounted(): boolean {
  return useSyncExternalStore(
    subscribeNever,
    () => true,
    () => false,
  );
}
