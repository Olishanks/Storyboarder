import { canvasSize, type Format, type Sketch, type Stamp, type Stroke } from '../model/types';

/** Half the side of a stamp's box at scale 1, in canvas units. */
export const STAMP_HALF = 150;
export const MIN_STAMP_SCALE = 0.2;
export const MAX_STAMP_SCALE = 6;

const RAD = Math.PI / 180;

/** Converts a sketch to another format: scaled to fit inside, centred. */
export function fitSketch(sketch: Sketch, format: Format): Sketch {
  if (sketch.format === format) return sketch;
  const own = canvasSize(sketch.format);
  const target = canvasSize(format);
  const k = Math.min(target.width / own.width, target.height / own.height);
  const ox = (target.width - own.width * k) / 2;
  const oy = (target.height - own.height * k) / 2;
  return {
    format,
    strokes: sketch.strokes.map((stroke) => ({
      ...stroke,
      width: stroke.width * k,
      points: stroke.points.map(([x, y, p]) => [ox + x * k, oy + y * k, p]),
    })),
    stamps: sketch.stamps.map((stamp) => ({ ...stamp, x: ox + stamp.x * k, y: oy + stamp.y * k, scale: stamp.scale * k })),
  };
}

/** The topmost stamp whose box contains the point, or null. */
export function hitStamp(stamps: Stamp[], x: number, y: number): Stamp | null {
  for (let i = stamps.length - 1; i >= 0; i -= 1) {
    const stamp = stamps[i];
    const dx = x - stamp.x;
    const dy = y - stamp.y;
    const cos = Math.cos(-stamp.rotation * RAD);
    const sin = Math.sin(-stamp.rotation * RAD);
    const lx = (dx * cos - dy * sin) / stamp.scale;
    const ly = (dx * sin + dy * cos) / stamp.scale;
    if (Math.abs(lx) <= STAMP_HALF && Math.abs(ly) <= STAMP_HALF) return stamp;
  }
  return null;
}

/** Where the scale-and-rotate handle sits: the stamp's bottom-right corner. */
export function handlePosition(stamp: Stamp): { x: number; y: number } {
  const d = STAMP_HALF * stamp.scale;
  const cos = Math.cos(stamp.rotation * RAD);
  const sin = Math.sin(stamp.rotation * RAD);
  return { x: stamp.x + d * cos - d * sin, y: stamp.y + d * sin + d * cos };
}

/** The stamp after its handle is dragged to a point. */
export function stampFromHandle(stamp: Stamp, x: number, y: number): Stamp {
  const dx = x - stamp.x;
  const dy = y - stamp.y;
  const distance = Math.hypot(dx, dy);
  const scale = Math.max(MIN_STAMP_SCALE, Math.min(MAX_STAMP_SCALE, distance / (STAMP_HALF * Math.SQRT2)));
  const rotation = distance === 0 ? stamp.rotation : Math.atan2(dy, dx) / RAD - 45;
  return { ...stamp, scale, rotation };
}

function distanceToSegment(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const abx = bx - ax;
  const aby = by - ay;
  const lengthSq = abx * abx + aby * aby;
  const t = lengthSq === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * abx + (py - ay) * aby) / lengthSq));
  return Math.hypot(px - (ax + abx * t), py - (ay + aby * t));
}

/** True when the eraser, swept from `from` to `to`, touches the stroke. */
export function eraserTouches(stroke: Stroke, from: [number, number], to: [number, number], radius: number): boolean {
  const reach = radius + stroke.width / 2;
  return stroke.points.some(([x, y]) => distanceToSegment(x, y, from[0], from[1], to[0], to[1]) <= reach);
}
