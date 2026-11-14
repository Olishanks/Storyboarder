export type ParsedItem = { kind: 'section'; title: string } | { kind: 'panel'; says: string };

export type ScriptMode = 'paragraph' | 'sentence';

function splitSentences(paragraph: string): string[] {
  // A sentence ends at ., ! or ? followed by a space or the end. Written without the regex
  // look-behind feature, which Safari before 16.4 cannot parse.
  const sentences: string[] = [];
  let start = 0;
  for (let i = 0; i < paragraph.length; i += 1) {
    const endsHere = '.!?'.includes(paragraph[i]) && (i + 1 === paragraph.length || /\s/.test(paragraph[i + 1]));
    if (!endsHere) continue;
    sentences.push(paragraph.slice(start, i + 1).trim());
    start = i + 1;
  }
  sentences.push(paragraph.slice(start).trim());
  return sentences.filter(Boolean);
}

export function parseScript(text: string, mode: ScriptMode): ParsedItem[] {
  const items: ParsedItem[] = [];
  let paragraph: string[] = [];

  const flush = () => {
    const joined = paragraph.join(' ').replace(/\s+/g, ' ').trim();
    paragraph = [];
    if (!joined) return;
    const parts = mode === 'sentence' ? splitSentences(joined) : [joined];
    for (const says of parts) items.push({ kind: 'panel', says });
  };

  for (const rawLine of text.replace(/\r\n?/g, '\n').split('\n')) {
    const line = rawLine.trim();
    if (line.startsWith('#')) {
      flush();
      const title = line.replace(/^#+\s*/, '').trim();
      if (title) items.push({ kind: 'section', title });
    } else if (line === '') {
      flush();
    } else {
      paragraph.push(line);
    }
  }
  flush();
  return items;
}
