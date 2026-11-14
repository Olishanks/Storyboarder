import { useId, useMemo, useState } from 'react';
import { appendScript } from '../model/ops';
import { parseScript, type ScriptMode } from '../model/script';
import type { BoardStore } from '../store/useBoard';
import { Dialog } from '../ui/Dialog';

export function ScriptImport({ store, onClose }: { store: BoardStore; onClose(): void }) {
  const [text, setText] = useState('');
  const [mode, setMode] = useState<ScriptMode>('paragraph');
  const modeName = useId();
  const parsed = useMemo(() => parseScript(text, mode), [text, mode]);
  const panelCount = parsed.filter((item) => item.kind === 'panel').length;

  const add = () => {
    store.apply((board) => appendScript(board, parsed));
    onClose();
  };

  return (
    <Dialog title="Add script" onClose={onClose} wide>
      <div className="script-import">
        <div className="form">
          <label className="field">
            <span className="field-label">Script</span>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={10}
              placeholder={'# Hook\nYour opening line.\n\nThe next beat, as its own paragraph.'}
              data-autofocus
            />
          </label>
          <fieldset className="choice-row">
            <legend>Split into panels</legend>
            <label>
              <input type="radio" name={modeName} checked={mode === 'paragraph'} onChange={() => setMode('paragraph')} />
              <span>One panel per paragraph</span>
            </label>
            <label>
              <input type="radio" name={modeName} checked={mode === 'sentence'} onChange={() => setMode('sentence')} />
              <span>One panel per sentence</span>
            </label>
          </fieldset>
        </div>
        <div className="script-preview">
          <h3 id={`${modeName}-preview`}>Preview</h3>
          {parsed.length === 0 ? (
            <p className="muted">Paragraphs become panels. A line starting with # becomes a section heading.</p>
          ) : (
            <ol aria-labelledby={`${modeName}-preview`} className="script-preview-list">
              {parsed.map((item, i) =>
                item.kind === 'section' ? (
                  <li key={i} className="script-preview-section">
                    {item.title}
                  </li>
                ) : (
                  <li key={i}>{item.says}</li>
                ),
              )}
            </ol>
          )}
        </div>
      </div>
      <div className="dialog-actions">
        <button type="button" className="btn" onClick={onClose}>
          Cancel
        </button>
        <button type="button" className="btn btn-primary" disabled={panelCount === 0} onClick={add}>
          {panelCount === 0 ? 'Add panels' : `Add ${panelCount} ${panelCount === 1 ? 'panel' : 'panels'}`}
        </button>
      </div>
    </Dialog>
  );
}
