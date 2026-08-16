import { describe, it, expect } from 'vitest';
import { isMostlyEnglish, wordCount, shouldTrigger } from '../src/lib/guards.js';

describe('isMostlyEnglish', () => {
  it('accepts plain English', () => {
    expect(isMostlyEnglish('I very appreciate you help for review my paper')).toBe(true);
  });

  it('rejects Chinese text', () => {
    expect(isMostlyEnglish('這是一段中文的句子，不應該觸發')).toBe(false);
  });

  it('rejects mixed Chinese-English text', () => {
    expect(isMostlyEnglish('please check 這個 report for me')).toBe(false);
  });

  it('rejects number-dominated strings', () => {
    expect(isMostlyEnglish('123456 7890 42 17 99')).toBe(false);
  });

  it('accepts English with punctuation and numbers', () => {
    expect(isMostlyEnglish('The anastomotic leak rate was 3.2% in 2024.')).toBe(true);
  });
});

describe('wordCount', () => {
  it('counts whitespace-separated words', () => {
    expect(wordCount('one two  three\nfour')).toBe(4);
  });
  it('returns 0 for blank text', () => {
    expect(wordCount('   ')).toBe(0);
  });
});

describe('shouldTrigger', () => {
  const opts = { minChars: 15, minWords: 4 };
  const freshState = { lastAccepted: '', lastSuggestedFor: '', dismissedFor: '' };
  const sample = 'I very appreciate you help for review my paper';

  it('triggers on a fresh English sentence', () => {
    expect(shouldTrigger(sample, freshState, opts)).toBe(true);
  });

  it('rejects text below the character minimum', () => {
    expect(shouldTrigger('too short', freshState, opts)).toBe(false);
  });

  it('rejects text below the word minimum', () => {
    expect(shouldTrigger('supercalifragilistic word', freshState, opts)).toBe(false);
  });

  it('does not re-trigger on text it already suggested for', () => {
    const state = { ...freshState, lastSuggestedFor: sample };
    expect(shouldTrigger(sample, state, opts)).toBe(false);
  });

  it('does not trigger on a block the user just accepted', () => {
    const state = { ...freshState, lastAccepted: 'I really appreciate your help.' };
    expect(shouldTrigger('I really appreciate your help.', state, opts)).toBe(false);
  });

  it('does not nag after the user dismissed the same block', () => {
    const state = { ...freshState, dismissedFor: sample };
    expect(shouldTrigger(sample, state, opts)).toBe(false);
    expect(shouldTrigger(sample + ' today', state, opts)).toBe(true);
  });

  it('ignores surrounding whitespace when comparing against history', () => {
    const state = { ...freshState, lastAccepted: sample };
    expect(shouldTrigger(`  ${sample} `, state, opts)).toBe(false);
  });
});
