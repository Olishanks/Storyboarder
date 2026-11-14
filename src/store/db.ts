import { openDB, type IDBPDatabase } from 'idb';
import { totalDuration } from '../model/timing';
import type { Board, Format } from '../model/types';

export interface BoardSummary {
  id: string;
  title: string;
  format: Format;
  createdAt: number;
  updatedAt: number;
  lastExportedAt: number | null;
  duration: number;
  panelCount: number;
}

const STORE = 'boards';
let dbPromise: Promise<IDBPDatabase> | null = null;

function db(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB('storyboard', 1, {
      upgrade(database) {
        database.createObjectStore(STORE, { keyPath: 'id' });
      },
      // Safari can drop the connection while the app sits in the background: reopen on next use.
      terminated() {
        dbPromise = null;
      },
    });
    dbPromise.catch(() => {
      dbPromise = null;
    });
  }
  return dbPromise;
}

export async function listBoards(): Promise<BoardSummary[]> {
  const boards = (await (await db()).getAll(STORE)) as Board[];
  return boards
    .map((board) => ({
      id: board.id,
      title: board.title,
      format: board.format,
      createdAt: board.createdAt,
      updatedAt: board.updatedAt,
      lastExportedAt: board.lastExportedAt,
      duration: totalDuration(board),
      panelCount: board.items.filter((item) => item.type === 'panel').length,
    }))
    .sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function loadBoard(id: string): Promise<Board | undefined> {
  return (await (await db()).get(STORE, id)) as Board | undefined;
}

export async function saveBoard(board: Board): Promise<void> {
  await (await db()).put(STORE, board);
}

export async function deleteBoard(id: string): Promise<void> {
  await (await db()).delete(STORE, id);
}

/** Asks the browser not to evict this site's data. False when unsupported or refused. */
export async function requestPersistence(): Promise<boolean> {
  try {
    return (await navigator.storage?.persist?.()) ?? false;
  } catch {
    return false;
  }
}
