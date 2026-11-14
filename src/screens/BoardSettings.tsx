import { useState } from 'react';
import { updateBoard } from '../model/ops';
import type { BoardStore } from '../store/useBoard';
import { Dialog } from '../ui/Dialog';
import { FormatPicker } from '../ui/FormatPicker';
import { IconMinus, IconPlus } from '../ui/icons';

const MIN_PACE = 60;
const MAX_PACE = 300;

export function BoardSettings({ store, onClose }: { store: BoardStore; onClose(): void }) {
  const board = store.board!;
  // Typed text is kept apart from the board so half-typed numbers are not fought by the saved value.
  const [paceText, setPaceText] = useState(String(board.wordsPerMinute));
  return (
    <Dialog title="Board settings" onClose={onClose}>
      <div className="form">
        <label className="field">
          <span className="field-label">Title</span>
          <input
            type="text"
            value={board.title}
            autoComplete="off"
            onChange={(e) => store.apply((b) => ({ ...updateBoard(b, {}), title: e.target.value }), 'board-title')}
            onBlur={() => store.apply((b) => (b.title.trim() ? b : updateBoard({ ...b, title: 'Untitled board' }, {})))}
          />
        </label>
        <FormatPicker value={board.format} onChange={(format) => store.apply((b) => updateBoard(b, { format }))} />
        <label className="field">
          <span className="field-label">Speaking pace (words per minute)</span>
          <input
            type="number"
            inputMode="numeric"
            min={MIN_PACE}
            max={MAX_PACE}
            step={5}
            value={paceText}
            onChange={(e) => {
              setPaceText(e.target.value);
              const wordsPerMinute = Number(e.target.value);
              if (wordsPerMinute >= MIN_PACE && wordsPerMinute <= MAX_PACE) {
                store.apply((b) => updateBoard(b, { wordsPerMinute }), 'board-pace');
              }
            }}
            onBlur={() => setPaceText(String(board.wordsPerMinute))}
          />
          <span className="field-hint">
            Between {MIN_PACE} and {MAX_PACE}. Sets how long each spoken line runs; most people talk at 130 to 170.
          </span>
        </label>
        <div className="field">
          <span className="field-label">Panels per row</span>
          <div className="stepper">
            <button
              type="button"
              className="icon-btn"
              aria-label="Fewer panels per row"
              disabled={board.panelsPerRow <= 1}
              onClick={() => store.apply((b) => updateBoard(b, { panelsPerRow: b.panelsPerRow - 1 }))}
            >
              <IconMinus />
            </button>
            <output>{board.panelsPerRow}</output>
            <button
              type="button"
              className="icon-btn"
              aria-label="More panels per row"
              disabled={board.panelsPerRow >= 6}
              onClick={() => store.apply((b) => updateBoard(b, { panelsPerRow: b.panelsPerRow + 1 }))}
            >
              <IconPlus />
            </button>
          </div>
        </div>
      </div>
      <div className="dialog-actions">
        <button type="button" className="btn btn-primary" onClick={onClose}>
          Done
        </button>
      </div>
    </Dialog>
  );
}
