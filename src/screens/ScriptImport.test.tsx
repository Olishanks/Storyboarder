import { fireEvent, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BoardScreen } from './BoardScreen';
import { testBoard, testPanel } from '../model/testing';
import { renderWithBoard } from '../test-utils';

vi.mock('../download', () => ({ downloadText: vi.fn() }));

async function openImport() {
  const user = userEvent.setup();
  const view = await renderWithBoard(testBoard([testPanel({ says: 'Existing' })]), (store) => <BoardScreen store={store} />);
  await user.click(screen.getByRole('button', { name: 'Add script' }));
  const dialog = screen.getByRole('dialog', { name: 'Add script' });
  const paste = (text: string) =>
    fireEvent.change(within(dialog).getByRole('textbox', { name: 'Script' }), { target: { value: text } });
  return { user, view, dialog, paste };
}

test('preview lists the panels and headings the paste will create', async () => {
  const { dialog, paste } = await openImport();
  paste('# Hook\nFirst line.\n\nSecond line. Third.');
  const preview = within(dialog).getByRole('list', { name: 'Preview' });
  expect(within(preview).getAllByRole('listitem').map((li) => li.textContent)).toEqual([
    'Hook',
    'First line.',
    'Second line. Third.',
  ]);
  expect(within(dialog).getByRole('button', { name: 'Add 2 panels' })).toBeEnabled();
});

test('switching to "one panel per sentence" updates the preview', async () => {
  const { user, dialog, paste } = await openImport();
  paste('Second line. Third.');
  await user.click(within(dialog).getByRole('radio', { name: 'One panel per sentence' }));
  expect(within(dialog).getByRole('button', { name: 'Add 2 panels' })).toBeEnabled();
});

test('the add button is disabled when the paste has no panels', async () => {
  const { dialog, paste } = await openImport();
  expect(within(dialog).getByRole('button', { name: 'Add panels' })).toBeDisabled();
  paste('   \n\n# Only a heading');
  expect(within(dialog).getByRole('button', { name: 'Add panels' })).toBeDisabled();
});

test('importing appends to the board in one undo step', async () => {
  const { user, view, dialog, paste } = await openImport();
  paste('First line.\n\nSecond line.');
  await user.click(within(dialog).getByRole('button', { name: 'Add 2 panels' }));
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(view.current().items).toHaveLength(3);
  await user.click(screen.getByRole('button', { name: 'Undo' }));
  expect(view.current().items).toHaveLength(1);
});
