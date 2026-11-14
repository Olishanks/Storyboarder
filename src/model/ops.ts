import type { ParsedItem } from './script';
import type { Board, Format, Item, Panel, Section, Setup, Sketch } from './types';

export const SETUP_COLORS = ['#e8590c', '#1c7ed6', '#2f9e44', '#ae3ec9', '#e03131', '#0c8599', '#f08c00', '#6741d9'];

export const DEFAULT_WORDS_PER_MINUTE = 150;

export function uid(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function touch(board: Board, patch: Partial<Board>): Board {
  return { ...board, ...patch, updatedAt: Math.max(Date.now(), board.updatedAt + 1) };
}

function clampIndex(index: number, length: number): number {
  return Math.max(0, Math.min(length, Math.round(index)));
}

function emptySketch(format: Format): Sketch {
  return { format, strokes: [], stamps: [] };
}

export function isSketchEmpty(sketch: Sketch): boolean {
  return sketch.strokes.length === 0 && sketch.stamps.length === 0;
}

export function newBoard(title: string, format: Format): Board {
  const now = Date.now();
  return {
    version: 1,
    id: uid(),
    title: title.trim() || 'Untitled board',
    format,
    wordsPerMinute: DEFAULT_WORDS_PER_MINUTE,
    panelsPerRow: format === '9:16' ? 3 : 2,
    setups: [],
    items: [],
    createdAt: now,
    updatedAt: now,
    lastExportedAt: null,
  };
}

export function newPanel(format: Format, patch: Partial<Panel> = {}): Panel {
  return {
    type: 'panel',
    id: uid(),
    says: '',
    notes: '',
    setupId: null,
    size: null,
    angle: null,
    movement: null,
    durationOverride: null,
    sketch: emptySketch(format),
    filmed: false,
    ...patch,
  };
}

function newSection(title: string): Section {
  return { type: 'section', id: uid(), title: title.trim() || 'Section', collapsed: false };
}

function insertAt(items: Item[], index: number, ...added: Item[]): Item[] {
  const at = clampIndex(index, items.length);
  return [...items.slice(0, at), ...added, ...items.slice(at)];
}

export function insertPanel(board: Board, index: number, patch: Partial<Panel> = {}): Board {
  return touch(board, { items: insertAt(board.items, index, newPanel(board.format, patch)) });
}

export function insertSection(board: Board, index: number, title: string): Board {
  return touch(board, { items: insertAt(board.items, index, newSection(title)) });
}

export function updatePanel(board: Board, id: string, patch: Partial<Panel>): Board {
  return touch(board, {
    items: board.items.map((item) => (item.id === id && item.type === 'panel' ? { ...item, ...patch, id, type: 'panel' } : item)),
  });
}

export function updateSection(board: Board, id: string, patch: Partial<Section>): Board {
  return touch(board, {
    items: board.items.map((item) =>
      item.id === id && item.type === 'section' ? { ...item, ...patch, id, type: 'section' } : item,
    ),
  });
}

type BoardPatch = Partial<Pick<Board, 'title' | 'wordsPerMinute' | 'panelsPerRow' | 'format' | 'lastExportedAt'>>;

export function updateBoard(board: Board, patch: BoardPatch): Board {
  const next: BoardPatch = { ...patch };
  if (next.panelsPerRow !== undefined) {
    next.panelsPerRow = Math.max(1, Math.min(6, Math.round(next.panelsPerRow) || 1));
  }
  if (next.wordsPerMinute !== undefined && !(Number.isFinite(next.wordsPerMinute) && next.wordsPerMinute > 0)) {
    delete next.wordsPerMinute;
  }
  if (next.title !== undefined) next.title = next.title.trim() || board.title;
  return touch(board, next);
}

export function deleteItem(board: Board, id: string): Board {
  return touch(board, { items: board.items.filter((item) => item.id !== id) });
}

export function cloneSketch(sketch: Sketch): Sketch {
  return {
    format: sketch.format,
    strokes: sketch.strokes.map((s) => ({ ...s, points: s.points.map((p) => [...p] as [number, number, number]) })),
    stamps: sketch.stamps.map((s) => ({ ...s, id: uid() })),
  };
}

export function duplicatePanel(board: Board, id: string): Board {
  const index = board.items.findIndex((item) => item.id === id);
  const source = board.items[index];
  if (!source || source.type !== 'panel') return board;
  const copy: Panel = { ...source, id: uid(), filmed: false, sketch: cloneSketch(source.sketch) };
  return touch(board, { items: insertAt(board.items, index + 1, copy) });
}

export function splitPanel(board: Board, id: string, cursor: number): Board {
  const index = board.items.findIndex((item) => item.id === id);
  const source = board.items[index];
  if (!source || source.type !== 'panel') return board;
  const at = Math.max(0, Math.min(source.says.length, cursor));
  const first: Panel = { ...source, says: source.says.slice(0, at).trim(), durationOverride: null };
  const second = newPanel(board.format, { says: source.says.slice(at).trim(), setupId: source.setupId });
  const items = [...board.items];
  items.splice(index, 1, first, second);
  return touch(board, { items });
}

export function mergeWithPrevious(board: Board, id: string): Board {
  const index = board.items.findIndex((item) => item.id === id);
  const current = board.items[index];
  const previous = board.items[index - 1];
  if (!current || current.type !== 'panel' || !previous || previous.type !== 'panel') return board;
  const merged: Panel = {
    ...previous,
    says: [previous.says, current.says].filter((t) => t.trim()).join(' '),
    notes: [previous.notes, current.notes].filter((t) => t.trim()).join('\n'),
    durationOverride: null,
  };
  const items = [...board.items];
  items.splice(index - 1, 2, merged);
  return touch(board, { items });
}

export function moveItem(board: Board, id: string, toIndex: number): Board {
  const index = board.items.findIndex((item) => item.id === id);
  if (index < 0) return board;
  const items = [...board.items];
  const [moved] = items.splice(index, 1);
  items.splice(clampIndex(toIndex, items.length), 0, moved);
  return touch(board, { items });
}

/** The heading at `index` plus every panel up to the next heading. */
export function sectionBlockLength(items: Item[], index: number): number {
  let end = index + 1;
  while (end < items.length && items[end].type === 'panel') end += 1;
  return end - index;
}

export function moveSection(board: Board, id: string, toIndex: number): Board {
  const index = board.items.findIndex((item) => item.id === id);
  if (index < 0 || board.items[index].type !== 'section') return board;
  const items = [...board.items];
  const block = items.splice(index, sectionBlockLength(items, index));
  items.splice(clampIndex(toIndex, items.length), 0, ...block);
  return touch(board, { items });
}

const END_DROP_PREFIX = 'end:';

/** Drop-target id for the end of a section, or of the panels above the first heading (null). */
export function endDropId(sectionId: string | null): string {
  return `${END_DROP_PREFIX}${sectionId ?? ''}`;
}

function dropAtGroupEnd(board: Board, activeId: string, sectionId: string): Board {
  const from = board.items.findIndex((item) => item.id === activeId);
  if (from < 0 || board.items[from].type !== 'panel') return board;
  const remaining = board.items.filter((item) => item.id !== activeId);
  let end: number;
  if (sectionId === '') {
    end = remaining.findIndex((item) => item.type === 'section');
    if (end < 0) end = remaining.length;
  } else {
    const heading = remaining.findIndex((item) => item.id === sectionId);
    if (heading < 0) return board;
    end = heading + sectionBlockLength(remaining, heading);
  }
  return moveItem(board, activeId, end);
}

/** Where a dragged item lands when dropped on another item. */
export function reorderByDrop(board: Board, activeId: string, overId: string): Board {
  if (overId.startsWith(END_DROP_PREFIX)) return dropAtGroupEnd(board, activeId, overId.slice(END_DROP_PREFIX.length));
  const items = board.items;
  const from = items.findIndex((item) => item.id === activeId);
  const over = items.findIndex((item) => item.id === overId);
  if (from < 0 || over < 0 || from === over) return board;

  if (items[from].type === 'panel') {
    if (items[over].type === 'panel') return moveItem(board, activeId, over);
    const remaining = items.filter((item) => item.id !== activeId);
    return moveItem(board, activeId, remaining.findIndex((item) => item.id === overId) + 1);
  }

  const blockLength = sectionBlockLength(items, from);
  if (over > from && over < from + blockLength) return board;
  let target = over;
  while (target >= 0 && items[target].type !== 'section') target -= 1;
  if (target < 0) return moveSection(board, activeId, 0);
  if (target === from) return board;
  const targetId = items[target].id;
  const remaining = [...items];
  remaining.splice(from, blockLength);
  const at = remaining.findIndex((item) => item.id === targetId);
  return moveSection(board, activeId, from < target ? at + sectionBlockLength(remaining, at) : at);
}

export function assignSetup(board: Board, panelId: string, name: string | null): Board {
  const wanted = name?.trim() ?? '';
  if (!wanted) return updatePanel(board, panelId, { setupId: null });
  let setups = board.setups;
  let setup: Setup | undefined = setups.find((s) => s.name.toLowerCase() === wanted.toLowerCase());
  if (!setup) {
    setup = { id: uid(), name: wanted, color: SETUP_COLORS[setups.length % SETUP_COLORS.length] };
    setups = [...setups, setup];
  }
  return updatePanel({ ...board, setups }, panelId, { setupId: setup.id });
}

export function appendScript(board: Board, parsed: ParsedItem[]): Board {
  const added: Item[] = parsed.map((item) =>
    item.kind === 'section' ? newSection(item.title) : newPanel(board.format, { says: item.says }),
  );
  return touch(board, { items: [...board.items, ...added] });
}

export function copySketchFromPrevious(board: Board, panelId: string): Board {
  const index = board.items.findIndex((item) => item.id === panelId);
  for (let i = index - 1; i >= 0; i -= 1) {
    const item = board.items[i];
    if (item.type === 'panel') return updatePanel(board, panelId, { sketch: cloneSketch(item.sketch) });
  }
  return board;
}

export function resetFilmed(board: Board): Board {
  return touch(board, {
    items: board.items.map((item) => (item.type === 'panel' && item.filmed ? { ...item, filmed: false } : item)),
  });
}
