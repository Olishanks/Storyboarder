import { deleteBoard, listBoards, loadBoard, saveBoard } from './db';
import { testBoard, testPanel, testSection, words } from '../model/testing';

test('save then load returns the board', async () => {
  const board = testBoard([testPanel({ says: 'hi' })], { id: 'db-1' });
  await saveBoard(board);
  expect(await loadBoard('db-1')).toEqual(board);
});

test('loading a board that does not exist gives undefined', async () => {
  expect(await loadBoard('missing')).toBeUndefined();
});

test('listBoards is newest first with duration and panelCount', async () => {
  await saveBoard(testBoard([testSection(), testPanel({ says: words(20) }), testPanel()], { id: 'db-old', updatedAt: 10 }));
  await saveBoard(testBoard([], { id: 'db-new', updatedAt: 20, title: 'Newer' }));
  const list = (await listBoards()).filter((b) => b.id === 'db-old' || b.id === 'db-new');
  expect(list.map((b) => b.id)).toEqual(['db-new', 'db-old']);
  expect(list[1]).toMatchObject({ duration: 11, panelCount: 2, format: '9:16', title: 'Test board' });
});

test('deleteBoard removes it', async () => {
  await saveBoard(testBoard([], { id: 'db-del' }));
  await deleteBoard('db-del');
  expect(await loadBoard('db-del')).toBeUndefined();
});
