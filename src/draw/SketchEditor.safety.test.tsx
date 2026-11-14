import { fireEvent, screen, waitFor } from '@testing-library/react';
import { SketchEditor } from './SketchEditor';
import { createPointerPolicy } from './pointerPolicy';
import { testBoard, testPanel } from '../model/testing';
import type { Board, Panel } from '../model/types';
import { renderWithBoard } from '../test-utils';

const canvas = () => screen.getByRole('img', { name: 'Sketch canvas' });
const at = (pointerType: string, pointerId: number, x: number, y: number) => ({ pointerId, pointerType, clientX: x, clientY: y, pressure: 0.5, buttons: 1 });
const strokesIn = (board: Board | undefined) => (board?.items[0] as Panel | undefined)?.sketch.strokes ?? [];

function penStroke() {
  fireEvent.pointerDown(canvas(), at('pen', 1, 10, 10));
  fireEvent.pointerMove(canvas(), at('pen', 1, 50, 60));
  fireEvent.pointerUp(canvas(), at('pen', 1, 50, 60));
}

async function open() {
  const board = testBoard([testPanel()]);
  return renderWithBoard(board, (store) => <SketchEditor store={store} panelId={board.items[0].id} />);
}

function setVisibility(state: 'hidden' | 'visible') {
  Object.defineProperty(document, 'visibilityState', { value: state, configurable: true });
  fireEvent(document, new Event('visibilitychange'));
}

afterEach(() => {
  Reflect.deleteProperty(document, 'visibilityState');
});

test('a sketch is written to storage shortly after drawing, without leaving the screen', async () => {
  const view = await open();
  penStroke();
  await waitFor(() => expect(strokesIn(view.memory.state.saved.at(-1))).toHaveLength(1), { timeout: 4000 });
});

test('a sketch is written to storage at once when the app goes to the background', async () => {
  const view = await open();
  penStroke();
  setVisibility('hidden');
  expect(strokesIn(view.memory.state.saved.at(-1))).toHaveLength(1);
});

test('autosaves while sketching still add up to one board undo step', async () => {
  const view = await open();
  penStroke();
  setVisibility('hidden');
  setVisibility('visible');
  penStroke();
  setVisibility('hidden');
  expect(strokesIn(view.current())).toHaveLength(2);
  fireEvent.click(screen.getByRole('button', { name: 'Done' }));
  expect(view.store().canUndo).toBe(true);
  view.store().undo();
  await waitFor(() => expect(strokesIn(view.current())).toHaveLength(0));
});

test('a resting palm on a freshly opened sketch is ignored once a pen has ever been used', async () => {
  createPointerPolicy().down({ pointerId: 1, pointerType: 'pen' });
  const view = await open();
  fireEvent.pointerDown(canvas(), at('touch', 7, 400, 900));
  fireEvent.pointerMove(canvas(), at('touch', 7, 420, 920));
  penStroke();
  fireEvent.pointerUp(canvas(), at('touch', 7, 420, 920));
  fireEvent.click(screen.getByRole('button', { name: 'Done' }));
  expect(strokesIn(view.current())).toHaveLength(1);
  expect(strokesIn(view.current())[0].points.map((p) => p[0])).toEqual([10, 50]);
});

test('the very first pen stroke takes over from a palm that landed before it', async () => {
  const view = await open();
  fireEvent.pointerDown(canvas(), at('touch', 7, 400, 900));
  fireEvent.pointerMove(canvas(), at('touch', 7, 420, 920));
  penStroke();
  fireEvent.pointerMove(canvas(), at('touch', 7, 440, 940));
  fireEvent.pointerUp(canvas(), at('touch', 7, 440, 940));
  fireEvent.click(screen.getByRole('button', { name: 'Done' }));
  expect(strokesIn(view.current())).toHaveLength(1);
  expect(strokesIn(view.current())[0].points.map((p) => p[0])).toEqual([10, 50]);
});
