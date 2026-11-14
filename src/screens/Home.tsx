import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { parseBoardFile } from '../model/file';
import { appendScript, newBoard, uid } from '../model/ops';
import { parseScript } from '../model/script';
import { formatTime } from '../model/timing';
import type { Format } from '../model/types';
import { navigate } from '../router';
import { deleteBoard, listBoards, loadBoard, saveBoard, type BoardSummary } from '../store/db';
import { Confirm, Dialog } from '../ui/Dialog';
import { FormatPicker } from '../ui/FormatPicker';
import { IconCopy, IconPlus, IconTrash, IconUpload } from '../ui/icons';

const BACKUP_AFTER_MS = 30 * 24 * 60 * 60 * 1000;
const SAVE_FAILED =
  'This device couldn’t save the board. Its storage may be full or blocked (private browsing does this). Free some space, or close the app fully and open it again.';

function editedLabel(updatedAt: number): string {
  return `Edited ${new Date(updatedAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}`;
}

function needsBackup(board: BoardSummary, now: number): boolean {
  return now - (board.lastExportedAt ?? board.createdAt) > BACKUP_AFTER_MS;
}

function panelCountLabel(count: number): string {
  return `${count} ${count === 1 ? 'panel' : 'panels'}`;
}

function NewBoardDialog({ onClose }: { onClose(): void }) {
  const [title, setTitle] = useState('');
  const [format, setFormat] = useState<Format>('9:16');
  const [script, setScript] = useState('');
  const [failed, setFailed] = useState(false);

  const create = async (event: FormEvent) => {
    event.preventDefault();
    let board = newBoard(title, format);
    const parsed = parseScript(script, 'paragraph');
    if (parsed.length > 0) board = appendScript(board, parsed);
    try {
      await saveBoard(board);
    } catch {
      setFailed(true);
      return;
    }
    navigate(`/board/${board.id}`);
  };

  return (
    <Dialog title="New board" onClose={onClose}>
      <form onSubmit={create} className="form">
        <label className="field">
          <span className="field-label">Title</span>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Untitled board"
            autoComplete="off"
            data-autofocus
          />
        </label>
        <FormatPicker value={format} onChange={setFormat} />
        <label className="field">
          <span className="field-label">Script (optional)</span>
          <textarea
            value={script}
            onChange={(e) => setScript(e.target.value)}
            rows={5}
            placeholder="Paste your script. Each paragraph becomes a panel; a line starting with # becomes a section."
          />
        </label>
        {failed && (
          <p role="alert" className="notice notice-error">
            {SAVE_FAILED}
          </p>
        )}
        <div className="dialog-actions">
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary">
            Create board
          </button>
        </div>
      </form>
    </Dialog>
  );
}

export function Home() {
  const [boards, setBoards] = useState<BoardSummary[] | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<BoardSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setBoards(await listBoards());
    } catch {
      setBoards([]);
      setError("This browser won't let the app save boards. Private browsing can cause this.");
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const importFile = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    const result = parseBoardFile(await file.text());
    if (!result.ok) {
      setError(result.error);
      return;
    }
    try {
      await saveBoard(result.board);
    } catch {
      setError(SAVE_FAILED);
      return;
    }
    await refresh();
  };

  const duplicate = async (summary: BoardSummary) => {
    const board = await loadBoard(summary.id);
    if (!board) return;
    const now = Date.now();
    setError(null);
    try {
      await saveBoard({ ...board, id: uid(), title: `${board.title} copy`, createdAt: now, updatedAt: now, lastExportedAt: null });
    } catch {
      setError(SAVE_FAILED);
      return;
    }
    await refresh();
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    const target = deleting;
    setDeleting(null);
    setError(null);
    try {
      await deleteBoard(target.id);
    } catch {
      setError(`This device couldn’t delete “${target.title}”. Close the app fully, open it again and retry.`);
      return;
    }
    await refresh();
  };

  const now = Date.now();

  return (
    <main className="home">
      <header className="home-header">
        <h1>Storyboards</h1>
        <div className="home-actions">
          <label className="btn file-button">
            <IconUpload />
            <span>Import board file</span>
            <input
              type="file"
              accept=".json,application/json"
              className="visually-hidden"
              onChange={(e) => {
                void importFile(e.target.files?.[0]);
                e.target.value = '';
              }}
            />
          </label>
          <button type="button" className="btn btn-primary" onClick={() => setCreating(true)}>
            <IconPlus />
            <span>New board</span>
          </button>
        </div>
      </header>

      {error && (
        <p role="alert" className="notice notice-error">
          {error}
        </p>
      )}

      {boards === null ? (
        <ul className="board-list" aria-busy="true">
          {[0, 1, 2].map((i) => (
            <li key={i} className="board-card board-card-skeleton" />
          ))}
        </ul>
      ) : boards.length === 0 ? (
        <div className="empty">
          <h2>No boards yet</h2>
          <p>
            A board is one video: a row of panels, each with a sketch, what you say, and how long it runs. Start one
            from a script or from blank panels.
          </p>
          <button type="button" className="btn btn-primary" onClick={() => setCreating(true)}>
            <IconPlus />
            <span>Create your first board</span>
          </button>
        </div>
      ) : (
        <ul className="board-list">
          {boards.map((board) => (
            <li key={board.id} className="board-card">
              <span className={`board-shape board-shape-${board.format === '9:16' ? 'v' : 'h'}`} aria-hidden="true" />
              <div className="board-card-text">
                <a href={`#/board/${board.id}`} className="board-card-title">
                  {board.title}
                </a>
                <p className="board-card-meta">
                  {`${board.format} · ${formatTime(board.duration)} · ${panelCountLabel(board.panelCount)}`}
                </p>
                <p className="board-card-hint">
                  <span>{editedLabel(board.updatedAt)}</span>
                  {needsBackup(board, now) && <span className="board-card-warning">Not backed up recently</span>}
                </p>
              </div>
              <div className="board-card-actions">
                <button type="button" className="icon-btn" aria-label={`Duplicate ${board.title}`} onClick={() => void duplicate(board)}>
                  <IconCopy />
                </button>
                <button type="button" className="icon-btn" aria-label={`Delete ${board.title}`} onClick={() => setDeleting(board)}>
                  <IconTrash />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {creating && <NewBoardDialog onClose={() => setCreating(false)} />}
      {deleting && (
        <Confirm
          title="Delete board?"
          message={`“${deleting.title}” and its sketches will be removed from this device. This can't be undone.`}
          confirmLabel="Delete"
          onConfirm={() => void confirmDelete()}
          onCancel={() => setDeleting(null)}
        />
      )}
    </main>
  );
}
