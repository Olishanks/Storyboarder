import { uid } from './ops';
import type { Board, Format, Item, Setup, Sketch, Stamp, StampKind, Stroke } from './types';

const NOT_A_FILE = "This isn't a storyboard file.";
const NEWER_VERSION = 'This file was made by a newer version of the app.';
const CURRENT_VERSION = 1;

export type ParseResult = { ok: true; board: Board } | { ok: false; error: string };

export function boardFileName(board: Board): string {
  const safe = board.title.replace(/[\\/:*?"<>|]+/g, '-').trim() || 'storyboard';
  return `${safe}.storyboard.json`;
}

export function serializeBoard(board: Board): string {
  return JSON.stringify(board);
}

type Obj = Record<string, unknown>;

const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);
const isStr = (v: unknown): v is string => typeof v === 'string';
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const isBool = (v: unknown): v is boolean => typeof v === 'boolean';
const isFormat = (v: unknown): v is Format => v === '9:16' || v === '16:9';
const nullable =
  <T>(check: (v: unknown) => v is T) =>
  (v: unknown): v is T | null =>
    v === null || check(v);

const STAMP_KINDS: StampKind[] = ['figure', 'bust', 'camera', 'arrow', 'curvedArrow', 'frame'];

function isStroke(v: unknown): v is Stroke {
  return (
    isObj(v) &&
    isStr(v.color) &&
    isNum(v.width) &&
    Array.isArray(v.points) &&
    v.points.every((p) => Array.isArray(p) && p.length === 3 && p.every(isNum))
  );
}

function isStamp(v: unknown): v is Stamp {
  return (
    isObj(v) &&
    isStr(v.id) &&
    STAMP_KINDS.includes(v.kind as StampKind) &&
    isNum(v.x) &&
    isNum(v.y) &&
    isNum(v.scale) &&
    isNum(v.rotation)
  );
}

function isSketch(v: unknown): v is Sketch {
  return (
    isObj(v) &&
    isFormat(v.format) &&
    Array.isArray(v.strokes) &&
    v.strokes.every(isStroke) &&
    Array.isArray(v.stamps) &&
    v.stamps.every(isStamp)
  );
}

function isItem(v: unknown): v is Item {
  if (!isObj(v) || !isStr(v.id)) return false;
  if (v.type === 'section') return isStr(v.title) && isBool(v.collapsed);
  if (v.type !== 'panel') return false;
  return (
    isStr(v.says) &&
    isStr(v.notes) &&
    nullable(isStr)(v.setupId) &&
    nullable(isStr)(v.size) &&
    nullable(isStr)(v.angle) &&
    nullable(isStr)(v.movement) &&
    nullable(isNum)(v.durationOverride) &&
    (v.durationOverride === null || (v.durationOverride as number) > 0) &&
    isSketch(v.sketch) &&
    isBool(v.filmed)
  );
}

function isSetup(v: unknown): v is Setup {
  return isObj(v) && isStr(v.id) && isStr(v.name) && isStr(v.color);
}

export function parseBoardFile(text: string): ParseResult {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return { ok: false, error: NOT_A_FILE };
  }
  if (!isObj(data) || !isNum(data.version)) return { ok: false, error: NOT_A_FILE };
  if (data.version > CURRENT_VERSION) return { ok: false, error: NEWER_VERSION };
  const valid =
    isStr(data.title) &&
    isFormat(data.format) &&
    isNum(data.wordsPerMinute) &&
    data.wordsPerMinute > 0 &&
    isNum(data.panelsPerRow) &&
    Array.isArray(data.setups) &&
    data.setups.every(isSetup) &&
    Array.isArray(data.items) &&
    data.items.every(isItem);
  if (!valid) return { ok: false, error: NOT_A_FILE };
  const now = Date.now();
  const board: Board = {
    version: 1,
    id: uid(),
    title: data.title as string,
    format: data.format as Format,
    wordsPerMinute: data.wordsPerMinute as number,
    panelsPerRow: Math.max(1, Math.min(6, Math.round(data.panelsPerRow as number))),
    setups: data.setups as Setup[],
    items: data.items as Item[],
    createdAt: isNum(data.createdAt) ? data.createdAt : now,
    updatedAt: now,
    lastExportedAt: now,
  };
  return { ok: true, board };
}
