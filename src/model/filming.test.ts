import { filmedCount, groupBySetup } from './filming';
import { testBoard, testPanel, testSection } from './testing';

const front = { id: 'front', name: 'Front', color: '#111' };
const side = { id: 'side', name: 'Side', color: '#222' };

test('groupBySetup keeps story order inside a group and original panel numbers', () => {
  const [a, b, c, d] = [
    testPanel({ setupId: 'front' }),
    testPanel({ setupId: 'side' }),
    testPanel({ setupId: 'front' }),
    testPanel({ setupId: 'side' }),
  ];
  const groups = groupBySetup(testBoard([testSection(), a, b, c, d], { setups: [side, front] }));
  expect(groups.map((g) => g.setup?.name)).toEqual(['Front', 'Side']);
  expect(groups[0].panels.map((p) => p.number)).toEqual([1, 3]);
  expect(groups[1].panels.map((p) => p.panel.id)).toEqual([b.id, d.id]);
});

test('panels with no setup, or a setup that no longer exists, are in a final group', () => {
  const [a, b, c] = [testPanel(), testPanel({ setupId: 'front' }), testPanel({ setupId: 'gone' })];
  const groups = groupBySetup(testBoard([a, b, c], { setups: [front] }));
  expect(groups.map((g) => g.setup?.name ?? null)).toEqual(['Front', null]);
  expect(groups[1].panels.map((p) => p.number)).toEqual([1, 3]);
});

test('an empty board has no groups', () => {
  expect(groupBySetup(testBoard())).toEqual([]);
});

test('filmedCount counts ticked panels', () => {
  const board = testBoard([testPanel({ filmed: true }), testSection(), testPanel(), testPanel()]);
  expect(filmedCount(board)).toEqual({ filmed: 1, total: 3 });
});
