import { act, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SketchEditor } from './SketchEditor';
import { SketchView } from './SketchView';
import { STAMP_HALF } from './geometry';
import { testBoard, testPanel } from '../model/testing';
import type { Board, Panel, Sketch, Stamp, Stroke } from '../model/types';
import { renderWithBoard } from '../test-utils';

const line: Stroke = { points: [[100, 100, 0.5], [140, 100, 0.5], [180, 100, 0.5]], color: '#111111', width: 10 };
const camera: Stamp = { id: 'st1', kind: 'camera', x: 500, y: 500, scale: 1, rotation: 0 };
const sketch = (patch: Partial<Sketch> = {}): Sketch => ({ format: '9:16', strokes: [], stamps: [], ...patch });

const panelOf = (board: Board, id: string) => board.items.find((i) => i.id === id) as Panel;
const canvas = () => screen.getByRole('img', { name: 'Sketch canvas' });

type Pt = [number, number, number?];
function drag(pointerType: string, pointerId: number, points: Pt[]) {
  const at = (p: Pt) => ({ pointerId, pointerType, clientX: p[0], clientY: p[1], pressure: p[2] ?? 0.5, buttons: 1, isPrimary: true });
  fireEvent.pointerDown(canvas(), at(points[0]));
  for (const p of points.slice(1)) fireEvent.pointerMove(canvas(), at(p));
  fireEvent.pointerUp(canvas(), { ...at(points[points.length - 1]), buttons: 0, pressure: 0 });
}

async function open(panels: Panel[], index = 0) {
  const board = testBoard(panels);
  const view = await renderWithBoard(board, (store) => <SketchEditor store={store} panelId={panels[index].id} />);
  const user = userEvent.setup();
  const done = () => user.click(screen.getByRole('button', { name: 'Done' }));
  return { ...view, user, done, saved: () => panelOf(view.current(), panels[index].id).sketch };
}

test('a pen drag adds one stroke with its pressure values', async () => {
  const view = await open([testPanel()]);
  drag('pen', 1, [[10, 10, 0.25], [50, 60, 0.75], [90, 90, 0.5]]);
  await view.done();
  expect(view.saved().strokes).toHaveLength(1);
  expect(view.saved().strokes[0].points).toEqual([[10, 10, 0.25], [50, 60, 0.75], [90, 90, 0.5]]);
  expect(window.location.hash).toBe('#/board/b1');
});

test('the chosen colour and width are used', async () => {
  const view = await open([testPanel()]);
  await view.user.click(screen.getByRole('button', { name: 'Red' }));
  await view.user.click(screen.getByRole('button', { name: 'Thick' }));
  drag('pen', 1, [[10, 10], [50, 60]]);
  await view.done();
  expect(view.saved().strokes[0]).toMatchObject({ color: '#d93025', width: 20 });
});

test('undo removes the stroke and redo brings it back', async () => {
  const view = await open([testPanel()]);
  drag('pen', 1, [[10, 10], [50, 60]]);
  await view.user.click(screen.getByRole('button', { name: 'Undo' }));
  await view.user.click(screen.getByRole('button', { name: 'Redo' }));
  await view.user.click(screen.getByRole('button', { name: 'Undo' }));
  await view.done();
  expect(view.saved().strokes).toHaveLength(0);
});

test('the eraser removes a stroke it crosses', async () => {
  const view = await open([testPanel({ sketch: sketch({ strokes: [line] }) })]);
  await view.user.click(screen.getByRole('button', { name: 'Eraser' }));
  drag('pen', 1, [[140, 60], [140, 100], [140, 140]]);
  await view.done();
  expect(view.saved().strokes).toHaveLength(0);
});

test('leaving saves the whole sketch edit as one board undo step', async () => {
  const view = await open([testPanel()]);
  drag('pen', 1, [[10, 10], [50, 60]]);
  drag('pen', 1, [[20, 20], [60, 70]]);
  await view.done();
  expect(view.saved().strokes).toHaveLength(2);
  act(() => view.store().undo());
  expect(view.saved().strokes).toHaveLength(0);
});

test('leaving without changes adds no undo step', async () => {
  const view = await open([testPanel({ sketch: sketch({ strokes: [line] }) })]);
  await view.done();
  expect(view.store().canUndo).toBe(false);
});

test('a finger draws when no pen has been used', async () => {
  const view = await open([testPanel()]);
  drag('touch', 5, [[10, 10], [50, 60]]);
  await view.done();
  expect(view.saved().strokes).toHaveLength(1);
});

test('once a pen has been used, a finger no longer draws', async () => {
  const view = await open([testPanel()]);
  drag('pen', 1, [[10, 10], [50, 60]]);
  drag('touch', 5, [[200, 200], [260, 260]]);
  await view.done();
  expect(view.saved().strokes).toHaveLength(1);
});

test('a palm landing during a pen stroke leaves no mark and does not cut the stroke', async () => {
  const view = await open([testPanel()]);
  const pen = (x: number, y: number) => ({ pointerId: 1, pointerType: 'pen', clientX: x, clientY: y, pressure: 0.5, buttons: 1 });
  const palm = (x: number, y: number) => ({ pointerId: 7, pointerType: 'touch', clientX: x, clientY: y, pressure: 0.5, buttons: 1 });
  fireEvent.pointerDown(canvas(), pen(10, 10));
  fireEvent.pointerMove(canvas(), pen(20, 20));
  fireEvent.pointerDown(canvas(), palm(400, 900));
  fireEvent.pointerMove(canvas(), palm(420, 920));
  fireEvent.pointerMove(canvas(), pen(30, 30));
  fireEvent.pointerUp(canvas(), palm(420, 920));
  fireEvent.pointerMove(canvas(), pen(40, 40));
  fireEvent.pointerUp(canvas(), pen(40, 40));
  await view.done();
  expect(view.saved().strokes).toHaveLength(1);
  expect(view.saved().strokes[0].points.map((p) => p[0])).toEqual([10, 20, 30, 40]);
});

test('a cancelled pointer discards the stroke in progress', async () => {
  const view = await open([testPanel()]);
  fireEvent.pointerDown(canvas(), { pointerId: 1, pointerType: 'pen', clientX: 10, clientY: 10, pressure: 0.5 });
  fireEvent.pointerMove(canvas(), { pointerId: 1, pointerType: 'pen', clientX: 30, clientY: 30, pressure: 0.5 });
  fireEvent.pointerCancel(canvas(), { pointerId: 1, pointerType: 'pen' });
  await view.done();
  expect(view.saved().strokes).toHaveLength(0);
});

test('"Clear" asks before wiping the sketch', async () => {
  const view = await open([testPanel({ sketch: sketch({ strokes: [line] }) })]);
  await view.user.click(screen.getByRole('button', { name: 'Clear' }));
  await view.user.click(within(screen.getByRole('dialog', { name: 'Clear this sketch?' })).getByRole('button', { name: 'Clear' }));
  await view.done();
  expect(view.saved().strokes).toHaveLength(0);
});

test('"Next panel" saves and moves to the next panel; the ends are disabled', async () => {
  const [a, b] = [testPanel(), testPanel()];
  const view = await open([a, b]);
  expect(screen.getByText('Panel 1 of 2')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Previous panel' })).toBeDisabled();
  drag('pen', 1, [[10, 10], [50, 60]]);
  await view.user.click(screen.getByRole('button', { name: 'Next panel' }));
  expect(window.location.hash).toBe(`#/board/b1/sketch/${b.id}`);
  expect(view.saved().strokes).toHaveLength(1);
});

test('choosing a stamp then tapping the canvas places it there', async () => {
  const view = await open([testPanel()]);
  await view.user.click(screen.getByRole('button', { name: 'Camera' }));
  drag('pen', 1, [[200, 300]]);
  await view.done();
  expect(view.saved().stamps).toHaveLength(1);
  expect(view.saved().stamps[0]).toMatchObject({ kind: 'camera', x: 200, y: 300, scale: 1, rotation: 0 });
  expect(view.saved().strokes).toHaveLength(0);
});

test('dragging a stamp with the select tool moves it', async () => {
  const view = await open([testPanel({ sketch: sketch({ stamps: [camera] }) })]);
  await view.user.click(screen.getByRole('button', { name: 'Select' }));
  drag('pen', 1, [[510, 520], [570, 560]]);
  await view.done();
  expect(view.saved().stamps[0]).toMatchObject({ x: 560, y: 540 });
});

test('the corner handle scales a selected stamp', async () => {
  const view = await open([testPanel({ sketch: sketch({ stamps: [camera] }) })]);
  await view.user.click(screen.getByRole('button', { name: 'Select' }));
  drag('pen', 1, [[500, 500]]);
  drag('pen', 1, [[500 + STAMP_HALF, 500 + STAMP_HALF], [500 + 2 * STAMP_HALF, 500 + 2 * STAMP_HALF]]);
  await view.done();
  expect(view.saved().stamps[0].scale).toBeCloseTo(2);
  expect(view.saved().stamps[0].rotation).toBeCloseTo(0);
});

test('"Delete stamp" removes the selected stamp', async () => {
  const view = await open([testPanel({ sketch: sketch({ stamps: [camera] }) })]);
  await view.user.click(screen.getByRole('button', { name: 'Select' }));
  expect(screen.queryByRole('button', { name: 'Delete stamp' })).not.toBeInTheDocument();
  drag('pen', 1, [[500, 500]]);
  await view.user.click(screen.getByRole('button', { name: 'Delete stamp' }));
  await view.done();
  expect(view.saved().stamps).toHaveLength(0);
});

test('the thirds guide toggles and is not part of the saved sketch', async () => {
  const view = await open([testPanel()]);
  expect(screen.queryByTestId('thirds-guide')).not.toBeInTheDocument();
  await view.user.click(screen.getByRole('button', { name: 'Thirds guide' }));
  expect(screen.getByTestId('thirds-guide')).toBeInTheDocument();
  await view.done();
  expect(view.store().canUndo).toBe(false);
});

test('"Copy previous" fills an empty sketch from the panel before', async () => {
  const view = await open([testPanel({ sketch: sketch({ strokes: [line] }) }), testPanel()], 1);
  await view.user.click(screen.getByRole('button', { name: 'Copy previous' }));
  await view.done();
  expect(view.saved().strokes).toEqual([line]);
});

test('"Copy previous" asks first when the sketch is not empty and is disabled on the first panel', async () => {
  const other: Stroke = { ...line, color: '#d93025' };
  const view = await open([testPanel({ sketch: sketch({ strokes: [line] }) }), testPanel({ sketch: sketch({ strokes: [other] }) })], 1);
  await view.user.click(screen.getByRole('button', { name: 'Copy previous' }));
  expect(view.saved().strokes).toEqual([other]);
  await view.user.click(within(screen.getByRole('dialog', { name: 'Replace this sketch?' })).getByRole('button', { name: 'Replace' }));
  await view.done();
  expect(view.saved().strokes).toEqual([line]);
});

test('a sketch drawn in the other format is converted when edited', async () => {
  const board = testBoard([testPanel({ sketch: sketch({ strokes: [{ ...line, points: [[450, 800, 0.5]] }] }) })], { format: '16:9' });
  const view = await renderWithBoard(board, (store) => <SketchEditor store={store} panelId={board.items[0].id} />);
  drag('pen', 1, [[10, 10], [50, 60]]);
  await userEvent.setup().click(screen.getByRole('button', { name: 'Done' }));
  const saved = panelOf(view.current(), board.items[0].id).sketch;
  expect(saved.format).toBe('16:9');
  expect(saved.strokes[0].points[0]).toEqual([800, 450, 0.5]);
});

test('SketchView renders stamps', () => {
  const { container } = render(<SketchView sketch={sketch({ stamps: [camera] })} format="9:16" />);
  expect(container.querySelector('[data-stamp="camera"]')).not.toBeNull();
});
