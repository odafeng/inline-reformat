// Service worker: owns all network calls. Content scripts connect on the
// 'rewrite' port, send { text }, and receive streamed { type: 'chunk' | 'done'
// | 'error' } messages. A new request on the same port aborts the previous one.

import { loadSettings } from './lib/defaults.js';
import { streamAnthropic } from './llm/anthropic.js';
import { streamOpenAICompat } from './llm/openai-compat.js';

const TIMEOUT_MS = 15000;

function pickStream(settings, text, signal) {
  const common = { system: settings.systemPrompt, text, signal };
  if (settings.provider === 'openai-compat') {
    return streamOpenAICompat({
      ...common,
      baseUrl: settings.compatBaseUrl,
      apiKey: settings.compatApiKey,
      model: settings.compatModel,
    });
  }
  return streamAnthropic({
    ...common,
    apiKey: settings.anthropicApiKey,
    model: settings.anthropicModel,
  });
}

// Options page "test connection": run one tiny rewrite with the given
// (possibly unsaved) settings and report success or the raw error.
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type !== 'test') return;
  (async () => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12000);
    try {
      const settings = { ...(await loadSettings()), ...msg.settings };
      let got = '';
      const prompt = 'Reply with the single word OK.';
      for await (const chunk of pickStream(settings, prompt, controller.signal)) {
        got += chunk;
        if (got.trim()) break;
      }
      controller.abort();
      sendResponse(got.trim() ? { ok: true } : { ok: false, error: 'empty response' });
    } catch (err) {
      sendResponse({ ok: false, error: String(err?.message || err) });
    } finally {
      clearTimeout(timer);
    }
  })();
  return true; // keep the message channel open for the async response
});

chrome.runtime.onConnect.addListener((port) => {
  if (port.name !== 'rewrite') return;
  let controller = null;

  port.onDisconnect.addListener(() => controller?.abort());

  port.onMessage.addListener(async (msg) => {
    if (msg.type === 'cancel') {
      controller?.abort();
      return;
    }
    controller?.abort();
    controller = new AbortController();
    const { signal } = controller;
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    const post = (m) => {
      try {
        port.postMessage(m);
      } catch {
        controller.abort(); // port gone
      }
    };
    try {
      const settings = await loadSettings();
      for await (const chunk of pickStream(settings, msg.text, signal)) {
        if (signal.aborted) return;
        post({ type: 'chunk', id: msg.id, text: chunk });
      }
      if (!signal.aborted) post({ type: 'done', id: msg.id });
    } catch (err) {
      if (!signal.aborted)
        post({ type: 'error', id: msg.id, message: String(err?.message || err) });
    } finally {
      clearTimeout(timer);
    }
  });
});
