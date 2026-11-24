/**
 * Text fields such as the bio can mark words with **double asterisks** so they
 * stand out from the rest of the paragraph. This splits the text into plain
 * and highlighted parts. A ** that is never closed is left as written.
 */
export interface TextPart {
  text: string;
  highlight: boolean;
}

const MARKED = /\*\*(.+?)\*\*/g;

export function splitHighlights(text: string): TextPart[] {
  const parts: TextPart[] = [];
  let last = 0;
  for (const match of text.matchAll(MARKED)) {
    const start = match.index ?? 0;
    if (start > last) parts.push({ text: text.slice(last, start), highlight: false });
    parts.push({ text: match[1], highlight: true });
    last = start + match[0].length;
  }
  if (last < text.length) parts.push({ text: text.slice(last), highlight: false });
  return parts;
}
