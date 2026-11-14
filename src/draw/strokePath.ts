import { getStroke } from 'perfect-freehand';
import type { Stroke } from '../model/types';

const round = (n: number) => Math.round(n * 10) / 10;

/** Pen-feel settings. Tune these after trying the Apple Pencil. */
export const PEN_FEEL = { thinning: 0.55, smoothing: 0.5, streamline: 0.35 };

/** Outline of a stroke as SVG path data. */
export function strokeToPath(stroke: Stroke): string {
  if (stroke.points.length === 0) return '';
  // A mouse reports a constant 0.5: let the library vary the width from speed instead.
  const constantPressure = stroke.points.every((p) => p[2] === stroke.points[0][2]);
  const outline = getStroke(stroke.points, {
    size: stroke.width,
    ...PEN_FEEL,
    simulatePressure: constantPressure,
    last: true,
  });
  if (outline.length === 0) return '';
  if (outline.length < 3) {
    const [x, y] = outline[0];
    const r = round(stroke.width / 2);
    return `M${round(x - r)},${round(y)}a${r},${r} 0 1,0 ${2 * r},0a${r},${r} 0 1,0 ${-2 * r},0Z`;
  }
  let d = `M${round(outline[0][0])},${round(outline[0][1])}Q`;
  for (let i = 0; i < outline.length; i += 1) {
    const [x0, y0] = outline[i];
    const [x1, y1] = outline[(i + 1) % outline.length];
    d += `${round(x0)},${round(y0)} ${round((x0 + x1) / 2)},${round((y0 + y1) / 2)} `;
  }
  return `${d}Z`;
}
