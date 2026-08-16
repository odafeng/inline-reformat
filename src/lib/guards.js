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

export function shouldTrigger(blockText, state, opts) {
  const t = blockText.trim();
  if (t.length < opts.minChars) return false;
  if (wordCount(t) < opts.minWords) return false;
  if (!isMostlyEnglish(t)) return false;
  if (t === state.lastAccepted.trim()) return false;
  if (t === state.lastSuggestedFor.trim()) return false;
  if (t === state.dismissedFor.trim()) return false;
  return true;
}
