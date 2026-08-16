import { sseData, anthropicTextDelta } from '../lib/sse.js';

export async function* streamAnthropic({ apiKey, model, system, text, signal }) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    signal,
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: 1024,
      stream: true,
      system,
      messages: [{ role: 'user', content: text }],
    }),
  });
  if (!res.ok) throw new Error(`Anthropic API ${res.status}`);
  for await (const data of sseData(res.body, signal)) {
    const delta = anthropicTextDelta(data);
    if (delta) yield delta;
  }
}
