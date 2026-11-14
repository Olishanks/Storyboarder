import { useEffect, useMemo, useRef, useState } from 'react';
import { SketchView } from '../draw/SketchView';
import { formatTime, timeline } from '../model/timing';
import type { Panel } from '../model/types';
import type { BoardStore } from '../store/useBoard';
import { IconBack, IconClose, IconForward, IconPause, IconPlay } from '../ui/icons';

const TICK_MS = 50;

export function Playthrough({ store }: { store: BoardStore }) {
  const board = store.board!;
  const entries = useMemo(() => timeline(board), [board]);
  const panels = useMemo(() => new Map(board.items.filter((i): i is Panel => i.type === 'panel').map((p) => [p.id, p])), [board.items]);
  const total = entries.length === 0 ? 0 : entries[entries.length - 1].end;

  const [position, setPosition] = useState(0);
  const [playing, setPlaying] = useState(false);
  // The ref is the clock's own record: several ticks can land before React renders again.
  const positionRef = useRef(0);
  const seek = (seconds: number) => {
    positionRef.current = seconds;
    setPosition(seconds);
  };

  useEffect(() => {
    if (!playing) return;
    let last = Date.now();
    const timer = setInterval(() => {
      const now = Date.now();
      const next = positionRef.current + (now - last) / 1000;
      last = now;
      if (next >= total) {
        seek(total);
        setPlaying(false);
      } else {
        seek(next);
      }
    }, TICK_MS);
    return () => clearInterval(timer);
  }, [playing, total]);

  const close = (
    <a href={`#/board/${board.id}`} className="icon-btn play-close" aria-label="Close playthrough">
      <IconClose />
    </a>
  );

  if (entries.length === 0) {
    return (
      <main className="play">
        {close}
        <div className="empty">
          <h1>Nothing to play yet</h1>
          <p>Add panels to the board, then come back to watch them run at their timed lengths.</p>
          <a className="btn btn-primary" href={`#/board/${board.id}`}>
            Back to the board
          </a>
        </div>
      </main>
    );
  }

  let currentIndex = 0;
  entries.forEach((entry, i) => {
    if (entry.start <= position) currentIndex = i;
  });
  const entry = entries[currentIndex];
  const panel = panels.get(entry.panelId)!;
  const setup = board.setups.find((s) => s.id === panel.setupId);

  const jump = (seconds: number) => seek(Math.max(0, Math.min(total, seconds)));
  const toggle = () => {
    if (!playing && position >= total) seek(0);
    setPlaying((p) => !p);
  };

  return (
    <main className="play" data-format={board.format}>
      <header className="play-head">
        <span className="play-count">{`Panel ${entry.number} of ${entries.length}`}</span>
        {setup && (
          <span className="setup-chip">
            <span className="setup-dot" style={{ background: setup.color }} aria-hidden="true" />
            {setup.name}
          </span>
        )}
        {close}
      </header>

      <div className="play-stage">
        <div className="play-frame" data-format={board.format}>
          <SketchView sketch={panel.sketch} format={board.format} />
          <button type="button" className="play-step play-step-back" aria-label="Previous panel" onClick={() => jump(entries[Math.max(0, currentIndex - 1)].start)}>
            <IconBack />
          </button>
          <button
            type="button"
            className="play-step play-step-forward"
            aria-label="Next panel"
            onClick={() => jump(currentIndex + 1 < entries.length ? entries[currentIndex + 1].start : total)}
          >
            <IconForward />
          </button>
        </div>
        <div className="play-caption">
          {panel.says && <p className="play-says">{panel.says}</p>}
          {panel.notes && <p className="play-notes">{panel.notes}</p>}
        </div>
      </div>

      <footer className="play-controls">
        <button type="button" className="icon-btn play-toggle" aria-label={playing ? 'Pause' : 'Play'} onClick={toggle}>
          {playing ? <IconPause /> : <IconPlay />}
        </button>
        <input
          type="range"
          className="play-scrub"
          aria-label="Position"
          min={0}
          max={total}
          step={0.1}
          value={position}
          onChange={(e) => jump(Number(e.target.value))}
        />
        <span className="play-time">{`${formatTime(position)} / ${formatTime(total)}`}</span>
      </footer>
    </main>
  );
}
