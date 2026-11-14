import { render, screen } from '@testing-library/react';
import type { ReactElement } from 'react';
import type { Board } from './model/types';
import { useBoard, type BoardStorage, type BoardStore } from './store/useBoard';

export function memoryStorage(initial: Board | undefined, opts: { failSaves?: boolean } = {}) {
  const state = { saved: [] as Board[], failSaves: opts.failSaves ?? false };
  const storage: BoardStorage = {
    loadBoard: async () => initial,
    saveBoard: async (board) => {
      if (state.failSaves) throw new Error('quota');
      state.saved.push(board);
    },
  };
  return { state, storage };
}

/** Renders a screen against a real board store backed by in-memory storage. */
export async function renderWithBoard(
  board: Board,
  ui: (store: BoardStore) => ReactElement,
  opts: { failSaves?: boolean } = {},
) {
  const memory = memoryStorage(board, opts);
  const latest: { store: BoardStore | null } = { store: null };
  function Harness() {
    const store = useBoard(board.id, memory.storage);
    latest.store = store;
    if (!store.board) return <p>loading</p>;
    return ui(store);
  }
  const view = render(<Harness />);
  await screen.findByRole('main');
  return { ...view, memory, current: () => latest.store!.board!, store: () => latest.store! };
}
