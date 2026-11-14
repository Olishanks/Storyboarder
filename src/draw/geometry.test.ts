import { fitSketch, handlePosition, hitStamp, STAMP_HALF, stampFromHandle } from './geometry';
import type { Sketch, Stamp } from '../model/types';

const stamp = (patch: Partial<Stamp> = {}): Stamp => ({ id: 'a', kind: 'camera', x: 500, y: 500, scale: 1, rotation: 0, ...patch });

test('fitSketch leaves a sketch already in the target format untouched', () => {
  const sketch: Sketch = { format: '9:16', strokes: [], stamps: [] };
  expect(fitSketch(sketch, '9:16')).toBe(sketch);
});

test('fitSketch scales a vertical sketch to fit inside a horizontal frame, centred', () => {
  const sketch: Sketch = {
    format: '9:16',
    strokes: [{ points: [[450, 800, 0.5], [0, 0, 0.5]], color: '#111111', width: 16 }],
    stamps: [stamp({ x: 450, y: 800, scale: 2 })],
  };
  const fitted = fitSketch(sketch, '16:9');
  expect(fitted.format).toBe('16:9');
  expect(fitted.strokes[0].points[0]).toEqual([800, 450, 0.5]);
  expect(fitted.strokes[0].points[1][1]).toBeCloseTo(0);
  expect(fitted.strokes[0].width).toBeCloseTo(9);
  expect(fitted.stamps[0]).toMatchObject({ x: 800, y: 450 });
  expect(fitted.stamps[0].scale).toBeCloseTo(1.125);
});

test('hitStamp finds the topmost stamp under a point and respects rotation and scale', () => {
  const below = stamp({ id: 'below' });
  const above = stamp({ id: 'above', x: 560 });
  expect(hitStamp([below, above], 520, 500)?.id).toBe('above');
  expect(hitStamp([below], 500 + STAMP_HALF + 5, 500)).toBeNull();
  expect(hitStamp([stamp({ scale: 2 })], 500 + STAMP_HALF + 5, 500)?.id).toBe('a');
  expect(hitStamp([stamp({ rotation: 45 })], 500 + STAMP_HALF * 1.3, 500)?.id).toBe('a');
});

test('the handle sits on the corner and dragging it scales and rotates', () => {
  expect(handlePosition(stamp())).toEqual({ x: 500 + STAMP_HALF, y: 500 + STAMP_HALF });
  const doubled = stampFromHandle(stamp(), 500 + 2 * STAMP_HALF, 500 + 2 * STAMP_HALF);
  expect(doubled.scale).toBeCloseTo(2);
  expect(doubled.rotation).toBeCloseTo(0);
  const turned = stampFromHandle(stamp(), 500, 500 + STAMP_HALF * Math.SQRT2);
  expect(turned.scale).toBeCloseTo(1);
  expect(turned.rotation).toBeCloseTo(45);
});

test('a stamp cannot be scaled to nothing', () => {
  expect(stampFromHandle(stamp(), 500, 500).scale).toBeGreaterThanOrEqual(0.2);
});
