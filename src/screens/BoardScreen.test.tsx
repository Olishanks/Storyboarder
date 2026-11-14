import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BoardScreen } from './BoardScreen';
import { downloadText } from '../download';
import { testBoard, testPanel, testSection, words } from '../model/testing';
import type { Board, Panel } from '../model/types';
import { renderWithBoard } from '../test-utils';

vi.mock('../download', () => ({ downloadText: vi.fn() }));

const panel = (n: number) => screen.getByRole('article', { name: `Panel ${n}` });
const panelsOf = (board: Board) => board.items.filter((i): i is Panel => i.type === 'panel');
const open = (board: Board, opts?: { failSaves?: boolean }) =>
  renderWithBoard(board, (store) => <BoardScreen store={store} />, opts);

function threePanels() {
  return testBoard([testPanel({ says: words(20) }), testPanel(), testPanel({ durationOverride: 5 })], { title: 'Desk tour' });
}

test('header shows the title, total time and panel count', async () => {
  await open(threePanels());
  expect(screen.getByRole('heading', { level: 1, name: 'Desk tour' })).toBeInTheDocument();
  expect(screen.getByText('0:16 · 3 panels')).toBeInTheDocument();
});

test('each panel shows its number, start–end and duration', async () => {
  await open(threePanels());
  expect(within(panel(2)).getByText('0:08 – 0:11')).toBeInTheDocument();
  expect(within(panel(2)).getByRole('button', { name: 'Duration 3s' })).toBeInTheDocument();
});

test('"Insert panel before panel 2" inserts a blank panel as number 2', async () => {
  const user = userEvent.setup();
  const view = await open(threePanels());
  await user.click(screen.getByRole('button', { name: 'Insert panel before panel 2' }));
  expect(screen.getAllByRole('article')).toHaveLength(4);
  expect(panelsOf(view.current())[1].says).toBe('');
  expect(panelsOf(view.current())[0].says).toBe(words(20));
});

test('"Add panel" appends a panel and an empty board offers it', async () => {
  const user = userEvent.setup();
  await open(testBoard());
  expect(screen.getByText(/No panels yet/)).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Add panel' }));
  expect(screen.getAllByRole('article')).toHaveLength(1);
});

test('typing in "Says" updates the duration', async () => {
  await open(threePanels());
  fireEvent.change(within(panel(2)).getByRole('textbox', { name: 'Says' }), { target: { value: words(20) } });
  expect(within(panel(2)).getByRole('button', { name: 'Duration 8s' })).toBeInTheDocument();
  expect(screen.getByText('0:21 · 3 panels')).toBeInTheDocument();
});

test('entering "5" as duration sets an override that can be reset', async () => {
  const user = userEvent.setup();
  const view = await open(threePanels());
  await user.click(within(panel(1)).getByRole('button', { name: 'Duration 8s' }));
  const input = within(panel(1)).getByRole('textbox', { name: 'Duration in seconds' });
  await user.clear(input);
  await user.type(input, '5{Enter}');
  expect(panelsOf(view.current())[0].durationOverride).toBe(5);
  await user.click(within(panel(1)).getByRole('button', { name: 'Reset to auto' }));
  expect(panelsOf(view.current())[0].durationOverride).toBeNull();
});

test('an invalid duration leaves the panel unchanged', async () => {
  const user = userEvent.setup();
  const view = await open(threePanels());
  for (const bad of ['abc', '0', '-2']) {
    await user.click(within(panel(1)).getByRole('button', { name: 'Duration 8s' }));
    const input = within(panel(1)).getByRole('textbox', { name: 'Duration in seconds' });
    await user.clear(input);
    await user.type(input, `${bad}{Enter}`);
    expect(panelsOf(view.current())[0].durationOverride).toBeNull();
    expect(within(panel(1)).getByRole('button', { name: 'Duration 8s' })).toBeInTheDocument();
  }
});

test('panel actions: duplicate, merge with previous and delete', async () => {
  const user = userEvent.setup();
  const view = await open(testBoard([testPanel({ says: 'One' }), testPanel({ says: 'two' })]));
  const act = async (n: number, name: string) => {
    await user.click(within(panel(n)).getByRole('button', { name: 'Panel actions' }));
    await user.click(within(panel(n)).getByRole('button', { name }));
  };
  await act(1, 'Duplicate');
  expect(panelsOf(view.current()).map((p) => p.says)).toEqual(['One', 'One', 'two']);
  await act(3, 'Merge with previous');
  expect(panelsOf(view.current()).map((p) => p.says)).toEqual(['One', 'One two']);
  await act(1, 'Delete panel');
  expect(panelsOf(view.current()).map((p) => p.says)).toEqual(['One two']);
});

test('"Split at cursor" divides the line where the cursor was', async () => {
  const user = userEvent.setup();
  const view = await open(testBoard([testPanel({ says: 'Hello world again' })]));
  const says = within(panel(1)).getByRole('textbox', { name: 'Says' }) as HTMLTextAreaElement;
  says.focus();
  says.setSelectionRange(6, 6);
  fireEvent.select(says);
  await user.click(within(panel(1)).getByRole('button', { name: 'Panel actions' }));
  await user.click(within(panel(1)).getByRole('button', { name: 'Split at cursor' }));
  expect(panelsOf(view.current()).map((p) => p.says)).toEqual(['Hello', 'world again']);
});

test('a new setup name becomes a choice other panels can pick', async () => {
  const user = userEvent.setup();
  const view = await open(threePanels());
  await user.selectOptions(within(panel(1)).getByRole('combobox', { name: 'Setup' }), 'New setup…');
  await user.type(within(panel(1)).getByRole('textbox', { name: 'New setup name' }), 'Side angle{Enter}');
  expect(view.current().setups.map((s) => s.name)).toEqual(['Side angle']);
  await user.selectOptions(within(panel(2)).getByRole('combobox', { name: 'Setup' }), 'Side angle');
  expect(panelsOf(view.current())[1].setupId).toBe(view.current().setups[0].id);
});

test('detail chips are hidden until "Details" is opened, and toggle', async () => {
  const user = userEvent.setup();
  const view = await open(threePanels());
  expect(within(panel(1)).queryByRole('button', { name: 'Close-up' })).not.toBeInTheDocument();
  await user.click(within(panel(1)).getByRole('button', { name: 'Details' }));
  await user.click(within(panel(1)).getByRole('button', { name: 'Close-up' }));
  expect(panelsOf(view.current())[0].size).toBe('Close-up');
  await user.click(within(panel(1)).getByRole('button', { name: 'Close-up' }));
  expect(panelsOf(view.current())[0].size).toBeNull();
});

test('a section header shows the summed duration of its panels, and collapsing hides them without changing the total', async () => {
  const user = userEvent.setup();
  await open(
    testBoard([testSection({ title: 'Hook' }), testPanel({ says: words(20) }), testPanel(), testSection({ title: 'Outro' }), testPanel()]),
  );
  const hook = screen.getByRole('group', { name: 'Hook' });
  expect(within(hook).getByText('0:11 · 2 panels')).toBeInTheDocument();
  await user.click(within(hook).getByRole('button', { name: 'Collapse Hook' }));
  expect(screen.getAllByRole('article')).toHaveLength(1);
  expect(screen.getByText('0:14 · 3 panels')).toBeInTheDocument();
  await user.click(within(hook).getByRole('button', { name: 'Expand Hook' }));
  expect(screen.getAllByRole('article')).toHaveLength(3);
});

test('"Add section" adds a heading that can be renamed and deleted without losing panels', async () => {
  const user = userEvent.setup();
  const view = await open(threePanels());
  await user.click(screen.getByRole('button', { name: 'Add section' }));
  const title = screen.getByRole('textbox', { name: 'Section title' });
  fireEvent.change(title, { target: { value: 'Outro' } });
  expect(view.current().items.at(-1)).toMatchObject({ type: 'section', title: 'Outro' });
  await user.click(screen.getByRole('button', { name: 'Delete heading Outro' }));
  expect(view.current().items.every((i) => i.type === 'panel')).toBe(true);
  expect(screen.getAllByRole('article')).toHaveLength(3);
});

test('undo reverts the last change and redo reapplies it', async () => {
  const user = userEvent.setup();
  await open(threePanels());
  expect(screen.getByRole('button', { name: 'Undo' })).toBeDisabled();
  await user.click(screen.getByRole('button', { name: 'Insert panel before panel 2' }));
  await user.click(screen.getByRole('button', { name: 'Undo' }));
  expect(screen.getAllByRole('article')).toHaveLength(3);
  await user.click(screen.getByRole('button', { name: 'Redo' }));
  expect(screen.getAllByRole('article')).toHaveLength(4);
});

test('"Export board file" downloads the board and records the export', async () => {
  const user = userEvent.setup();
  const view = await open(threePanels());
  await user.click(screen.getByRole('button', { name: 'Export board file' }));
  expect(downloadText).toHaveBeenCalledWith('Desk tour.storyboard.json', expect.stringContaining('"title":"Desk tour"'));
  expect(view.current().lastExportedAt).not.toBeNull();
});

test('settings change the title, pace and panels per row', async () => {
  const user = userEvent.setup();
  const view = await open(threePanels());
  await user.click(screen.getByRole('button', { name: 'Settings' }));
  const dialog = screen.getByRole('dialog', { name: 'Board settings' });
  fireEvent.change(within(dialog).getByRole('textbox', { name: 'Title' }), { target: { value: 'Renamed' } });
  fireEvent.change(within(dialog).getByRole('spinbutton', { name: /Speaking pace/ }), { target: { value: '120' } });
  await user.click(within(dialog).getByRole('radio', { name: /Horizontal 16:9/ }));
  await user.click(within(dialog).getByRole('button', { name: 'More panels per row' }));
  expect(view.current()).toMatchObject({ title: 'Renamed', wordsPerMinute: 120, format: '16:9', panelsPerRow: 4 });
});

test('a failed save shows a "Not saved" banner with an export action', async () => {
  const user = userEvent.setup();
  await open(threePanels(), { failSaves: true });
  await user.click(screen.getByRole('button', { name: 'Insert panel before panel 2' }));
  const alert = await waitFor(() => screen.getByRole('alert'), { timeout: 2000 });
  expect(alert).toHaveTextContent('Not saved');
  expect(within(alert).getByRole('button', { name: 'Export board file' })).toBeInTheDocument();
  expect(screen.getAllByRole('article')).toHaveLength(4);
});

test('the speaking pace can be typed, and out-of-range values are not applied', async () => {
  const user = userEvent.setup();
  const view = await open(threePanels());
  await user.click(screen.getByRole('button', { name: 'Settings' }));
  const pace = within(screen.getByRole('dialog', { name: 'Board settings' })).getByRole('spinbutton', { name: /Speaking pace/ });
  await user.clear(pace);
  await user.type(pace, '120');
  expect(pace).toHaveValue(120);
  expect(view.current().wordsPerMinute).toBe(120);
  await user.clear(pace);
  await user.type(pace, '9000');
  expect(view.current().wordsPerMinute).toBeLessThanOrEqual(300);
  await user.tab();
  expect(pace).toHaveValue(view.current().wordsPerMinute);
});
