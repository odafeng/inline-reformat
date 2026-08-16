// Paragraph extraction around a caret position, for plain-text fields
// (input/textarea). start/end are exact indices so replacement can target them.

export function extractBlock(text, caret) {
  const start = text.lastIndexOf('\n', caret - 1) + 1;
  let end = text.indexOf('\n', caret);
  if (end === -1) end = text.length;
  return { start, end, text: text.slice(start, end) };
}
