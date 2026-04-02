# Changelog

## 0.3.0

### Features

- **Session isolation** — Each Claude Code session now uses its own temp file via `session_id`, so multiple sessions no longer clobber each other's grammar results.
- **Colorized output** — Errors shown in red, corrections in green, reasons dimmed for quick visual scanning in the status bar.
- **Shared system prompt** — Extracted to `prompt.mjs`; used by both the grammar check hook and the test command. Configurable via `cc-grammar set systemPrompt`.
- **Concise output** — Prompt tuned for 2-3 word reasons, single-line output with `|` separator.
- **Pencil icon** — Status line uses ✏️ instead of `[Grammar]` tag.

### Fixes

- **API error handling** — `stopReason === 'error'` responses now clear the status line instead of showing garbage.
- **Test uses real prompt** — `cc-grammar test` now uses the actual system prompt (or custom override) instead of a hardcoded simplified version.
- **Capitalization ignored** — No longer flags lowercase at start of sentence.
- **Output sanitization** — Multi-line LLM responses collapsed to single line; visible text truncated at 150 chars before ANSI colors are added.

## 0.2.2

- Initial public release
