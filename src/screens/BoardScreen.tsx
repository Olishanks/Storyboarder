import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  type DragEndEvent,
} from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, type SortingStrategy } from '@dnd-kit/sortable';
import { useCallback, useMemo, useState } from 'react';
import { downloadText } from '../download';
import { boardFileName, serializeBoard } from '../model/file';
import { endDropId, insertPanel, insertSection, reorderByDrop, updateBoard } from '../model/ops';
import { formatTime, timeline } from '../model/timing';
import { groupItems } from '../model/groups';
import type { TimelineEntry } from '../model/types';
import { navigate } from '../router';
import type { BoardStore } from '../store/useBoard';
import {
  IconBack,
  IconCamera,
  IconDownload,
  IconPlay,
  IconPlus,
  IconPrint,
  IconRedo,
  IconScript,
  IconSection,
  IconSettings,
  IconUndo,
} from '../ui/icons';
import { BoardSettings } from './BoardSettings';
import { PanelCard } from './PanelCard';
import { ScriptImport } from './ScriptImport';
import { SectionHeader } from './SectionHeader';

const noShift: SortingStrategy = () => null;

/** Adds a panel on tap; while dragging, dropping here puts the panel last in this group. */
function AddPanelTile({ dropId, label, onAdd }: { dropId: string; label: string; onAdd(): void }) {
  const { setNodeRef, isOver } = useDroppable({ id: dropId });
  return (
    <button ref={setNodeRef} type="button" className="add-panel" data-over={isOver || undefined} aria-label={label} onClick={onAdd}>
      <IconPlus />
      <span>Add panel</span>
    </button>
  );
}

export function countLabel(seconds: number, panels: number): string {
  return `${formatTime(seconds)} · ${panels} ${panels === 1 ? 'panel' : 'panels'}`;
}

export function BoardScreen({ store }: { store: BoardStore }) {
  const board = store.board!;
  const { apply } = store;
  const [dialog, setDialog] = useState<'script' | 'settings' | null>(null);

  const entries = useMemo(() => timeline(board), [board]);
  const entryById = useMemo(() => new Map<string, TimelineEntry>(entries.map((e) => [e.panelId, e])), [entries]);
  const total = entries.length === 0 ? 0 : entries[entries.length - 1].end;

  const groups = useMemo(() => groupItems(board.items), [board.items]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const onDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (over) apply((b) => reorderByDrop(b, String(active.id), String(over.id)));
    },
    [apply],
  );
  const openSketch = useCallback((panelId: string) => navigate(`/board/${board.id}/sketch/${panelId}`), [board.id]);

  const exportFile = () => {
    downloadText(boardFileName(board), serializeBoard(board));
    apply((b) => updateBoard(b, { lastExportedAt: Date.now() }));
  };

  const visibleIds = groups.flatMap((group) => [
    ...(group.section ? [group.section.id] : []),
    ...(group.section?.collapsed ? [] : group.panels.map((p) => p.panel.id)),
  ]);

  return (
    <main className="board">
      <header className="board-bar">
        <a href="#/" className="back-link">
          <IconBack />
          <span>Boards</span>
        </a>
        <div className="board-title">
          <h1>{board.title}</h1>
          <p className="board-meta">{countLabel(total, entries.length)}</p>
        </div>
        <div className="toolbar" role="toolbar" aria-label="Board tools">
          <div className="toolbar-group">
            <button type="button" className="icon-btn" aria-label="Undo" disabled={!store.canUndo} onClick={store.undo}>
              <IconUndo />
            </button>
            <button type="button" className="icon-btn" aria-label="Redo" disabled={!store.canRedo} onClick={store.redo}>
              <IconRedo />
            </button>
          </div>
          <div className="toolbar-group">
            <button type="button" className="btn" onClick={() => setDialog('script')}>
              <IconScript />
              <span>Add script</span>
            </button>
            <button type="button" className="btn" onClick={() => apply((b) => insertSection(b, b.items.length, 'New section'))}>
              <IconSection />
              <span>Add section</span>
            </button>
          </div>
          <div className="toolbar-group">
            <button type="button" className="btn" onClick={() => navigate(`/board/${board.id}/play`)}>
              <IconPlay />
              <span>Play</span>
            </button>
            <button type="button" className="btn btn-primary" onClick={() => navigate(`/board/${board.id}/film`)}>
              <IconCamera />
              <span>Film</span>
            </button>
          </div>
          <div className="toolbar-group">
            <button type="button" className="icon-btn" aria-label="Export board file" title="Export board file" onClick={exportFile}>
              <IconDownload />
            </button>
            <button type="button" className="icon-btn" aria-label="Print" title="Print or save as PDF" onClick={() => navigate(`/board/${board.id}/print`)}>
              <IconPrint />
            </button>
            <button type="button" className="icon-btn" aria-label="Settings" title="Board settings" onClick={() => setDialog('settings')}>
              <IconSettings />
            </button>
          </div>
        </div>
      </header>

      {store.saveError && (
        <div role="alert" className="notice notice-error">
          <span>
            <strong>Not saved.</strong> This device refused to store the latest changes. Keep this tab open and export
            a copy so nothing is lost.
          </span>
          <button type="button" className="btn" onClick={exportFile}>
            Export board file
          </button>
        </div>
      )}

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={visibleIds} strategy={noShift}>
          <div className="board-body" style={{ ['--columns' as string]: board.panelsPerRow }} data-format={board.format} data-columns={board.panelsPerRow}>
            {entries.length === 0 && groups.length === 0 && (
              <div className="empty">
                <h2>No panels yet</h2>
                <p>Add a panel and sketch the first shot, or paste your script and let each paragraph become a panel.</p>
                <div className="empty-actions">
                  <button type="button" className="btn btn-primary" onClick={() => apply((b) => insertPanel(b, 0))}>
                    <IconPlus />
                    <span>Add panel</span>
                  </button>
                  <button type="button" className="btn" onClick={() => setDialog('script')}>
                    <IconScript />
                    <span>Paste a script</span>
                  </button>
                </div>
              </div>
            )}
            {groups.map((group) => {
              const seconds = group.panels.reduce((sum, p) => sum + (entryById.get(p.panel.id)?.duration ?? 0), 0);
              const grid = !group.section?.collapsed && (
                <div className="panel-grid">
                  {group.panels.map(({ panel, index }) => {
                    const entry = entryById.get(panel.id)!;
                    return (
                      <div key={panel.id} className="panel-slot">
                        <button
                          type="button"
                          className="insert-btn"
                          aria-label={`Insert panel before panel ${entry.number}`}
                          title="Insert a panel here"
                          onClick={() => apply((b) => insertPanel(b, index))}
                        >
                          <IconPlus size={16} />
                        </button>
                        <PanelCard panel={panel} entry={entry} board={board} apply={apply} onOpenSketch={openSketch} />
                      </div>
                    );
                  })}
                  <AddPanelTile
                    dropId={endDropId(group.section?.id ?? null)}
                    label={group.section ? `Add panel to ${group.section.title || 'section'}` : 'Add panel'}
                    onAdd={() => apply((b) => insertPanel(b, group.end))}
                  />
                </div>
              );
              if (!group.section) {
                return (
                  <div key="unsectioned" className="board-group">
                    {grid}
                  </div>
                );
              }
              return (
                <section key={group.section.id} className="board-group" role="group" aria-label={group.section.title || 'Untitled section'}>
                  <SectionHeader section={group.section} summary={countLabel(seconds, group.panels.length)} apply={apply} />
                  {grid}
                </section>
              );
            })}
          </div>
        </SortableContext>
      </DndContext>

      {dialog === 'script' && <ScriptImport store={store} onClose={() => setDialog(null)} />}
      {dialog === 'settings' && <BoardSettings store={store} onClose={() => setDialog(null)} />}
    </main>
  );
}
