# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

cc-grammar is a grammar checking tool for coding agents (Claude Code, Pi, Codex CLI, Gemini CLI). It intercepts user messages, checks for grammar/spelling errors via an LLM, and displays corrections in the status line — never polluting conversation context.

## Commands

```bash
npx cc-grammar install [--agent <name>]   # Install for a coding agent (default: claude)
npx cc-grammar setup                      # Interactive provider/model config wizard
npx cc-grammar test                       # Test grammar check with sample input
npx cc-grammar config                     # Show current configuration
npx cc-grammar uninstall [--agent <name>] # Remove hooks (default: claude)
pi install npm:cc-grammar                 # Install as pi package
```

No automated test suite, linter, or formatter is configured.

## Architecture

### Core engine

- **`lib/grammar-engine.mjs`** — Agent-agnostic grammar checking engine. Exports `checkGrammar(text, config)`, `loadConfig()`, `resolveApiKey()`, `shouldSkip()`, `truncateCorrections()`, `colorizeAnsi()`. No stdin, no file I/O, no UI — pure logic.

- **`lib/prompt.mjs`** — System prompt for the grammar-checking LLM.

### Adapters (one per coding agent)

- **`adapters/claude-code/hook.mjs`** — Claude Code UserPromptSubmit hook. Reads stdin JSON, calls engine, writes to temp file.
- **`adapters/claude-code/statusline.sh`** — Claude Code status line reader.
- **`adapters/pi/index.ts`** — Pi extension. Uses `input` event + `ctx.ui.setStatus()`.
- **`adapters/codex/hook.mjs`** — Codex CLI UserPromptSubmit hook (same pattern as Claude Code).
- **`adapters/gemini/hook.mjs`** — Gemini CLI UserPromptSubmit hook (same pattern as Claude Code).

### CLI & backward compat

- **`scripts/setup.mjs`** — CLI entry point (`cc-grammar` bin). Multi-agent install/uninstall with `--agent` flag.
- **`scripts/grammar-check.mjs`** — Backward-compatible entry for existing Claude Code installations.
- **`scripts/grammar-statusline.sh`** — Backward-compatible status line for existing installations.
- **`scripts/prompt.mjs`** — Re-exports from `lib/prompt.mjs`.

### Data flow

Shell-command agents (Claude Code, Codex, Gemini):
```
User sends message → UserPromptSubmit hook → adapter/hook.mjs
  → lib/grammar-engine.mjs → LLM → corrections → temp file
  → statusLine hook → statusline.sh → reads file → displays
```

TypeScript-plugin agents (Pi):
```
User sends message → input event → adapters/pi/index.ts
  → lib/grammar-engine.mjs → LLM → corrections
  → ctx.ui.setStatus() → displays in footer
```

### Configuration

- Config file: `~/.config/claude-grammar/grammar.config.json`
- OAuth tokens: `~/.config/claude-grammar/auth.json`
- Key fields: `provider`, `model`, `baseUrl`, `apiKey`, `apiKeyEnv`, `minLength`

### Dependencies

- `@mariozechner/pi-ai` — Multi-provider LLM access (dependency for standalone use)
- `@mariozechner/pi-coding-agent` — Pi extension types (peer dependency, optional)

### Key design decisions

- ES modules (`.mjs`/`.ts`), Node.js >= 20
- Agent-agnostic core in `lib/`, thin adapters in `adapters/`
- Shell-command adapters share identical stdin-JSON protocol
- Pi adapter uses in-process event API (no temp files)
- 15-second timeout for shell hooks; pi adapter is async fire-and-forget
- Errors fail silently to never block user input
- Shared config across all agents
