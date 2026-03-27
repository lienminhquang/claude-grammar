# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

cc-grammar is a grammar checking tool for Claude Code. It runs as a UserPromptSubmit hook, checking user messages for grammar/spelling errors via an LLM, and displays corrections in the status line — never polluting conversation context.

## Commands

```bash
npx cc-grammar install     # Install globally + register hooks in ~/.claude/settings.json
npx cc-grammar setup       # Interactive provider/model config wizard
npx cc-grammar test        # Test grammar check with sample input
npx cc-grammar config      # Show current configuration
npx cc-grammar uninstall   # Remove hooks + global package
```

No automated test suite, linter, or formatter is configured.

## Architecture

Three scripts handle all functionality:

- **`scripts/grammar-check.mjs`** — Grammar checking engine. Receives JSON on stdin (with `prompt` field) from the Claude Code hook system, calls an LLM, and writes corrections to `/tmp/claude-grammar-check-status.txt`. Skips empty input, slash commands, and messages shorter than `minLength`.

- **`scripts/setup.mjs`** — CLI entry point (`cc-grammar` bin). Handles install/uninstall/update (modifies `~/.claude/settings.json`), interactive setup, config management, OAuth login, and provider/model listing.

- **`scripts/grammar-statusline.sh`** — Bash script that reads `/tmp/claude-grammar-check-status.txt` and formats output with ANSI yellow for the status line display.

### Data flow

```
User sends message → UserPromptSubmit hook triggers grammar-check.mjs
  → LLM returns corrections → written to /tmp/claude-grammar-check-status.txt
  → statusLine hook runs grammar-statusline.sh → reads file → displays in status bar
```

### Configuration

- Config file: `~/.config/claude-grammar/grammar.config.json`
- OAuth tokens: `~/.config/claude-grammar/auth.json`
- Key fields: `provider`, `model`, `baseUrl`, `apiKey`, `apiKeyEnv`, `minLength`
- Auth priority: OAuth > apiKey > apiKeyEnv > pi-ai default

### Dependencies

Single dependency: `@mariozechner/pi-ai` — abstracts multi-provider LLM access (Anthropic, OpenAI, Google, Groq, Mistral, XAI, OpenRouter, local models).

### Key design decisions

- ES modules (`.mjs`), Node.js >= 20
- 15-second hook timeout; errors fail silently to never block user input
- Uses `/tmp/` file as IPC between hook and status line
- Hook registration modifies the user's `~/.claude/settings.json` directly
