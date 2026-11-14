import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { deleteItem, updateSection } from '../model/ops';
import type { Section } from '../model/types';
import type { BoardStore } from '../store/useBoard';
import { IconChevronDown, IconChevronRight, IconGrip, IconTrash } from '../ui/icons';

interface SectionHeaderProps {
  section: Section;
  summary: string;
  apply: BoardStore['apply'];
}

export function SectionHeader({ section, summary, apply }: SectionHeaderProps) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, isDragging, isOver } = useSortable({ id: section.id });
  const name = section.title || 'Untitled section';
  return (
    <header
      ref={setNodeRef}
      className="section-header"
      data-dragging={isDragging || undefined}
      data-over={(isOver && !isDragging) || undefined}
      style={{ transform: isDragging ? CSS.Translate.toString(transform) : undefined }}
    >
      <button type="button" className="panel-grip" ref={setActivatorNodeRef} {...attributes} {...listeners} aria-label={`Move section ${name}`}>
        <IconGrip />
      </button>
      <button
        type="button"
        className="icon-btn icon-btn-small"
        aria-label={`${section.collapsed ? 'Expand' : 'Collapse'} ${name}`}
        aria-expanded={!section.collapsed}
        onClick={() => apply((b) => updateSection(b, section.id, { collapsed: !section.collapsed }))}
      >
        {section.collapsed ? <IconChevronRight /> : <IconChevronDown />}
      </button>
      <input
        className="section-title"
        type="text"
        aria-label="Section title"
        placeholder="Section title"
        autoComplete="off"
        value={section.title}
        onChange={(e) => {
          const title = e.target.value;
          apply((b) => updateSection(b, section.id, { title }), `section:${section.id}`);
        }}
      />
      <span className="section-summary">{summary}</span>
      <button type="button" className="icon-btn icon-btn-small" aria-label={`Delete heading ${name}`} onClick={() => apply((b) => deleteItem(b, section.id))}>
        <IconTrash />
      </button>
    </header>
  );
}
