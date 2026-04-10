# Changelog

## 0.5.0

### Breaking Changes

- **Switched to `claude -p`** — Grammar checking now uses Claude Code pipe mode as the LLM backend. No API keys needed — piggybacks on Claude Code's existing auth (subscription).
- **Removed `@mariozechner/pi-ai`** — The pi-ai dependency has been removed entirely. All provider/auth/OAuth config fields are gone.
- **Simplified config** — Only `model`, `minLength`, and `systemPrompt` fields remain. Default model is `haiku`.

### Features

- **Multi-agent support** — Now supports Claude Code, Pi Coding Agent, Codex CLI, and Gemini CLI.
- **Agent-agnostic engine** — Core grammar logic extracted to `lib/grammar-engine.mjs`. Adding a new agent requires only a thin adapter.
- **`--agent` flag** — `npx cc-grammar install --agent codex|gemini|pi|claude` to target a specific agent.
- **Recursion guard** — Hook adapters detect and skip recursive `claude -p` invocations via `CC_GRAMMAR_RUNNING` env var.

### Architecture

- Extracted shared engine from `scripts/grammar-check.mjs` to `lib/grammar-engine.mjs`.
- Created `adapters/` directory with per-agent adapters.
- Moved prompt to `lib/prompt.mjs` with re-export at `scripts/prompt.mjs`.
- Original `scripts/grammar-check.mjs` and `scripts/grammar-statusline.sh` preserved for backward compatibility.

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
