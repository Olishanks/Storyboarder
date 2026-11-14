import { useEffect, useMemo, useState } from 'react';
import { SketchView } from '../draw/SketchView';
import { filmedCount, groupBySetup } from '../model/filming';
import { resetFilmed, updatePanel } from '../model/ops';
import { formatDuration, formatTime, timeline } from '../model/timing';
import type { Board, Panel, TimelineEntry } from '../model/types';
import type { BoardStore } from '../store/useBoard';
import { Confirm } from '../ui/Dialog';
import { IconBack, IconCheck } from '../ui/icons';

interface WakeLockSentinelLike {
  release(): Promise<void>;
}

/** Keeps the screen on while filming. Silently does nothing where unsupported or refused. */
function useWakeLock() {
  useEffect(() => {
    const wakeLock = (navigator as Navigator & { wakeLock?: { request(type: 'screen'): Promise<WakeLockSentinelLike> } }).wakeLock;
    if (!wakeLock) return;
    let lock: Promise<WakeLockSentinelLike | null> = Promise.resolve(null);
    const acquire = () => {
      lock = wakeLock.request('screen').catch(() => null);
    };
    const onVisibility = () => {
      if (document.visibilityState === 'visible') acquire();
    };
    acquire();
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      void lock.then((sentinel) => sentinel?.release()).catch(() => {});
    };
  }, []);
}

function ShotCard({ panel, entry, board, onToggle }: { panel: Panel; entry: TimelineEntry; board: Board; onToggle(): void }) {
  const setup = board.setups.find((s) => s.id === panel.setupId);
  const details = [panel.size, panel.angle, panel.movement].filter(Boolean).join(' · ');
  return (
    <article className="shot" aria-label={`Panel ${entry.number}`} data-filmed={panel.filmed || undefined}>
      <div className="shot-sketch" data-format={board.format}>
        <SketchView sketch={panel.sketch} format={board.format} />
      </div>
      <div className="shot-text">
        <p className="shot-meta">
          <span className="panel-number">{entry.number}</span>
          <span>{`${formatTime(entry.start)} – ${formatTime(entry.end)}`}</span>
          <span>{formatDuration(entry.duration)}</span>
          {setup && (
            <span className="setup-chip">
              <span className="setup-dot" style={{ background: setup.color }} aria-hidden="true" />
              {setup.name}
            </span>
          )}
        </p>
        {panel.says && <p className="shot-says">{panel.says}</p>}
        {panel.notes && <p className="shot-notes">{panel.notes}</p>}
        {details && <p className="shot-details">{details}</p>}
      </div>
      <label className="shot-tick">
        <input type="checkbox" className="visually-hidden" checked={panel.filmed} aria-label={`Panel ${entry.number} filmed`} onChange={onToggle} />
        <span className="tick-box" aria-hidden="true">
          <IconCheck size={30} />
        </span>
      </label>
    </article>
  );
}

export function Filming({ store }: { store: BoardStore }) {
  const board = store.board!;
  const [grouped, setGrouped] = useState(false);
  const [hideFilmed, setHideFilmed] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  useWakeLock();

  const entries = useMemo(() => new Map(timeline(board).map((e) => [e.panelId, e])), [board]);
  const count = filmedCount(board);
  const visible = (panel: Panel) => !(hideFilmed && panel.filmed);
  const card = (panel: Panel) => (
    <ShotCard
      key={panel.id}
      panel={panel}
      entry={entries.get(panel.id)!}
      board={board}
      onToggle={() => store.apply((b) => updatePanel(b, panel.id, { filmed: !panel.filmed }))}
    />
  );

  const allPanels = board.items.filter((i): i is Panel => i.type === 'panel');
  const anyVisible = allPanels.some(visible);

  return (
    <main className="film">
      <header className="film-bar">
        <a href={`#/board/${board.id}`} className="back-link">
          <IconBack />
          <span>Board</span>
        </a>
        <div className="board-title">
          <h1>{board.title}</h1>
          <p className="board-meta">{`${count.filmed} of ${count.total} filmed`}</p>
        </div>
        <div className="film-options">
          <label className="switch">
            <input type="checkbox" checked={grouped} onChange={(e) => setGrouped(e.target.checked)} />
            <span>Group by setup</span>
          </label>
          <label className="switch">
            <input type="checkbox" checked={hideFilmed} onChange={(e) => setHideFilmed(e.target.checked)} />
            <span>Hide filmed</span>
          </label>
          <button type="button" className="btn" disabled={count.filmed === 0} onClick={() => setConfirmReset(true)}>
            Reset all ticks
          </button>
        </div>
        <progress className="film-progress" max={Math.max(1, count.total)} value={count.filmed} aria-label="Shots filmed" />
      </header>

      {count.total === 0 ? (
        <div className="empty">
          <h2>No panels to film yet</h2>
          <p>Add panels to the board first. Each one becomes a shot to tick off here.</p>
          <a className="btn btn-primary" href={`#/board/${board.id}`}>
            Back to the board
          </a>
        </div>
      ) : !anyVisible ? (
        <div className="empty">
          <h2>Everything is filmed</h2>
          <p>All {count.total} shots are ticked. Turn off “Hide filmed” to see them again.</p>
        </div>
      ) : grouped ? (
        groupBySetup(board)
          .filter((group) => group.panels.some((p) => visible(p.panel)))
          .map((group) => (
            <section key={group.setup?.id ?? 'none'} className="film-group" role="group" aria-label={group.setup?.name ?? 'No setup'}>
              <h2>
                {group.setup && <span className="setup-dot" style={{ background: group.setup.color }} aria-hidden="true" />}
                {group.setup?.name ?? 'No setup'}
                <span className="film-group-count">{`${group.panels.filter((p) => p.panel.filmed).length} of ${group.panels.length}`}</span>
              </h2>
              <div className="shot-list">{group.panels.filter((p) => visible(p.panel)).map((p) => card(p.panel))}</div>
            </section>
          ))
      ) : (
        <div className="shot-list">{allPanels.filter(visible).map(card)}</div>
      )}

      {confirmReset && (
        <Confirm
          title="Reset all ticks?"
          message="Every shot goes back to not filmed."
          confirmLabel="Reset"
          onCancel={() => setConfirmReset(false)}
          onConfirm={() => {
            setConfirmReset(false);
            store.apply(resetFilmed);
          }}
        />
      )}
    </main>
  );
}
