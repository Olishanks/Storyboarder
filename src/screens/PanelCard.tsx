import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { memo, useEffect, useLayoutEffect, useRef, useState, type TextareaHTMLAttributes } from 'react';
import { SketchView } from '../draw/SketchView';
import { assignSetup, deleteItem, duplicatePanel, isSketchEmpty, mergeWithPrevious, splitPanel, updatePanel } from '../model/ops';
import { formatDuration, formatTime, parseDurationInput } from '../model/timing';
import type { Board, Panel, TimelineEntry } from '../model/types';
import type { BoardStore } from '../store/useBoard';
import { IconGrip, IconMore, IconPen } from '../ui/icons';

export const SHOT_DETAILS = {
  size: ['Wide', 'Medium', 'Close-up', 'Extreme close-up'],
  angle: ['Eye level', 'High', 'Low', 'Side', 'Over the shoulder'],
  movement: ['Static', 'Push in', 'Pull out', 'Pan', 'Tilt', 'Handheld'],
} as const;

const DETAIL_LABELS = { size: 'Size', angle: 'Angle', movement: 'Movement' } as const;
type DetailKey = keyof typeof SHOT_DETAILS;
const NEW_SETUP = '__new__';

function AutoTextarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const fit = () => {
      el.style.height = 'auto';
      el.style.height = `${el.scrollHeight}px`;
    };
    fit();
    // The text re-wraps when the card changes width (rotation, panels per row).
    if (typeof ResizeObserver === 'undefined') return;
    let width = el.clientWidth;
    const observer = new ResizeObserver(() => {
      if (el.clientWidth === width) return;
      width = el.clientWidth;
      fit();
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [props.value]);
  return <textarea ref={ref} rows={1} {...props} />;
}

function DurationControl({ panel, entry, apply }: { panel: Panel; entry: TimelineEntry; apply: BoardStore['apply'] }) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState('');

  const commit = () => {
    setEditing(false);
    const value = parseDurationInput(text);
    if (value === null || value === entry.duration) return;
    apply((b) => updatePanel(b, panel.id, { durationOverride: value }));
  };

  if (editing) {
    return (
      <input
        className="duration-input"
        type="text"
        inputMode="decimal"
        aria-label="Duration in seconds"
        value={text}
        autoFocus
        onFocus={(e) => e.target.select()}
        onChange={(e) => setText(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit();
          if (e.key === 'Escape') setEditing(false);
        }}
      />
    );
  }
  return (
    <>
      <button
        type="button"
        className={panel.durationOverride === null ? 'duration' : 'duration duration-set'}
        aria-label={`Duration ${formatDuration(entry.duration)}`}
        title={panel.durationOverride === null ? 'Set from the spoken line. Tap to set by hand.' : 'Set by hand'}
        onClick={() => {
          setText(String(entry.duration));
          setEditing(true);
        }}
      >
        {formatDuration(entry.duration)}
      </button>
      {panel.durationOverride !== null && (
        <button type="button" className="link-btn" onClick={() => apply((b) => updatePanel(b, panel.id, { durationOverride: null }))}>
          Reset to auto
        </button>
      )}
    </>
  );
}

function SetupControl({ panel, board, apply }: { panel: Panel; board: Board; apply: BoardStore['apply'] }) {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const setup = board.setups.find((s) => s.id === panel.setupId) ?? null;

  const add = () => {
    setAdding(false);
    if (name.trim()) apply((b) => assignSetup(b, panel.id, name));
    setName('');
  };

  if (adding) {
    return (
      <input
        className="setup-input"
        type="text"
        aria-label="New setup name"
        placeholder="Side angle, B-roll: hands…"
        value={name}
        autoFocus
        autoComplete="off"
        onChange={(e) => setName(e.target.value)}
        onBlur={add}
        onKeyDown={(e) => {
          if (e.key === 'Enter') add();
          if (e.key === 'Escape') {
            setName('');
            setAdding(false);
          }
        }}
      />
    );
  }
  return (
    <span className="setup">
      <span className="setup-dot" style={{ background: setup?.color ?? 'transparent' }} data-empty={setup ? undefined : ''} aria-hidden="true" />
      <select
        aria-label="Setup"
        className={setup ? 'setup-select' : 'setup-select setup-select-empty'}
        value={setup?.id ?? ''}
        onChange={(e) => {
          const value = e.target.value;
          if (value === NEW_SETUP) {
            setAdding(true);
            return;
          }
          const chosen = board.setups.find((s) => s.id === value);
          apply((b) => assignSetup(b, panel.id, chosen?.name ?? null));
        }}
      >
        <option value="">No setup</option>
        {board.setups.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
        <option value={NEW_SETUP}>New setup…</option>
      </select>
    </span>
  );
}

interface PanelCardProps {
  panel: Panel;
  entry: TimelineEntry;
  board: Board;
  apply: BoardStore['apply'];
  onOpenSketch(panelId: string): void;
}

export const PanelCard = memo(function PanelCard({ panel, entry, board, apply, onOpenSketch }: PanelCardProps) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, isDragging, isOver } = useSortable({ id: panel.id });
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const cursor = useRef<number | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const close = (e: PointerEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, [menuOpen]);

  const rememberCursor = (e: { currentTarget: HTMLTextAreaElement }) => {
    cursor.current = e.currentTarget.selectionStart;
  };
  const run = (op: (b: Board) => Board) => {
    setMenuOpen(false);
    apply(op);
  };
  const detailCount = [panel.size, panel.angle, panel.movement].filter(Boolean).length;

  return (
    <article
      ref={setNodeRef}
      className="panel"
      aria-label={`Panel ${entry.number}`}
      data-dragging={isDragging || undefined}
      data-over={(isOver && !isDragging) || undefined}
      style={{ transform: isDragging ? CSS.Translate.toString(transform) : undefined }}
    >
      <button type="button" className="panel-sketch" data-format={board.format} aria-label="Edit sketch" onClick={() => onOpenSketch(panel.id)}>
        <SketchView sketch={panel.sketch} format={board.format} />
        {isSketchEmpty(panel.sketch) && (
          <span className="panel-sketch-hint">
            <IconPen />
            <span>Sketch</span>
          </span>
        )}
        {panel.filmed && <span className="panel-filmed">Filmed</span>}
      </button>

      <div className="panel-head">
        <button type="button" className="panel-grip" ref={setActivatorNodeRef} {...attributes} {...listeners} aria-label="Move panel">
          <IconGrip />
        </button>
        <span className="panel-number">{entry.number}</span>
        <div className="panel-timing">
          <span className="panel-time">{`${formatTime(entry.start)} – ${formatTime(entry.end)}`}</span>
          <DurationControl panel={panel} entry={entry} apply={apply} />
        </div>
        <div className="panel-menu" ref={menuRef}>
          <button
            type="button"
            className="icon-btn icon-btn-small"
            aria-label="Panel actions"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
          >
            <IconMore />
          </button>
          {menuOpen && (
            <div className="menu" onKeyDown={(e) => e.key === 'Escape' && setMenuOpen(false)}>
              <button type="button" onClick={() => run((b) => duplicatePanel(b, panel.id))}>
                Duplicate
              </button>
              <button type="button" onClick={() => run((b) => splitPanel(b, panel.id, cursor.current ?? panel.says.length))}>
                Split at cursor
              </button>
              <button type="button" onClick={() => run((b) => mergeWithPrevious(b, panel.id))}>
                Merge with previous
              </button>
              <button type="button" className="menu-danger" onClick={() => run((b) => deleteItem(b, panel.id))}>
                Delete panel
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="panel-body">
        <SetupControl panel={panel} board={board} apply={apply} />
        <AutoTextarea
          className="panel-says"
          aria-label="Says"
          placeholder="What you say"
          value={panel.says}
          onChange={(e) => {
            rememberCursor(e);
            const says = e.target.value;
            apply((b) => updatePanel(b, panel.id, { says }), `says:${panel.id}`);
          }}
          onSelect={rememberCursor}
          onKeyUp={rememberCursor}
          onClick={rememberCursor}
          onBlur={rememberCursor}
        />
        <AutoTextarea
          className="panel-notes"
          aria-label="Notes"
          placeholder="Notes, B-roll, action"
          value={panel.notes}
          onChange={(e) => {
            const notes = e.target.value;
            apply((b) => updatePanel(b, panel.id, { notes }), `notes:${panel.id}`);
          }}
        />
        <button type="button" className="details-toggle" aria-expanded={detailsOpen} onClick={() => setDetailsOpen((open) => !open)}>
          Details
          {detailCount > 0 && <span className="details-count">{detailCount}</span>}
        </button>
        {!detailsOpen && detailCount > 0 && (
          <p className="details-summary">{[panel.size, panel.angle, panel.movement].filter(Boolean).join(' · ')}</p>
        )}
        {detailsOpen && (
          <div className="details">
            {(Object.keys(SHOT_DETAILS) as DetailKey[]).map((key) => (
              <div key={key} className="chip-group" role="group" aria-label={DETAIL_LABELS[key]}>
                <span className="chip-group-label">{DETAIL_LABELS[key]}</span>
                {SHOT_DETAILS[key].map((value) => (
                  <button
                    key={value}
                    type="button"
                    className="chip"
                    aria-pressed={panel[key] === value}
                    onClick={() => apply((b) => updatePanel(b, panel.id, { [key]: panel[key] === value ? null : value }))}
                  >
                    {value}
                  </button>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </article>
  );
});
