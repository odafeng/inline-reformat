# inline-reformat — Design Spec

Date: 2026-08-16
Status: Approved (user confirmed in design session)

## Problem

While typing English in the browser (Gmail, review systems, generic textareas), the user
wants rough English rewritten into fluent English without selecting text or leaving the
field. Existing GitHub projects covering "select → right-click → rewrite" are hobby-grade;
none offer the desired suggestion-style UX.

## Decisions made in brainstorming

1. **Interaction model: ghost suggestion + Tab accept.** After a typing pause, the current
   paragraph is sent to an LLM; the rewritten text streams into a card below the field.
   Tab accepts (replaces the paragraph in place), Esc dismisses, further typing refreshes.
   Full-auto in-place replacement was rejected: IME conflicts, silent meaning changes
   (medical correspondence risk), cursor/undo breakage. See ADR-0001.
2. **Input material: rough English → fluent English only.** No translation. Non-English
   text never triggers.
3. **Primary backend: Anthropic `claude-haiku-4-5`** via native Messages API. Secondary:
   any OpenAI-compatible endpoint (DGX Spark via Tailscale, OpenRouter…). Two thin
   clients; no OpenAI shim for Claude. See ADR-0002.

## Architecture

Chrome extension, Manifest V3, vanilla JS, no build step (load unpacked from `src/`).

| Component                             | Responsibility                                                                                                    |
| ------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `src/content.js`                      | Track focused editable, trigger state machine, ghost card UI (shadow DOM), Tab/Esc handling, in-place replacement |
| `src/background.js`                   | Service worker: receive text over a `chrome.runtime` port, call the configured LLM client, stream chunks back     |
| `src/llm/anthropic.js`                | Messages API + SSE streaming, default model `claude-haiku-4-5`                                                    |
| `src/llm/openai-compat.js`            | `/v1/chat/completions` + SSE streaming for custom base URLs                                                       |
| `src/options.html` + `src/options.js` | provider, API key, base URL, model, prompt, debounce, min length, site blocklist, master switch                   |
| `src/lib/*.js`                        | Pure functions (block extraction, English heuristic, trigger guards) — unit tested                                |

## Trigger logic

Fires after 1.5 s (configurable) of input idle, only if ALL guards pass:

- not inside IME composition (`compositionstart`..`compositionend`)
- current block (paragraph around caret) extracted; textarea/input via `selectionStart`
  and newline scan, contenteditable via nearest block ancestor
- block ≥ 15 chars and ≥ 4 words; mostly ASCII letters (English heuristic)
- block differs from the last accepted or last suggested text
- site not in blocklist; master switch on

Any further typing aborts the in-flight request (`AbortController`) and refreshes or
hides the card.

## Ghost card

- Shadow-DOM host positioned below the field (`getBoundingClientRect`), streams tokens.
- Footer hint: `Tab 接受 · Esc 關閉`. Tab intercepted in capture phase only while
  visible; Esc suppresses suggestions for the unchanged block.
- Hidden on blur/scroll-away/field removal.

## Replacement

Select the block range (`setSelectionRange` / DOM Range) then
`document.execCommand('insertText')` — deprecated but the only path that preserves the
native undo stack in both textarea and contenteditable. Fallback: `setRangeText`.
Accepted text is recorded so the same block does not immediately re-trigger.

## LLM calls

- System prompt: rewrite into fluent, natural English; preserve meaning exactly; no
  additions or omissions; output only the rewritten text.
- Anthropic: `POST https://api.anthropic.com/v1/messages`, `stream: true`, parse
  `content_block_delta` / `text_delta` SSE events. `max_tokens` 1024.
- OpenAI-compatible: `POST {base}/chat/completions`, `stream: true`, parse `delta.content`.
- Permissions: `host_permissions` for `https://api.anthropic.com/*`;
  `optional_host_permissions` (`https://*/*`, `http://*/*`) requested at save time for
  custom base URLs.
- API key in `chrome.storage.local` (deliberately not `sync`).
- Errors are silent (small indicator in card only); 15 s abort timeout.

## Testing

- **Unit (vitest)**: `src/lib/` — block extraction, English heuristic, guard logic.
- **Smoke (Playwright)**: chromium with the extension loaded, local test page, mock LLM
  server; assert type → card appears → Tab → text replaced.
- CI (GitHub Actions): ESLint + Prettier check + vitest. Pre-commit hook runs the same.

## Non-goals (v1)

Google Docs (canvas rendering), Overleaf/CodeMirror/Monaco editors, translation mode,
multiple rewrite styles, Firefox, context-menu mode.
