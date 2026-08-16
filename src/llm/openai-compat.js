import { sseData, openaiTextDelta } from '../lib/sse.js';

export async function* streamOpenAICompat({ baseUrl, apiKey, model, system, text, signal }) {
  const url = `${baseUrl.replace(/\/$/, '')}/chat/completions`;
  const headers = { 'content-type': 'application/json' };
  if (apiKey) headers.authorization = `Bearer ${apiKey}`;
  const res = await fetch(url, {
    method: 'POST',
    signal,
    headers,
    body: JSON.stringify({
      model,
      stream: true,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: text },
      ],
    }),
  });
  if (!res.ok) {
    let detail = '';
    try {
      const body = await res.json();
      detail = body?.error?.message ?? body?.message ?? '';
    } catch {
      /* non-JSON body */
    }
    throw new Error(`LLM endpoint ${res.status}${detail ? `: ${detail}` : ''}`);
  }
  for await (const data of sseData(res.body, signal)) {
    const delta = openaiTextDelta(data);
    if (delta === null) return;
    if (delta) yield delta;
  }
}
