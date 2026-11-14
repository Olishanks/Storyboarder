import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PrintView } from './PrintView';
import { testBoard, testPanel, testSection, words } from '../model/testing';
import { renderWithBoard } from '../test-utils';

function board() {
  return testBoard(
    [
      testSection({ title: 'Hook', collapsed: true }),
      testPanel({ says: words(20), setupId: 'front', notes: 'Smile', size: 'Close-up' }),
      testPanel({ says: 'Second' }),
    ],
    { title: 'Desk tour', setups: [{ id: 'front', name: 'Front', color: '#e8590c' }] },
  );
}

const open = () => renderWithBoard(board(), (store) => <PrintView store={store} />);

test('renders every panel with number, timestamps, setup, line, notes and details, including collapsed sections', async () => {
  await open();
  expect(screen.getByRole('heading', { level: 1, name: 'Desk tour' })).toBeInTheDocument();
  expect(screen.getByRole('heading', { level: 2, name: 'Hook' })).toBeInTheDocument();
  const first = screen.getByRole('article', { name: 'Panel 1' });
  expect(within(first).getByText('0:00 – 0:08')).toBeInTheDocument();
  expect(within(first).getByText('Front')).toBeInTheDocument();
  expect(within(first).getByText(words(20))).toBeInTheDocument();
  expect(within(first).getByText('Smile')).toBeInTheDocument();
  expect(within(first).getByText('Close-up')).toBeInTheDocument();
  expect(screen.getByRole('article', { name: 'Panel 2' })).toBeInTheDocument();
});

test('the panels-per-row choice sets the grid', async () => {
  const user = userEvent.setup();
  await open();
  const sheet = screen.getByTestId('print-sheet');
  // Vertical boards start at 4 per row so a page holds more than one row.
  expect(sheet).toHaveAttribute('data-columns', '4');
  await user.click(screen.getByRole('radio', { name: '3 per row' }));
  expect(sheet).toHaveAttribute('data-columns', '3');
});

test('the Print button opens the print dialog', async () => {
  const user = userEvent.setup();
  const print = vi.spyOn(window, 'print').mockImplementation(() => {});
  await open();
  await user.click(screen.getByRole('button', { name: 'Print or save as PDF' }));
  expect(print).toHaveBeenCalled();
  print.mockRestore();
});
