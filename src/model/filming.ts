import type { Board, Panel, Setup } from './types';

export interface FilmingGroup {
  setup: Setup | null;
  panels: { panel: Panel; number: number }[];
}

/** Groups in order of first appearance; panels without a known setup go last. */
export function groupBySetup(board: Board): FilmingGroup[] {
  const groups = new Map<string, FilmingGroup>();
  const unassigned: FilmingGroup = { setup: null, panels: [] };
  let number = 0;
  for (const item of board.items) {
    if (item.type !== 'panel') continue;
    number += 1;
    const setup = board.setups.find((s) => s.id === item.setupId);
    if (!setup) {
      unassigned.panels.push({ panel: item, number });
      continue;
    }
    let group = groups.get(setup.id);
    if (!group) {
      group = { setup, panels: [] };
      groups.set(setup.id, group);
    }
    group.panels.push({ panel: item, number });
  }
  const result = [...groups.values()];
  if (unassigned.panels.length > 0) result.push(unassigned);
  return result;
}

export function filmedCount(board: Board): { filmed: number; total: number } {
  const panels = board.items.filter((item): item is Panel => item.type === 'panel');
  return { filmed: panels.filter((p) => p.filmed).length, total: panels.length };
}
