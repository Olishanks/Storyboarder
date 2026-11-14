import type { Board, Panel, TimelineEntry } from './types';

export const MIN_AUTO_DURATION = 1.5;
export const SILENT_PANEL_DURATION = 3;

export function countWords(text: string): number {
  const trimmed = text.trim();
  return trimmed === '' ? 0 : trimmed.split(/\s+/).length;
}

export function panelDuration(panel: Panel, wordsPerMinute: number): number {
  if (panel.durationOverride !== null) return panel.durationOverride;
  const count = countWords(panel.says);
  if (count === 0) return SILENT_PANEL_DURATION;
  const seconds = (count / wordsPerMinute) * 60;
  return Math.max(MIN_AUTO_DURATION, Math.round(seconds * 2) / 2);
}

export function timeline(board: Board): TimelineEntry[] {
  const entries: TimelineEntry[] = [];
  let clock = 0;
  for (const item of board.items) {
    if (item.type !== 'panel') continue;
    const duration = panelDuration(item, board.wordsPerMinute);
    entries.push({ panelId: item.id, number: entries.length + 1, start: clock, end: clock + duration, duration });
    clock += duration;
  }
  return entries;
}

export function totalDuration(board: Board): number {
  const entries = timeline(board);
  return entries.length === 0 ? 0 : entries[entries.length - 1].end;
}

export function formatTime(seconds: number): string {
  const whole = Math.floor(seconds);
  const minutes = Math.floor(whole / 60);
  return `${minutes}:${String(whole % 60).padStart(2, '0')}`;
}

export function formatDuration(seconds: number): string {
  return `${Math.round(seconds * 10) / 10}s`;
}

export function parseDurationInput(text: string): number | null {
  const trimmed = text.trim();
  if (!/^\d+(\.\d+)?$/.test(trimmed)) return null;
  const value = Number(trimmed);
  return Number.isFinite(value) && value > 0 ? value : null;
}
