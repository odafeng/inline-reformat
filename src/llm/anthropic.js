import { sseData, anthropicTextDelta } from '../lib/sse.js';

export async function* streamAnthropic({ apiKey, model, system, text, signal }) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    signal,
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      // Requests from an extension carry Origin: chrome-extension://…, and the
      // API rejects browser-origin calls unless this opt-in is present. It is
      // the documented switch for BYOK browser apps: the "danger" is exposing
      // a key in a web page, not a user calling the API with their own key.
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model,
      max_tokens: 1024,
      stream: true,
      system,
      messages: [{ role: 'user', content: text }],
    }),
  });
  if (!res.ok) {
    let detail = '';
    try {
      detail = (await res.json())?.error?.message ?? '';
    } catch {
      /* non-JSON body */
    }
    throw new Error(`Anthropic API ${res.status}${detail ? `: ${detail}` : ''}`);
  }
  for await (const data of sseData(res.body, signal)) {
    const delta = anthropicTextDelta(data);
    if (delta) yield delta;
  }
}
