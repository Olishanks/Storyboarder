import { act, render, screen } from '@testing-library/react';
import { App } from './App';
import { testBoard, testPanel } from './model/testing';
import { saveBoard } from './store/db';

test('renders the Home screen at "#/"', async () => {
  window.location.hash = '#/';
  render(<App />);
  expect(await screen.findByRole('heading', { name: 'Storyboards' })).toBeInTheDocument();
});

test('opens a saved board and its other screens by route', async () => {
  const panel = testPanel({ says: 'Hello' });
  await saveBoard(testBoard([panel], { id: 'app-1', title: 'Routed board' }));
  window.location.hash = '#/board/app-1';
  render(<App />);
  expect(await screen.findByRole('heading', { level: 1, name: 'Routed board' })).toBeInTheDocument();
  expect(screen.getByRole('article', { name: 'Panel 1' })).toBeInTheDocument();

  const go = async (hash: string) => {
    await act(async () => {
      window.location.hash = hash;
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    });
  };
  await go(`#/board/app-1/sketch/${panel.id}`);
  expect(screen.getByRole('img', { name: 'Sketch canvas' })).toBeInTheDocument();
  await go('#/board/app-1/play');
  expect(screen.getByText('Panel 1 of 1')).toBeInTheDocument();
  await go('#/board/app-1/film');
  expect(screen.getByText('0 of 1 filmed')).toBeInTheDocument();
  await go('#/board/app-1/print');
  expect(screen.getByRole('button', { name: 'Print or save as PDF' })).toBeInTheDocument();
});

test('a board that does not exist says so and links home', async () => {
  window.location.hash = '#/board/nope';
  render(<App />);
  expect(await screen.findByText(/can’t be found/)).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'All boards' })).toHaveAttribute('href', '#/');
});
