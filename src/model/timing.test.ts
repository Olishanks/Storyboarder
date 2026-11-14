import { countWords, formatDuration, formatTime, panelDuration, parseDurationInput, timeline, totalDuration } from './timing';
import { testBoard, testPanel, testSection, words } from './testing';

test('countWords ignores extra whitespace', () => {
  expect(countWords('  hello   big\nworld ')).toBe(3);
  expect(countWords('   ')).toBe(0);
});

test('20 words at 150 wpm is 8s', () => {
  expect(panelDuration(testPanel({ says: words(20) }), 150)).toBe(8);
});

test('3 words at 150 wpm is clamped to 1.5s', () => {
  expect(panelDuration(testPanel({ says: words(3) }), 150)).toBe(1.5);
});

test('7 words at 150 wpm (2.8s) rounds to 3s', () => {
  expect(panelDuration(testPanel({ says: words(7) }), 150)).toBe(3);
});

test('empty line with no override is 3s', () => {
  expect(panelDuration(testPanel({ says: '  ' }), 150)).toBe(3);
});

test('override 5 wins over a 20-word line', () => {
  expect(panelDuration(testPanel({ says: words(20), durationOverride: 5 }), 150)).toBe(5);
});

test('timeline numbers panels 1..n, skips sections, and is cumulative', () => {
  const board = testBoard([
    testSection(),
    testPanel({ says: words(20) }),
    testPanel(),
    testSection(),
    testPanel({ durationOverride: 5 }),
  ]);
  const t = timeline(board);
  expect(t.map((e) => e.number)).toEqual([1, 2, 3]);
  expect(t.map((e) => e.start)).toEqual([0, 8, 11]);
  expect(t.map((e) => e.end)).toEqual([8, 11, 16]);
  expect(totalDuration(board)).toBe(16);
});

test('panels in a collapsed section still count', () => {
  const board = testBoard([testSection({ collapsed: true }), testPanel({ says: words(20) })]);
  expect(totalDuration(board)).toBe(8);
});

test('formatTime shows minutes and whole seconds', () => {
  expect(formatTime(18)).toBe('0:18');
  expect(formatTime(75.5)).toBe('1:15');
  expect(formatTime(0)).toBe('0:00');
});

test('formatDuration shows halves', () => {
  expect(formatDuration(8)).toBe('8s');
  expect(formatDuration(8.5)).toBe('8.5s');
});

test('parseDurationInput accepts positive numbers only', () => {
  expect(parseDurationInput('4')).toBe(4);
  expect(parseDurationInput(' 2.5 ')).toBe(2.5);
  expect(parseDurationInput('0')).toBeNull();
  expect(parseDurationInput('-1')).toBeNull();
  expect(parseDurationInput('abc')).toBeNull();
  expect(parseDurationInput('')).toBeNull();
  expect(parseDurationInput('4abc')).toBeNull();
});
