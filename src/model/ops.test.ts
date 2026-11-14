import {
  appendScript,
  assignSetup,
  copySketchFromPrevious,
  deleteItem,
  duplicatePanel,
  endDropId,
  insertPanel,
  insertSection,
  mergeWithPrevious,
  moveItem,
  moveSection,
  newBoard,
  reorderByDrop,
  resetFilmed,
  SETUP_COLORS,
  splitPanel,
  updateBoard,
  updatePanel,
  updateSection,
} from './ops';
import { deepFreeze, testBoard, testPanel, testSection } from './testing';
import type { Panel, Stroke } from './types';

const stroke: Stroke = { points: [[1, 2, 0.5]], color: '#111111', width: 10 };
const panels = (b: { items: { type: string }[] }) => b.items.filter((i): i is Panel => i.type === 'panel');

test('newBoard defaults: 150 wpm; panelsPerRow 3 for 9:16 and 2 for 16:9', () => {
  const v = newBoard('V', '9:16');
  const h = newBoard('H', '16:9');
  expect(v.wordsPerMinute).toBe(150);
  expect(v.panelsPerRow).toBe(3);
  expect(h.panelsPerRow).toBe(2);
  expect(v.items).toEqual([]);
  expect(v.id).not.toBe(h.id);
  expect(v.version).toBe(1);
});

test('insertPanel at index 1 of three items puts it second, with a sketch in the board format', () => {
  const board = testBoard([testPanel(), testPanel(), testPanel()], { format: '16:9' });
  const next = insertPanel(board, 1, { says: 'new' });
  expect(next.items).toHaveLength(4);
  expect((next.items[1] as Panel).says).toBe('new');
  expect((next.items[1] as Panel).sketch.format).toBe('16:9');
});

test('insertSection adds a heading at the index', () => {
  const next = insertSection(testBoard([testPanel()]), 0, 'Hook');
  expect(next.items[0]).toMatchObject({ type: 'section', title: 'Hook', collapsed: false });
});

test('updatePanel and updateSection patch only the named item', () => {
  const a = testPanel();
  const s = testSection();
  const board = testBoard([s, a]);
  expect((updatePanel(board, a.id, { notes: 'n' }).items[1] as Panel).notes).toBe('n');
  expect(updateSection(board, s.id, { collapsed: true }).items[0]).toMatchObject({ collapsed: true });
});

test('deleteItem on a section leaves its panels in place', () => {
  const s = testSection();
  const a = testPanel();
  const next = deleteItem(testBoard([s, a]), s.id);
  expect(next.items.map((i) => i.id)).toEqual([a.id]);
});

test('duplicatePanel copies says, setup and sketch, gives a new id, clears filmed', () => {
  const a = testPanel({ says: 'hi', setupId: 'x', filmed: true, sketch: { format: '9:16', strokes: [stroke], stamps: [] } });
  const b = testPanel();
  const next = duplicatePanel(testBoard([a, b]), a.id);
  const copy = next.items[1] as Panel;
  expect(next.items).toHaveLength(3);
  expect(copy.id).not.toBe(a.id);
  expect(copy).toMatchObject({ says: 'hi', setupId: 'x', filmed: false });
  expect(copy.sketch.strokes).toEqual([stroke]);
});

test('splitPanel divides the text at the cursor', () => {
  const a = testPanel({
    says: 'Hello world again',
    setupId: 'x',
    durationOverride: 9,
    sketch: { format: '9:16', strokes: [stroke], stamps: [] },
  });
  const next = splitPanel(testBoard([a]), a.id, 6);
  const [first, second] = panels(next);
  expect(first.says).toBe('Hello');
  expect(second.says).toBe('world again');
  expect(second.setupId).toBe('x');
  expect(first.sketch.strokes).toEqual([stroke]);
  expect(second.sketch.strokes).toEqual([]);
  expect(first.durationOverride).toBeNull();
  expect(second.durationOverride).toBeNull();
  expect(second.id).not.toBe(first.id);
});

test('mergeWithPrevious joins text with a space, keeps the first sketch, removes the second', () => {
  const a = testPanel({ says: 'One', sketch: { format: '9:16', strokes: [stroke], stamps: [] } });
  const b = testPanel({ says: 'two', notes: 'note' });
  const next = mergeWithPrevious(testBoard([a, b]), b.id);
  expect(next.items).toHaveLength(1);
  expect(next.items[0]).toMatchObject({ id: a.id, says: 'One two', notes: 'note' });
  expect((next.items[0] as Panel).sketch.strokes).toEqual([stroke]);
});

test('mergeWithPrevious is a no-op when the previous item is not a panel', () => {
  const s = testSection();
  const b = testPanel({ says: 'two' });
  const board = testBoard([s, b]);
  expect(mergeWithPrevious(board, b.id).items).toEqual(board.items);
});

test('moveItem moves a panel to a new index', () => {
  const [a, b, c] = [testPanel(), testPanel(), testPanel()];
  expect(moveItem(testBoard([a, b, c]), a.id, 2).items.map((i) => i.id)).toEqual([b.id, c.id, a.id]);
  expect(moveItem(testBoard([a, b, c]), c.id, 0).items.map((i) => i.id)).toEqual([c.id, a.id, b.id]);
});

test('moveSection moves the heading and every panel up to the next heading', () => {
  const s1 = testSection();
  const a = testPanel();
  const b = testPanel();
  const s2 = testSection();
  const c = testPanel();
  const next = moveSection(testBoard([s1, a, b, s2, c]), s2.id, 0);
  expect(next.items.map((i) => i.id)).toEqual([s2.id, c.id, s1.id, a.id, b.id]);
});

describe('reorderByDrop', () => {
  const s1 = testSection();
  const a = testPanel();
  const b = testPanel();
  const s2 = testSection();
  const c = testPanel();
  const board = testBoard([s1, a, b, s2, c]);
  const ids = (x: { items: { id: string }[] }) => x.items.map((i) => i.id);

  test('a panel dropped on a later panel lands after it', () => {
    expect(ids(reorderByDrop(board, a.id, c.id))).toEqual([s1.id, b.id, s2.id, c.id, a.id]);
  });

  test('a panel dropped on an earlier panel lands before it', () => {
    expect(ids(reorderByDrop(board, c.id, a.id))).toEqual([s1.id, c.id, a.id, b.id, s2.id]);
  });

  test('a panel dropped on a heading becomes the first panel under it', () => {
    expect(ids(reorderByDrop(board, a.id, s2.id))).toEqual([s1.id, b.id, s2.id, a.id, c.id]);
    expect(ids(reorderByDrop(board, c.id, s1.id))).toEqual([s1.id, c.id, a.id, b.id, s2.id]);
  });

  test('a heading dropped on a later section moves its whole block after that section', () => {
    expect(ids(reorderByDrop(board, s1.id, c.id))).toEqual([s2.id, c.id, s1.id, a.id, b.id]);
    expect(ids(reorderByDrop(board, s1.id, s2.id))).toEqual([s2.id, c.id, s1.id, a.id, b.id]);
  });

  test('a heading dropped on an earlier section moves its block before that section', () => {
    expect(ids(reorderByDrop(board, s2.id, a.id))).toEqual([s2.id, c.id, s1.id, a.id, b.id]);
  });

  test('a panel dropped on a section end marker becomes its last panel', () => {
    expect(ids(reorderByDrop(board, c.id, endDropId(s1.id)))).toEqual([s1.id, a.id, b.id, c.id, s2.id]);
    expect(ids(reorderByDrop(board, a.id, endDropId(s2.id)))).toEqual([s1.id, b.id, s2.id, c.id, a.id]);
    expect(ids(reorderByDrop(board, a.id, endDropId(s1.id)))).toEqual([s1.id, b.id, a.id, s2.id, c.id]);
  });

  test('a panel dropped on the top end marker lands above the first heading', () => {
    expect(ids(reorderByDrop(board, c.id, endDropId(null)))).toEqual([c.id, s1.id, a.id, b.id, s2.id]);
    const loose = testPanel();
    const mixed = testBoard([loose, s1, a]);
    expect(ids(reorderByDrop(mixed, a.id, endDropId(null)))).toEqual([loose.id, a.id, s1.id]);
  });

  test('a heading dropped on an end marker is left where it is', () => {
    expect(reorderByDrop(board, s1.id, endDropId(s2.id))).toBe(board);
  });

  test('dropping on itself or on an unknown id changes nothing', () => {
    expect(reorderByDrop(board, a.id, a.id)).toBe(board);
    expect(reorderByDrop(board, a.id, 'nope')).toBe(board);
  });
});

test('assignSetup with a new name adds a setup with the next colour and reuses names case-insensitively', () => {
  const a = testPanel();
  const b = testPanel();
  let board = assignSetup(testBoard([a, b]), a.id, 'Side Angle');
  expect(board.setups).toHaveLength(1);
  expect(board.setups[0]).toMatchObject({ name: 'Side Angle', color: SETUP_COLORS[0] });
  expect((board.items[0] as Panel).setupId).toBe(board.setups[0].id);
  board = assignSetup(board, b.id, ' side angle ');
  expect(board.setups).toHaveLength(1);
  expect((board.items[1] as Panel).setupId).toBe(board.setups[0].id);
  board = assignSetup(board, b.id, 'B-roll');
  expect(board.setups[1].color).toBe(SETUP_COLORS[1]);
  board = assignSetup(board, b.id, null);
  expect((board.items[1] as Panel).setupId).toBeNull();
  board = assignSetup(board, b.id, '   ');
  expect((board.items[1] as Panel).setupId).toBeNull();
});

test('appendScript adds sections and panels at the end in order', () => {
  const a = testPanel();
  const next = appendScript(testBoard([a]), [
    { kind: 'section', title: 'Hook' },
    { kind: 'panel', says: 'Hello.' },
  ]);
  expect(next.items).toHaveLength(3);
  expect(next.items[1]).toMatchObject({ type: 'section', title: 'Hook' });
  expect(next.items[2]).toMatchObject({ type: 'panel', says: 'Hello.' });
});

test("updateBoard format change keeps each panel's sketch.format unchanged", () => {
  const a = testPanel();
  const next = updateBoard(testBoard([a]), { format: '16:9' });
  expect(next.format).toBe('16:9');
  expect((next.items[0] as Panel).sketch.format).toBe('9:16');
});

test('updateBoard clamps panelsPerRow to 1..6 and rejects a non-positive pace', () => {
  const board = testBoard();
  expect(updateBoard(board, { panelsPerRow: 9 }).panelsPerRow).toBe(6);
  expect(updateBoard(board, { panelsPerRow: 0 }).panelsPerRow).toBe(1);
  expect(updateBoard(board, { wordsPerMinute: 0 }).wordsPerMinute).toBe(150);
});

test('copySketchFromPrevious copies the nearest earlier panel sketch', () => {
  const a = testPanel({ sketch: { format: '9:16', strokes: [stroke], stamps: [] } });
  const s = testSection();
  const b = testPanel();
  const next = copySketchFromPrevious(testBoard([a, s, b]), b.id);
  expect((next.items[2] as Panel).sketch.strokes).toEqual([stroke]);
});

test('resetFilmed clears every tick', () => {
  const next = resetFilmed(testBoard([testPanel({ filmed: true }), testPanel({ filmed: true })]));
  expect(panels(next).every((p) => !p.filmed)).toBe(true);
});

test('operations set updatedAt and never mutate their input', () => {
  const a = testPanel({ says: 'Hello world' });
  const b = testPanel({ says: 'two' });
  const s = testSection();
  const board = deepFreeze(testBoard([s, a, b]));
  const results = [
    insertPanel(board, 0),
    insertSection(board, 0, 'x'),
    updatePanel(board, a.id, { says: 'z' }),
    deleteItem(board, a.id),
    duplicatePanel(board, a.id),
    splitPanel(board, a.id, 5),
    mergeWithPrevious(board, b.id),
    moveItem(board, a.id, 2),
    moveSection(board, s.id, 0),
    assignSetup(board, a.id, 'Front'),
    appendScript(board, [{ kind: 'panel', says: 'x' }]),
    copySketchFromPrevious(board, b.id),
    resetFilmed(board),
    updateBoard(board, { title: 't' }),
  ];
  for (const r of results) expect(r.updatedAt).toBeGreaterThan(1);
});
