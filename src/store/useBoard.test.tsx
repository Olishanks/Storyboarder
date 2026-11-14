import { act, renderHook, waitFor } from '@testing-library/react';
import { useBoard, type BoardStorage } from './useBoard';
import { updateBoard } from '../model/ops';
import { testBoard } from '../model/testing';
import type { Board } from '../model/types';

function memoryStorage(initial: Board, opts: { failSaves?: boolean } = {}) {
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

async function loaded(storage: BoardStorage) {
  const hook = renderHook(() => useBoard('b1', storage));
  await waitFor(() => expect(hook.result.current.loading).toBe(false));
  return hook;
}

const rename = (title: string) => (b: Board) => updateBoard(b, { title });

test('loads the board', async () => {
  const { storage } = memoryStorage(testBoard());
  const { result } = await loaded(storage);
  expect(result.current.board?.title).toBe('Test board');
  expect(result.current.canUndo).toBe(false);
});

test('a board that does not exist loads as null', async () => {
  const { result } = await loaded({ loadBoard: async () => undefined, saveBoard: async () => {} });
  expect(result.current.board).toBeNull();
});

test('apply updates the board at once and saves shortly after', async () => {
  const { storage, state } = memoryStorage(testBoard());
  const { result } = await loaded(storage);
  act(() => result.current.apply(rename('Renamed')));
  expect(result.current.board?.title).toBe('Renamed');
  expect(state.saved).toHaveLength(0);
  await waitFor(() => expect(state.saved.at(-1)?.title).toBe('Renamed'), { timeout: 2000 });
});

test('undo restores the previous board and saves it; redo reapplies', async () => {
  const { storage, state } = memoryStorage(testBoard());
  const { result } = await loaded(storage);
  act(() => result.current.apply(rename('Renamed')));
  act(() => result.current.undo());
  expect(result.current.board?.title).toBe('Test board');
  expect(result.current.canRedo).toBe(true);
  await waitFor(() => expect(state.saved.at(-1)?.title).toBe('Test board'), { timeout: 2000 });
  act(() => result.current.redo());
  expect(result.current.board?.title).toBe('Renamed');
});

test('applies sharing a coalesce key make one undo step', async () => {
  const { storage } = memoryStorage(testBoard());
  const { result } = await loaded(storage);
  act(() => result.current.apply(rename('A'), 'title'));
  act(() => result.current.apply(rename('AB'), 'title'));
  act(() => result.current.apply(rename('ABC'), 'title'));
  act(() => result.current.undo());
  expect(result.current.board?.title).toBe('Test board');
});

test('a rejected save sets saveError and keeps the board in memory', async () => {
  const { storage, state } = memoryStorage(testBoard(), { failSaves: true });
  const { result } = await loaded(storage);
  act(() => result.current.apply(rename('Renamed')));
  await waitFor(() => expect(result.current.saveError).toBe(true), { timeout: 2000 });
  expect(result.current.board?.title).toBe('Renamed');
  state.failSaves = false;
  act(() => result.current.apply(rename('Again')));
  await waitFor(() => expect(result.current.saveError).toBe(false), { timeout: 2000 });
});

test('unmount flushes a pending save', async () => {
  const { storage, state } = memoryStorage(testBoard());
  const { result, unmount } = await loaded(storage);
  act(() => result.current.apply(rename('Renamed')));
  unmount();
  expect(state.saved.at(-1)?.title).toBe('Renamed');
});

test('a storage failure while opening is reported as a load error, not a missing board', async () => {
  const { result } = await loaded({
    loadBoard: async () => {
      throw new Error('blocked');
    },
    saveBoard: async () => {},
  });
  expect(result.current.board).toBeNull();
  expect(result.current.loadError).toBe(true);
});

test('flush saves a pending change immediately', async () => {
  const { storage, state } = memoryStorage(testBoard());
  const { result } = await loaded(storage);
  act(() => result.current.apply(rename('Renamed')));
  act(() => result.current.flush());
  expect(state.saved.at(-1)?.title).toBe('Renamed');
});

test('a coalesce key with an unlimited window keeps merging however long the gap', async () => {
  const { storage } = memoryStorage(testBoard());
  const { result } = await loaded(storage);
  const realNow = Date.now;
  let now = realNow();
  Date.now = () => now;
  try {
    act(() => result.current.apply(rename('A'), 'sketch', Infinity));
    now += 60_000;
    act(() => result.current.apply(rename('AB'), 'sketch', Infinity));
    act(() => result.current.undo());
    expect(result.current.board?.title).toBe('Test board');
  } finally {
    Date.now = realNow;
  }
});
