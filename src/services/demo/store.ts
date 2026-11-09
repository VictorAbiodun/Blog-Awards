import { createSeedState, type DemoState } from "./seed";

const KEY = "blogaward.demo.v1";
export const DEMO_CHANGE_EVENT = "blogaward:demo-change";

let memoryState: DemoState | null = null;

function hasStorage(): boolean {
  try {
    return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
  } catch {
    return false;
  }
}

export function readState(): DemoState {
  if (hasStorage()) {
    try {
      const raw = window.localStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as DemoState;
        if (parsed.version === 1) return parsed;
      }
    } catch {
      // Corrupt data: fall through and start again from the seed.
    }
    const fresh = createSeedState();
    window.localStorage.setItem(KEY, JSON.stringify(fresh));
    return fresh;
  }
  memoryState ??= createSeedState();
  return memoryState;
}

export function writeState(state: DemoState): void {
  if (hasStorage()) {
    window.localStorage.setItem(KEY, JSON.stringify(state));
    window.dispatchEvent(new Event(DEMO_CHANGE_EVENT));
  } else {
    memoryState = state;
  }
}

/** Reads the state, lets `change` modify it, saves it, and returns what `change` returns. */
export function mutate<T>(change: (state: DemoState) => T): T {
  const state = readState();
  const result = change(state);
  writeState(state);
  return result;
}

export function resetDemoData(): void {
  memoryState = null;
  if (hasStorage()) {
    window.localStorage.removeItem(KEY);
    window.dispatchEvent(new Event(DEMO_CHANGE_EVENT));
  }
}

export function newId(prefix: string): string {
  const random =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10);
  return `${prefix}-${random}`;
}
