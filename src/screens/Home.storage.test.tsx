import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Home } from './Home';
import { serializeBoard } from '../model/file';
import { testBoard } from '../model/testing';

// A device that lists boards but refuses every write: full storage, or a dropped connection.
vi.mock('../store/db', async (original) => ({
  ...(await original<typeof import('../store/db')>()),
  listBoards: vi.fn(async () => [
    { id: 'x', title: 'Existing', format: '9:16', createdAt: 1, updatedAt: 1, lastExportedAt: 1, duration: 0, panelCount: 0 },
  ]),
  saveBoard: vi.fn(async () => {
    throw new Error('quota');
  }),
  deleteBoard: vi.fn(async () => {
    throw new Error('quota');
  }),
}));

const MESSAGE = /couldn’t save/i;

test('creating a board when storage refuses says so and stays on the dialog', async () => {
  const user = userEvent.setup();
  render(<Home />);
  await user.click(await screen.findByRole('button', { name: 'New board' }));
  const dialog = screen.getByRole('dialog', { name: 'New board' });
  await user.type(within(dialog).getByRole('textbox', { name: 'Title' }), 'Launch');
  await user.click(within(dialog).getByRole('button', { name: 'Create board' }));
  expect(await within(dialog).findByRole('alert')).toHaveTextContent(MESSAGE);
  expect(window.location.hash).not.toMatch(/board/);
});

test('importing when storage refuses says so', async () => {
  const user = userEvent.setup();
  render(<Home />);
  const file = new File([serializeBoard(testBoard([], { title: 'Imported' }))], 'x.storyboard.json');
  await user.upload(await screen.findByLabelText('Import board file'), file);
  expect(await screen.findByRole('alert')).toHaveTextContent(MESSAGE);
});

test('deleting when storage refuses says so and keeps the board listed', async () => {
  const user = userEvent.setup();
  render(<Home />);
  await user.click(await screen.findByRole('button', { name: 'Delete Existing' }));
  await user.click(within(screen.getByRole('dialog', { name: 'Delete board?' })).getByRole('button', { name: 'Delete' }));
  expect(await screen.findByRole('alert')).toHaveTextContent(/couldn’t delete/i);
  expect(screen.getByRole('link', { name: 'Existing' })).toBeInTheDocument();
});
