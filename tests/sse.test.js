import { describe, it, expect } from 'vitest';
import { createSSEParser, anthropicTextDelta, openaiTextDelta } from '../src/lib/sse.js';

describe('createSSEParser', () => {
  it('yields data payloads from complete events', () => {
    const parser = createSSEParser();
    const out = parser.push('event: ping\ndata: {"a":1}\n\ndata: {"b":2}\n\n');
    expect(out).toEqual(['{"a":1}', '{"b":2}']);
  });

  it('buffers events split across chunks', () => {
    const parser = createSSEParser();
    expect(parser.push('data: {"a"')).toEqual([]);
    expect(parser.push(':1}\n\n')).toEqual(['{"a":1}']);
  });

  it('handles CRLF line endings', () => {
    const parser = createSSEParser();
    expect(parser.push('data: hello\r\n\r\n')).toEqual(['hello']);
  });

  it('joins multi-line data fields with newlines', () => {
    const parser = createSSEParser();
    expect(parser.push('data: line1\ndata: line2\n\n')).toEqual(['line1\nline2']);
  });

  it('ignores comments and non-data fields', () => {
    const parser = createSSEParser();
    expect(parser.push(': keepalive\nevent: foo\n\n')).toEqual([]);
  });
});

describe('anthropicTextDelta', () => {
  it('extracts text from content_block_delta events', () => {
    const data = JSON.stringify({
      type: 'content_block_delta',
      delta: { type: 'text_delta', text: 'Hello' },
    });
    expect(anthropicTextDelta(data)).toBe('Hello');
  });

  it('returns empty string for other event types', () => {
    expect(anthropicTextDelta(JSON.stringify({ type: 'message_start' }))).toBe('');
    expect(anthropicTextDelta('not json')).toBe('');
  });
});

describe('openaiTextDelta', () => {
  it('extracts delta content', () => {
    const data = JSON.stringify({ choices: [{ delta: { content: 'Hi' } }] });
    expect(openaiTextDelta(data)).toBe('Hi');
  });

  it('returns null on [DONE]', () => {
    expect(openaiTextDelta('[DONE]')).toBe(null);
  });

  it('returns empty string for role-only deltas', () => {
    const data = JSON.stringify({ choices: [{ delta: { role: 'assistant' } }] });
    expect(openaiTextDelta(data)).toBe('');
  });
});
