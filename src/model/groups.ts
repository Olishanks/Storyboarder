import type { Item, Panel, Section } from './types';

export interface ItemGroup {
  /** The heading these panels sit under, or null for panels above the first heading. */
  section: Section | null;
  panels: { panel: Panel; index: number }[];
  /** Index in the item list just past this group. */
  end: number;
}

/** Splits the flat item list into a leading run of panels and one group per heading. */
export function groupItems(items: Item[]): ItemGroup[] {
  const groups: ItemGroup[] = [{ section: null, panels: [], end: 0 }];
  items.forEach((item, index) => {
    if (item.type === 'section') groups.push({ section: item, panels: [], end: index + 1 });
    else groups[groups.length - 1].panels.push({ panel: item, index });
    groups[groups.length - 1].end = index + 1;
  });
  return groups.filter((group) => group.section !== null || group.panels.length > 0);
}
