import { act, fireEvent, screen } from '@testing-library/react';
import { Playthrough } from './Playthrough';
import { testBoard, testPanel, words } from '../model/testing';
import { renderWithBoard } from '../test-utils';

// Durations: 8s, 3s, 5s. Total 16s.
function board() {
  return testBoard([testPanel({ says: words(20) }), testPanel({ notes: 'B-roll of desk' }), testPanel({ says: 'Last line', durationOverride: 5 })]);
}

async function open(b = board()) {
  const view = await renderWithBoard(b, (store) => <Playthrough store={store} />);
  vi.useFakeTimers();
  return view;
}
const advance = (ms: number) => act(() => void vi.advanceTimersByTime(ms));

afterEach(() => {
  vi.useRealTimers();
});

test('starts on panel 1 with its line and the total time', async () => {
  await open();
  expect(screen.getByText('Panel 1 of 3')).toBeInTheDocument();
  expect(screen.getByText(words(20))).toBeInTheDocument();
  expect(screen.getByText('0:00 / 0:16')).toBeInTheDocument();
});

test('pressing play advances to the next panel after the first one’s duration', async () => {
  await open();
  fireEvent.click(screen.getByRole('button', { name: 'Play' }));
  advance(7000);
  expect(screen.getByText('Panel 1 of 3')).toBeInTheDocument();
  advance(1500);
  expect(screen.getByText('Panel 2 of 3')).toBeInTheDocument();
  expect(screen.getByText('B-roll of desk')).toBeInTheDocument();
});

test('pause stops advancing', async () => {
  await open();
  fireEvent.click(screen.getByRole('button', { name: 'Play' }));
  advance(2000);
  fireEvent.click(screen.getByRole('button', { name: 'Pause' }));
  advance(20000);
  expect(screen.getByText('Panel 1 of 3')).toBeInTheDocument();
  expect(screen.getByText('0:02 / 0:16')).toBeInTheDocument();
});

test('next and previous step between panels', async () => {
  await open();
  fireEvent.click(screen.getByRole('button', { name: 'Next panel' }));
  expect(screen.getByText('Panel 2 of 3')).toBeInTheDocument();
  expect(screen.getByText('0:08 / 0:16')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Previous panel' }));
  expect(screen.getByText('Panel 1 of 3')).toBeInTheDocument();
});

test('stops on the last panel at the end and play starts over', async () => {
  await open();
  fireEvent.click(screen.getByRole('button', { name: 'Play' }));
  advance(30000);
  expect(screen.getByText('Panel 3 of 3')).toBeInTheDocument();
  expect(screen.getByText('0:16 / 0:16')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Play' }));
  advance(500);
  expect(screen.getByText('Panel 1 of 3')).toBeInTheDocument();
});

test('scrubbing jumps to that time', async () => {
  await open();
  fireEvent.change(screen.getByRole('slider', { name: 'Position' }), { target: { value: '12' } });
  expect(screen.getByText('Panel 3 of 3')).toBeInTheDocument();
});

test('an empty board shows a message, not an error', async () => {
  await open(testBoard());
  expect(screen.getByText(/Nothing to play yet/)).toBeInTheDocument();
});
