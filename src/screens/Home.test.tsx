import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Home } from './Home';
import { deleteBoard, listBoards, loadBoard, saveBoard } from '../store/db';
import { serializeBoard } from '../model/file';
import { testBoard, testPanel, words } from '../model/testing';
import type { Panel } from '../model/types';

const DAY = 24 * 60 * 60 * 1000;

beforeEach(async () => {
  for (const board of await listBoards()) await deleteBoard(board.id);
});

test('empty state invites creating the first board', async () => {
  render(<Home />);
  expect(await screen.findByText('No boards yet')).toBeInTheDocument();
});

test('lists saved boards with title, format and length', async () => {
  await saveBoard(testBoard([testPanel({ says: words(20) }), testPanel()], { id: 'h1', title: 'Desk tour' }));
  render(<Home />);
  expect(await screen.findByRole('link', { name: 'Desk tour' })).toHaveAttribute('href', '#/board/h1');
  expect(screen.getByText('9:16 · 0:11 · 2 panels')).toBeInTheDocument();
});

test('"New board" with a title and a format creates it and opens it', async () => {
  const user = userEvent.setup();
  render(<Home />);
  await user.click(await screen.findByRole('button', { name: 'New board' }));
  const dialog = screen.getByRole('dialog', { name: 'New board' });
  await user.type(within(dialog).getByRole('textbox', { name: 'Title' }), 'Launch video');
  await user.click(within(dialog).getByRole('radio', { name: /Horizontal 16:9/ }));
  await user.click(within(dialog).getByRole('button', { name: 'Create board' }));
  await waitFor(() => expect(window.location.hash).toMatch(/^#\/board\/.+/));
  const [created] = await listBoards();
  expect(created).toMatchObject({ title: 'Launch video', format: '16:9' });
});

test('a new board can start from a pasted script', async () => {
  const user = userEvent.setup();
  render(<Home />);
  await user.click(await screen.findByRole('button', { name: 'New board' }));
  const dialog = screen.getByRole('dialog', { name: 'New board' });
  await user.type(within(dialog).getByRole('textbox', { name: 'Title' }), 'Scripted');
  await user.type(within(dialog).getByRole('textbox', { name: /Script/ }), 'First line.{Enter}{Enter}Second line.');
  await user.click(within(dialog).getByRole('button', { name: 'Create board' }));
  await waitFor(() => expect(window.location.hash).toMatch(/^#\/board\/.+/));
  const [summary] = await listBoards();
  const board = await loadBoard(summary.id);
  expect(board?.items.map((i) => (i as Panel).says)).toEqual(['First line.', 'Second line.']);
});

test('delete asks for confirmation before removing', async () => {
  const user = userEvent.setup();
  await saveBoard(testBoard([], { id: 'h2', title: 'Old idea' }));
  render(<Home />);
  await user.click(await screen.findByRole('button', { name: 'Delete Old idea' }));
  expect((await listBoards()).map((b) => b.id)).toContain('h2');
  const dialog = screen.getByRole('dialog', { name: 'Delete board?' });
  await user.click(within(dialog).getByRole('button', { name: 'Delete' }));
  await waitFor(() => expect(screen.queryByRole('link', { name: 'Old idea' })).not.toBeInTheDocument());
  expect(await listBoards()).toEqual([]);
});

test('duplicate adds a copy', async () => {
  const user = userEvent.setup();
  await saveBoard(testBoard([testPanel({ says: 'hi' })], { id: 'h3', title: 'Original' }));
  render(<Home />);
  await user.click(await screen.findByRole('button', { name: 'Duplicate Original' }));
  expect(await screen.findByRole('link', { name: 'Original copy' })).toBeInTheDocument();
  expect(await listBoards()).toHaveLength(2);
});

test('importing a board file adds it', async () => {
  const user = userEvent.setup();
  render(<Home />);
  const file = new File([serializeBoard(testBoard([testPanel()], { title: 'Imported' }))], 'x.storyboard.json');
  await user.upload(await screen.findByLabelText('Import board file'), file);
  expect(await screen.findByRole('link', { name: 'Imported' })).toBeInTheDocument();
});

test('importing an invalid file shows the reason and adds nothing', async () => {
  const user = userEvent.setup();
  render(<Home />);
  await user.upload(await screen.findByLabelText('Import board file'), new File(['hello'], 'notes.json'));
  expect(await screen.findByRole('alert')).toHaveTextContent("This isn't a storyboard file.");
  expect(await listBoards()).toEqual([]);
});

test('a board not exported for over 30 days shows a back-up hint; a fresh one does not', async () => {
  const now = Date.now();
  await saveBoard(testBoard([], { id: 'old', title: 'Old', createdAt: now - 40 * DAY, lastExportedAt: null }));
  await saveBoard(testBoard([], { id: 'stale', title: 'Stale', createdAt: now - 90 * DAY, lastExportedAt: now - 31 * DAY }));
  await saveBoard(testBoard([], { id: 'fresh', title: 'Fresh', createdAt: now - DAY, lastExportedAt: null }));
  render(<Home />);
  const card = async (name: string) => (await screen.findByRole('link', { name })).closest('li')!;
  expect(within(await card('Old')).getByText('Not backed up recently')).toBeInTheDocument();
  expect(within(await card('Stale')).getByText('Not backed up recently')).toBeInTheDocument();
  expect(within(await card('Fresh')).queryByText('Not backed up recently')).not.toBeInTheDocument();
});

test('each board shows when it was last edited', async () => {
  const edited = new Date(2026, 9, 3, 12).getTime();
  await saveBoard(testBoard([], { id: 'dated', title: 'Dated', updatedAt: edited }));
  render(<Home />);
  const card = (await screen.findByRole('link', { name: 'Dated' })).closest('li')!;
  const expected = new Date(edited).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
  expect(within(card).getByText(`Edited ${expected}`)).toBeInTheDocument();
});
