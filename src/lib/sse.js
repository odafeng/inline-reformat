// Minimal SSE parsing shared by both LLM clients.
// createSSEParser is pure (unit-tested); sseData wraps it around a fetch body.

export function createSSEParser() {
  let buffer = '';
  return {
    push(chunk) {
      buffer += chunk;
      const events = [];
      let idx;
      while ((idx = buffer.search(/\n\n|\r\n\r\n/)) !== -1) {
        const raw = buffer.slice(0, idx);
        buffer = buffer.slice(idx + (buffer[idx] === '\r' ? 4 : 2));
        const dataLines = raw
          .split(/\r?\n/)
          .filter((line) => line.startsWith('data:'))
          .map((line) => line.slice(5).replace(/^ /, ''));
        if (dataLines.length > 0) events.push(dataLines.join('\n'));
      }
      return events;
    },
  };
}

export async function* sseData(body, signal) {
  const parser = createSSEParser();
  const decoder = new TextDecoder();
  const reader = body.getReader();
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (signal?.aborted) break;
      yield* parser.push(decoder.decode(value, { stream: true }));
    }
  } finally {
    reader.releaseLock();
  }
}

export function anthropicTextDelta(data) {
  try {
    const ev = JSON.parse(data);
    if (ev.type === 'content_block_delta' && ev.delta?.type === 'text_delta') {
      return ev.delta.text;
    }
  } catch {
    /* non-JSON keepalive */
  }
  return '';
}

export function openaiTextDelta(data) {
  if (data === '[DONE]') return null;
  try {
    return JSON.parse(data).choices?.[0]?.delta?.content ?? '';
  } catch {
    return '';
  }
}
