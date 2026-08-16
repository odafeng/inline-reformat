# 0001. Ghost suggestion + Tab accept instead of auto-replace or right-click menu

## Status

Accepted (2026-08-16)

## Context

The original idea was "select text → right-click → LLM rewrite → paste back". During
design the user proposed a better experience: no selection at all — the extension
rewrites what is being typed automatically, with a streaming feel. Three interaction
models were considered:

1. Right-click context menu on selected text (the original idea; what existing GitHub
   projects do).
2. Full-auto in-place replacement after a typing pause (streaming the rewrite directly
   into the field).
3. Ghost suggestion: after a pause the rewrite streams into a card below the field;
   Tab accepts and replaces in place, Esc dismisses, typing refreshes.

## Decision

Ghost suggestion + Tab accept (model 3).

Full-auto replacement was rejected for three reasons:

- **IME conflict**: the user types Chinese/English mixed via IME. Mutating field content
  during an active composition corrupts the composition buffer. A suggestion card never
  touches the field until an explicit accept, so it is inherently IME-safe.
- **Trust**: LLM rewrites occasionally change meaning. For medical correspondence a
  silently flipped negation is a real hazard. A one-keystroke accept keeps a human eye
  on every change, matching what Grammarly/Gmail Smart Compose/Copilot all converged on.
- **Cursor & undo**: replacing text mid-typing breaks caret position and the native undo
  stack.

The right-click model was rejected as strictly more friction (selection + menu) for the
same outcome.

## Consequences

- (+) IME-safe by construction; zero risk of corrupting in-progress input.
- (+) Every meaning change passes the user's eyes before landing.
- (+) Streaming UX preserved — tokens stream into the card, not the field.
- (−) One extra keystroke (Tab) compared to full-auto.
- (−) A floating card must be positioned and kept in sync with the field (scroll, blur,
  SPA re-renders) — the largest source of UI edge cases in this codebase.
- (−) Tab is repurposed while the card is visible, shadowing native focus traversal;
  mitigated by only intercepting when a suggestion is showing.
