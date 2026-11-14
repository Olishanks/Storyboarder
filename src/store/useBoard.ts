import { useCallback, useEffect, useRef, useState } from 'react';
import { createHistory, push, redo as redoHistory, undo as undoHistory, type History } from '../model/history';
import type { Board } from '../model/types';
import * as db from './db';

export interface BoardStorage {
  loadBoard(id: string): Promise<Board | undefined>;
  saveBoard(board: Board): Promise<void>;
}

export interface BoardStore {
  board: Board | null;
  loading: boolean;
  /** The storage on this device could not be read. Different from a board that does not exist. */
  loadError: boolean;
  saveError: boolean;
  /**
   * Applies an edit. Edits sharing a `coalesceKey` within `coalesceWindowMs` of each other
   * become one undo step.
   */
  apply(op: (board: Board) => Board, coalesceKey?: string, coalesceWindowMs?: number): void;
  /** Writes any pending change to storage now. */
  flush(): void;
  undo(): void;
  redo(): void;
  canUndo: boolean;
  canRedo: boolean;
}

export const SAVE_DELAY_MS = 400;
const COALESCE_WINDOW_MS = 1500;

export function useBoard(id: string, storage: BoardStorage = db): BoardStore {
  const [history, setHistory] = useState<History<Board> | null>(null);
  const [loading, setLoading] = useState(true);
  const [saveError, setSaveError] = useState(false);
  const [loadError, setLoadError] = useState(false);

  const historyRef = useRef<History<Board> | null>(null);
  const pending = useRef<Board | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastCoalesce = useRef<{ key: string; at: number } | null>(null);
  const mounted = useRef(true);

  const flush = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    const board = pending.current;
    if (!board) return;
    pending.current = null;
    storage.saveBoard(board).then(
      () => mounted.current && setSaveError(false),
      () => {
        if (!pending.current) pending.current = board;
        if (mounted.current) setSaveError(true);
      },
    );
  }, [storage]);

  const commit = useCallback(
    (next: History<Board>) => {
      historyRef.current = next;
      setHistory(next);
      pending.current = next.present;
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(flush, SAVE_DELAY_MS);
    },
    [flush],
  );

  useEffect(() => {
    mounted.current = true;
    let cancelled = false;
    setLoading(true);
    setLoadError(false);
    historyRef.current = null;
    setHistory(null);
    storage.loadBoard(id).then(
      (board) => {
        if (cancelled) return;
        historyRef.current = board ? createHistory(board) : null;
        setHistory(historyRef.current);
        setLoading(false);
      },
      () => {
        if (cancelled) return;
        setLoadError(true);
        setLoading(false);
      },
    );
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') flush();
    };
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', flush);
    return () => {
      cancelled = true;
      mounted.current = false;
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', flush);
      flush();
    };
  }, [id, storage, flush]);

  const apply = useCallback(
    (op: (board: Board) => Board, coalesceKey?: string, coalesceWindowMs: number = COALESCE_WINDOW_MS) => {
      const current = historyRef.current;
      if (!current) return;
      const next = op(current.present);
      if (next === current.present) return;
      const now = Date.now();
      const last = lastCoalesce.current;
      const merge =
        coalesceKey !== undefined && last?.key === coalesceKey && now - last.at < coalesceWindowMs && current.past.length > 0;
      lastCoalesce.current = coalesceKey !== undefined ? { key: coalesceKey, at: now } : null;
      commit(merge ? { ...current, present: next, future: [] } : push(current, next));
    },
    [commit],
  );

  const undo = useCallback(() => {
    const current = historyRef.current;
    if (!current || current.past.length === 0) return;
    lastCoalesce.current = null;
    commit(undoHistory(current));
  }, [commit]);

  const redo = useCallback(() => {
    const current = historyRef.current;
    if (!current || current.future.length === 0) return;
    lastCoalesce.current = null;
    commit(redoHistory(current));
  }, [commit]);

  return {
    board: history?.present ?? null,
    loading,
    loadError,
    saveError,
    apply,
    flush,
    undo,
    redo,
    canUndo: (history?.past.length ?? 0) > 0,
    canRedo: (history?.future.length ?? 0) > 0,
  };
}
