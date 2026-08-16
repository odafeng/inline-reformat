# 0002. Two thin LLM clients (native Anthropic + OpenAI-compatible), no SDK, no shim

## Status

Accepted (2026-08-16)

## Context

The extension must support two backends: Anthropic Claude (`claude-haiku-4-5`, primary)
and any OpenAI-compatible endpoint (the user's DGX Spark local LLM over Tailscale,
OpenRouter, etc.). Options considered:

1. One OpenAI-compatible client for everything, pointing Claude at a compatibility layer.
2. Bundle the official `@anthropic-ai/sdk` (requires a build step) plus an OpenAI client.
3. Two hand-written thin clients over `fetch` + SSE parsing (~40 lines each).

## Decision

Two thin clients (option 3). Claude is called through its native Messages API
(`/v1/messages`, `content_block_delta`/`text_delta` SSE events); custom endpoints
through `/v1/chat/completions` (`delta.content` SSE events). Requests are made from the
MV3 service worker, where `host_permissions` bypasses CORS entirely.

Option 1 contradicts Anthropic's own guidance (never route Claude through
OpenAI-compatible shims) and loses native error/stop_reason semantics. Option 2 forces a
bundler onto an otherwise no-build extension for what amounts to one streaming POST.

## Consequences

- (+) The extension stays no-build: `src/` loads unpacked as-is.
- (+) Each client is small enough to audit at a glance — relevant because this code
  handles an API key and reads text fields.
- (+) Native Anthropic semantics (stop_reason, error shapes) are preserved.
- (−) SSE parsing is hand-rolled twice (two different event shapes) instead of inherited
  from an SDK; covered by unit tests on the parsers.
- (−) New Anthropic API features (e.g. future auth schemes) must be adopted manually.
