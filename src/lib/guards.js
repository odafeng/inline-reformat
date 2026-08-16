// Trigger guards: decide whether a block of typed text deserves an LLM call.

// CJK unified ideographs, kana, hangul, CJK punctuation, fullwidth forms
const CJK_RE = /[\u3000-\u9fff\uf900-\ufaff\uff00-\uffef\uac00-\ud7af]/g;

export function isMostlyEnglish(text) {
  const letters = (text.match(/[A-Za-z]/g) || []).length;
  const cjk = (text.match(CJK_RE) || []).length;
  if (cjk > 0) return false;
  const nonSpace = text.replace(/\s/g, '').length;
  return nonSpace > 0 && letters / nonSpace >= 0.6;
}

export function wordCount(text) {
  return text.split(/\s+/).filter(Boolean).length;
}

// Returns null when the block deserves a rewrite, or a human-readable reason
// why not (surfaced in the console when debug logging is on).
export function triggerBlockReason(blockText, state, opts) {
  const t = blockText.trim();
  if (t.length < opts.minChars) return `shorter than ${opts.minChars} characters`;
  if (wordCount(t) < opts.minWords) return `fewer than ${opts.minWords} words`;
  if (!isMostlyEnglish(t)) return 'not mostly English (contains CJK or too few letters)';
  if (t === state.lastAccepted.trim()) return 'identical to the suggestion just accepted';
  if (t === state.lastSuggestedFor.trim()) return 'already suggested for this exact text';
  if (t === state.dismissedFor.trim()) return 'dismissed for this exact text (Esc)';
  return null;
}

export function shouldTrigger(blockText, state, opts) {
  return triggerBlockReason(blockText, state, opts) === null;
}
