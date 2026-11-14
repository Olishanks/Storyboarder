import { createPointerPolicy } from './pointerPolicy';

const pen = (pointerId = 1) => ({ pointerId, pointerType: 'pen' });
const touch = (pointerId: number) => ({ pointerId, pointerType: 'touch' });
const mouse = () => ({ pointerId: 9, pointerType: 'mouse' });

test('pen draws', () => {
  expect(createPointerPolicy().down(pen())).toBe('draw');
});

test('mouse draws', () => {
  expect(createPointerPolicy().down(mouse())).toBe('draw');
});

test('a single finger draws when no pen has been seen', () => {
  expect(createPointerPolicy().down(touch(2))).toBe('draw');
});

test('a second finger turns the gesture into navigation', () => {
  const policy = createPointerPolicy();
  policy.down(touch(2));
  expect(policy.down(touch(3))).toBe('navigate');
});

test('after a pen has been seen, a single finger is ignored', () => {
  const policy = createPointerPolicy();
  policy.down(pen());
  policy.up(pen());
  expect(policy.penSeen).toBe(true);
  expect(policy.down(touch(2))).toBe('ignore');
});

test('after a pen has been seen, two fingers still navigate', () => {
  const policy = createPointerPolicy();
  policy.down(pen());
  policy.up(pen());
  policy.down(touch(2));
  expect(policy.down(touch(3))).toBe('navigate');
});

test('a touch during a pen stroke is ignored, even a second one', () => {
  const policy = createPointerPolicy();
  policy.down(pen());
  expect(policy.down(touch(2))).toBe('ignore');
  expect(policy.down(touch(3))).toBe('ignore');
});

test('lifting fingers resets the touch count', () => {
  const policy = createPointerPolicy();
  policy.down(touch(2));
  policy.down(touch(3));
  policy.up(touch(2));
  policy.up(touch(3));
  expect(policy.down(touch(4))).toBe('draw');
});

test('a pen used on one sketch is remembered when the next sketch opens', () => {
  const first = createPointerPolicy();
  first.down(pen());
  first.up(pen());
  const second = createPointerPolicy();
  expect(second.penSeen).toBe(true);
  expect(second.down(touch(2))).toBe('ignore');
});
