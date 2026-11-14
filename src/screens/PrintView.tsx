import { useId, useMemo, useState } from 'react';
import { SketchView } from '../draw/SketchView';
import { groupItems } from '../model/groups';
import { formatDuration, formatTime, timeline } from '../model/timing';
import type { BoardStore } from '../store/useBoard';
import { IconBack, IconPrint } from '../ui/icons';
import { countLabel } from './BoardScreen';

const COLUMN_CHOICES = [2, 3, 4];

export function PrintView({ store }: { store: BoardStore }) {
  const board = store.board!;
  const [columns, setColumns] = useState(board.format === '9:16' ? 4 : 3);
  const radioName = useId();
  const entries = useMemo(() => timeline(board), [board]);
  const entryById = useMemo(() => new Map(entries.map((e) => [e.panelId, e])), [entries]);
  const groups = useMemo(() => groupItems(board.items), [board.items]);
  const total = entries.length === 0 ? 0 : entries[entries.length - 1].end;

  return (
    <main className="print">
      <header className="print-controls no-print">
        <a href={`#/board/${board.id}`} className="back-link">
          <IconBack />
          <span>Board</span>
        </a>
        <fieldset className="choice-row">
          <legend>Panels per row</legend>
          {COLUMN_CHOICES.map((n) => (
            <label key={n}>
              <input type="radio" name={radioName} checked={columns === n} onChange={() => setColumns(n)} />
              <span>{`${n} per row`}</span>
            </label>
          ))}
        </fieldset>
        <button type="button" className="btn btn-primary" onClick={() => window.print()}>
          <IconPrint />
          <span>Print or save as PDF</span>
        </button>
      </header>
      <p className="print-hint no-print">On iPad, choose Print, then pinch outward on the preview to turn it into a PDF you can save or share.</p>

      <div className="print-sheet" data-testid="print-sheet" data-columns={columns} style={{ ['--columns' as string]: columns }}>
        <header className="print-title">
          <h1>{board.title}</h1>
          <p>{`${board.format} · ${countLabel(total, entries.length)}`}</p>
        </header>
        {groups.map((group) => (
          <section key={group.section?.id ?? 'unsectioned'} className="print-group">
            {group.section && <h2>{group.section.title || 'Untitled section'}</h2>}
            <div className="print-grid">
              {group.panels.map(({ panel }) => {
                const entry = entryById.get(panel.id)!;
                const setup = board.setups.find((s) => s.id === panel.setupId);
                const details = [panel.size, panel.angle, panel.movement].filter(Boolean).join(' · ');
                return (
                  <article key={panel.id} className="print-panel" aria-label={`Panel ${entry.number}`}>
                    <div className="print-sketch" data-format={board.format}>
                      <SketchView sketch={panel.sketch} format={board.format} />
                    </div>
                    <p className="print-meta">
                      <span className="panel-number">{entry.number}</span>
                      <span>{`${formatTime(entry.start)} – ${formatTime(entry.end)}`}</span>
                      <span>{formatDuration(entry.duration)}</span>
                    </p>
                    {setup && <p className="print-setup">{setup.name}</p>}
                    {panel.says && <p className="print-says">{panel.says}</p>}
                    {panel.notes && <p className="print-notes">{panel.notes}</p>}
                    {details && <p className="print-details">{details}</p>}
                  </article>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}
