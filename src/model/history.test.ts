import { createHistory, push, redo, undo } from './history';

test('push then undo restores the previous value', () => {
  const h = undo(push(createHistory('a'), 'b'));
  expect(h.present).toBe('a');
});

test('redo reapplies', () => {
  const h = redo(undo(push(createHistory('a'), 'b')));
  expect(h.present).toBe('b');
});

test('push after undo clears redo', () => {
  const h = push(undo(push(createHistory('a'), 'b')), 'c');
  expect(h.future).toEqual([]);
  expect(redo(h).present).toBe('c');
});

test('the 51st push drops the oldest step', () => {
  let h = createHistory(0);
  for (let i = 1; i <= 51; i += 1) h = push(h, i);
  expect(h.past).toHaveLength(50);
  expect(h.past[0]).toBe(1);
});

test('undo with empty past and redo with empty future are no-ops', () => {
  const h = createHistory('a');
  expect(undo(h)).toBe(h);
  expect(redo(h)).toBe(h);
});
