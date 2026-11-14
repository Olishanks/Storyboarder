import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Filming } from './Filming';
import { testBoard, testPanel } from '../model/testing';
import type { Panel } from '../model/types';
import { renderWithBoard } from '../test-utils';

const setups = [
  { id: 'front', name: 'Front', color: '#e8590c' },
  { id: 'side', name: 'Side angle', color: '#1c7ed6' },
];

function board() {
  return testBoard(
    [
      testPanel({ says: 'One', setupId: 'front' }),
      testPanel({ says: 'Two', setupId: 'side', notes: 'Lean in' }),
      testPanel({ says: 'Three', setupId: 'front' }),
      testPanel({ says: 'Four' }),
    ],
    { setups },
  );
}

const open = (b = board()) => renderWithBoard(b, (store) => <Filming store={store} />);

afterEach(() => {
  Reflect.deleteProperty(navigator, 'wakeLock');
});

test('lists every panel with its setup, line and notes, and the progress', async () => {
  await open();
  expect(screen.getByText('0 of 4 filmed')).toBeInTheDocument();
  const second = screen.getByRole('article', { name: 'Panel 2' });
  expect(within(second).getByText('Two')).toBeInTheDocument();
  expect(within(second).getByText('Lean in')).toBeInTheDocument();
  expect(within(second).getByText('Side angle')).toBeInTheDocument();
});

test('ticking a panel updates the progress and the board', async () => {
  const user = userEvent.setup();
  const view = await open();
  await user.click(screen.getByRole('checkbox', { name: 'Panel 2 filmed' }));
  expect(screen.getByText('1 of 4 filmed')).toBeInTheDocument();
  expect((view.current().items[1] as Panel).filmed).toBe(true);
  await user.click(screen.getByRole('checkbox', { name: 'Panel 2 filmed' }));
  expect(screen.getByText('0 of 4 filmed')).toBeInTheDocument();
});

test('"Group by setup" gathers panels under their setup, keeping panel numbers', async () => {
  const user = userEvent.setup();
  await open();
  await user.click(screen.getByRole('checkbox', { name: 'Group by setup' }));
  const front = screen.getByRole('group', { name: 'Front' });
  expect(within(front).getAllByRole('article').map((a) => a.getAttribute('aria-label'))).toEqual(['Panel 1', 'Panel 3']);
  expect(within(screen.getByRole('group', { name: 'No setup' })).getByRole('article', { name: 'Panel 4' })).toBeInTheDocument();
  expect(screen.getAllByRole('group').map((g) => g.getAttribute('aria-label'))).toEqual(['Front', 'Side angle', 'No setup']);
});

test('"Hide filmed" removes ticked panels from view', async () => {
  const user = userEvent.setup();
  await open();
  await user.click(screen.getByRole('checkbox', { name: 'Panel 1 filmed' }));
  await user.click(screen.getByRole('checkbox', { name: 'Hide filmed' }));
  expect(screen.queryByRole('article', { name: 'Panel 1' })).not.toBeInTheDocument();
  expect(screen.getAllByRole('article')).toHaveLength(3);
});

test('when everything is filmed and hidden, it says so', async () => {
  const user = userEvent.setup();
  await open(testBoard([testPanel({ filmed: true })]));
  await user.click(screen.getByRole('checkbox', { name: 'Hide filmed' }));
  expect(screen.getByText(/Everything is filmed/)).toBeInTheDocument();
});

test('"Reset all ticks" asks for confirmation', async () => {
  const user = userEvent.setup();
  const view = await open(testBoard([testPanel({ filmed: true }), testPanel({ filmed: true })]));
  await user.click(screen.getByRole('button', { name: 'Reset all ticks' }));
  expect((view.current().items[0] as Panel).filmed).toBe(true);
  await user.click(within(screen.getByRole('dialog', { name: 'Reset all ticks?' })).getByRole('button', { name: 'Reset' }));
  expect(screen.getByText('0 of 2 filmed')).toBeInTheDocument();
});

test('keeps the screen awake while open and releases on close', async () => {
  const release = vi.fn().mockResolvedValue(undefined);
  const request = vi.fn().mockResolvedValue({ release });
  Object.defineProperty(navigator, 'wakeLock', { value: { request }, configurable: true });
  const view = await open();
  expect(request).toHaveBeenCalledWith('screen');
  await Promise.resolve();
  view.unmount();
  await Promise.resolve();
  expect(release).toHaveBeenCalled();
});

test('works where the wake lock is missing or refused', async () => {
  await open();
  expect(screen.getByText('0 of 4 filmed')).toBeInTheDocument();
  Object.defineProperty(navigator, 'wakeLock', { value: { request: () => Promise.reject(new Error('denied')) }, configurable: true });
  await open();
  expect(screen.getAllByText('0 of 4 filmed')).toHaveLength(2);
});

test('an empty board explains there is nothing to film', async () => {
  await open(testBoard());
  expect(screen.getByText(/No panels to film yet/)).toBeInTheDocument();
});
