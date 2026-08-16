// Single source of truth for settings, shared by background, content, options.

export const DEFAULT_SETTINGS = {
  enabled: true,
  provider: 'anthropic', // 'anthropic' | 'openai-compat'
  anthropicApiKey: '',
  anthropicModel: 'claude-haiku-4-5',
  compatBaseUrl: '', // e.g. http://dgx.tailnet:11434/v1
  compatApiKey: '',
  compatModel: '',
  systemPrompt: [
    'You rewrite text into fluent, natural English.',
    'Preserve the meaning exactly: do not add, remove, or reinterpret any information,',
    'numbers, negations, or hedges. Keep the original register (an email stays an email;',
    'academic text stays academic) and keep line breaks as they are.',
    'If the text is already fluent, return it unchanged.',
    'Output only the rewritten text, with no quotes, preamble, or explanation.',
  ].join(' '),
  debounceMs: 1500,
  minChars: 15,
  minWords: 4,
  blocklist: [], // hostnames where the extension stays quiet
  debugLog: false, // log every trigger decision to the page console
};

export async function loadSettings() {
  const stored = await chrome.storage.local.get(DEFAULT_SETTINGS);
  return { ...DEFAULT_SETTINGS, ...stored };
}
