import type { Board, Item, Panel, Section } from './types';

let counter = 0;

export function testPanel(patch: Partial<Panel> = {}): Panel {
  counter += 1;
  return {
    type: 'panel',
    id: `p${counter}`,
    says: '',
    notes: '',
    setupId: null,
    size: null,
    angle: null,
    movement: null,
    durationOverride: null,
    sketch: { format: '9:16', strokes: [], stamps: [] },
    filmed: false,
    ...patch,
  };
}

export function testSection(patch: Partial<Section> = {}): Section {
  counter += 1;
  return { type: 'section', id: `s${counter}`, title: 'Section', collapsed: false, ...patch };
}

export function testBoard(items: Item[] = [], patch: Partial<Board> = {}): Board {
  return {
    version: 1,
    id: 'b1',
    title: 'Test board',
    format: '9:16',
    wordsPerMinute: 150,
    panelsPerRow: 3,
    setups: [],
    items,
    createdAt: 1,
    updatedAt: 1,
    lastExportedAt: null,
    ...patch,
  };
}

export function words(n: number): string {
  return Array.from({ length: n }, (_, i) => `w${i}`).join(' ');
}

export function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    Object.values(value as object).forEach(deepFreeze);
  }
  return value;
}
