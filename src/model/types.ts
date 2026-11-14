export type Format = '9:16' | '16:9';

export interface Setup {
  id: string;
  name: string;
  color: string;
}

/** x, y in virtual-canvas units, pressure 0..1 */
export type StrokePoint = [number, number, number];

export interface Stroke {
  points: StrokePoint[];
  color: string;
  width: number;
}

export type StampKind = 'figure' | 'bust' | 'camera' | 'arrow' | 'curvedArrow' | 'frame';

export interface Stamp {
  id: string;
  kind: StampKind;
  x: number;
  y: number;
  scale: number;
  rotation: number;
}

export interface Sketch {
  format: Format;
  strokes: Stroke[];
  stamps: Stamp[];
}

export interface Panel {
  type: 'panel';
  id: string;
  says: string;
  notes: string;
  setupId: string | null;
  size: string | null;
  angle: string | null;
  movement: string | null;
  durationOverride: number | null;
  sketch: Sketch;
  filmed: boolean;
}

export interface Section {
  type: 'section';
  id: string;
  title: string;
  collapsed: boolean;
}

export type Item = Panel | Section;

export interface Board {
  version: 1;
  id: string;
  title: string;
  format: Format;
  wordsPerMinute: number;
  panelsPerRow: number;
  setups: Setup[];
  items: Item[];
  createdAt: number;
  updatedAt: number;
  lastExportedAt: number | null;
}

export interface TimelineEntry {
  panelId: string;
  number: number;
  start: number;
  end: number;
  duration: number;
}

/** Virtual canvas size for a format. */
export function canvasSize(format: Format): { width: number; height: number } {
  return format === '9:16' ? { width: 900, height: 1600 } : { width: 1600, height: 900 };
}
