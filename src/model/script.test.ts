import { parseScript } from './script';

test('two paragraphs become two panels', () => {
  expect(parseScript('First one.\n\nSecond one.', 'paragraph')).toEqual([
    { kind: 'panel', says: 'First one.' },
    { kind: 'panel', says: 'Second one.' },
  ]);
});

test('"# Hook" becomes a section titled "Hook"', () => {
  expect(parseScript('# Hook\nHello there.', 'paragraph')).toEqual([
    { kind: 'section', title: 'Hook' },
    { kind: 'panel', says: 'Hello there.' },
  ]);
});

test('line breaks inside a paragraph are joined with a space', () => {
  expect(parseScript('Hello\nthere.', 'paragraph')).toEqual([{ kind: 'panel', says: 'Hello there.' }]);
});

test('sentence mode splits "One. Two! Three?" into three panels', () => {
  expect(parseScript('One. Two! Three?', 'sentence')).toEqual([
    { kind: 'panel', says: 'One.' },
    { kind: 'panel', says: 'Two!' },
    { kind: 'panel', says: 'Three?' },
  ]);
});

test('empty, whitespace-only and "#"-only input returns nothing', () => {
  expect(parseScript('', 'paragraph')).toEqual([]);
  expect(parseScript('  \n\n \t ', 'paragraph')).toEqual([]);
  expect(parseScript('#\n##  ', 'paragraph')).toEqual([]);
});

test('Windows line endings parse the same as Unix', () => {
  expect(parseScript('# A\r\nOne.\r\n\r\nTwo.', 'paragraph')).toEqual(parseScript('# A\nOne.\n\nTwo.', 'paragraph'));
});

test('sentence mode keeps decimals and trailing text together', () => {
  expect(parseScript('It costs 3.5 dollars. Then what?! And a tail', 'sentence')).toEqual([
    { kind: 'panel', says: 'It costs 3.5 dollars.' },
    { kind: 'panel', says: 'Then what?!' },
    { kind: 'panel', says: 'And a tail' },
  ]);
});

test('the parser avoids regex lookbehind, which older iPad Safari cannot load', async () => {
  const source = (await import('./script?raw')).default as string;
  expect(source).not.toContain('(?<');
});
