export interface History<T> {
  past: T[];
  present: T;
  future: T[];
}

export const HISTORY_LIMIT = 50;

export function createHistory<T>(present: T): History<T> {
  return { past: [], present, future: [] };
}

export function push<T>(h: History<T>, next: T, limit: number = HISTORY_LIMIT): History<T> {
  const past = [...h.past, h.present];
  return { past: past.slice(Math.max(0, past.length - limit)), present: next, future: [] };
}

export function undo<T>(h: History<T>): History<T> {
  if (h.past.length === 0) return h;
  return {
    past: h.past.slice(0, -1),
    present: h.past[h.past.length - 1],
    future: [h.present, ...h.future],
  };
}

export function redo<T>(h: History<T>): History<T> {
  if (h.future.length === 0) return h;
  return { past: [...h.past, h.present], present: h.future[0], future: h.future.slice(1) };
}
