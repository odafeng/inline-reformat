import { describe, it, expect } from 'vitest';
import { extractBlock } from '../src/lib/text-block.js';

describe('extractBlock', () => {
  it('returns the whole text when there are no newlines', () => {
    const text = 'I very appreciate you help';
    expect(extractBlock(text, text.length)).toEqual({ start: 0, end: text.length, text });
  });

  it('returns the paragraph containing the caret', () => {
    const text = 'first line\nsecond line here\nthird';
    const caret = text.indexOf('here');
    expect(extractBlock(text, caret)).toEqual({
      start: 11,
      end: 27,
      text: 'second line here',
    });
  });

  it('handles caret at the very start', () => {
    const text = 'hello\nworld';
    expect(extractBlock(text, 0)).toEqual({ start: 0, end: 5, text: 'hello' });
  });

  it('handles caret at the end of the last line', () => {
    const text = 'hello\nworld';
    expect(extractBlock(text, text.length)).toEqual({ start: 6, end: 11, text: 'world' });
  });

  it('returns an empty block when the caret sits on an empty line', () => {
    const text = 'above\n\nbelow';
    expect(extractBlock(text, 6)).toEqual({ start: 6, end: 6, text: '' });
  });

  it('treats a caret just after a newline as belonging to the next line', () => {
    const text = 'one\ntwo';
    expect(extractBlock(text, 4)).toEqual({ start: 4, end: 7, text: 'two' });
  });
});
