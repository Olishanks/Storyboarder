import { boardFileName, parseBoardFile, serializeBoard } from './file';
import { testBoard, testPanel, testSection } from './testing';
import type { Panel } from './types';

const NOT_A_FILE = "This isn't a storyboard file.";
const NEWER = 'This file was made by a newer version of the app.';

function sample() {
  return testBoard(
    [
      testSection({ title: 'Hook' }),
      testPanel({
        says: 'Hello',
        setupId: 'su1',
        durationOverride: 4,
        sketch: {
          format: '9:16',
          strokes: [{ points: [[1, 2, 0.5]], color: '#111111', width: 10 }],
          stamps: [{ id: 'st1', kind: 'camera', x: 5, y: 6, scale: 1, rotation: 0 }],
        },
      }),
    ],
    { title: 'My video', setups: [{ id: 'su1', name: 'Front', color: '#e8590c' }] },
  );
}

test('round trip preserves title, items, strokes and stamps', () => {
  const board = sample();
  const result = parseBoardFile(serializeBoard(board));
  expect(result.ok).toBe(true);
  if (!result.ok) return;
  expect(result.board.title).toBe('My video');
  expect(result.board.items).toEqual(board.items);
  expect(result.board.setups).toEqual(board.setups);
});

test('import assigns a new id', () => {
  const board = sample();
  const result = parseBoardFile(serializeBoard(board));
  expect(result.ok && result.board.id !== board.id).toBe(true);
});

test('text that is not JSON is not a storyboard file', () => {
  expect(parseBoardFile('hello')).toEqual({ ok: false, error: NOT_A_FILE });
});

test('truncated JSON is not a storyboard file', () => {
  const text = serializeBoard(sample());
  expect(parseBoardFile(text.slice(0, text.length / 2))).toEqual({ ok: false, error: NOT_A_FILE });
});

test('JSON of the wrong shape is not a storyboard file', () => {
  expect(parseBoardFile('[1,2,3]')).toEqual({ ok: false, error: NOT_A_FILE });
  expect(parseBoardFile('null')).toEqual({ ok: false, error: NOT_A_FILE });
  expect(parseBoardFile('{"version":1}')).toEqual({ ok: false, error: NOT_A_FILE });
});

test('a newer version is reported as such', () => {
  const data = JSON.parse(serializeBoard(sample()));
  data.version = 2;
  expect(parseBoardFile(JSON.stringify(data))).toEqual({ ok: false, error: NEWER });
});

test('a panel missing "says" is not a storyboard file', () => {
  const data = JSON.parse(serializeBoard(sample()));
  delete (data.items[1] as Partial<Panel>).says;
  expect(parseBoardFile(JSON.stringify(data))).toEqual({ ok: false, error: NOT_A_FILE });
});

test('a stroke with a malformed point is not a storyboard file', () => {
  const data = JSON.parse(serializeBoard(sample()));
  data.items[1].sketch.strokes[0].points = [['a', 2, 3]];
  expect(parseBoardFile(JSON.stringify(data))).toEqual({ ok: false, error: NOT_A_FILE });
});

test('boardFileName replaces unsafe characters', () => {
  expect(boardFileName(testBoard([], { title: 'My: video/1' }))).toBe('My- video-1.storyboard.json');
});
