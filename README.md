# cc-grammar

Automatic grammar checking for coding agents. Catches grammar, spelling, and punctuation errors in your messages and displays them in the status line — without polluting the conversation context.

Supports **Claude Code**, **Pi Coding Agent**, **Codex CLI**, and **Gemini CLI**.

Uses **`claude -p`** (Claude Code pipe mode) — no API keys needed. Piggybacks on your existing Claude Code authentication.

## How it works

1. You type a message and hit enter
2. Your message is sent to a fast LLM for grammar analysis (in the background)
3. Errors (if any) are displayed in the status line at the bottom of your terminal
4. The agent's conversation stays clean — no context injection

## Prerequisites

- Node.js >= 20
- [Claude Code](https://docs.anthropic.com/en/docs/claude-code) installed and authenticated
- One of: Claude Code, [Pi](https://github.com/badlogic/pi-mono), [Codex CLI](https://github.com/openai/codex), or [Gemini CLI](https://github.com/google-gemini/gemini-cli)

## Installation

### Claude Code (default)

```bash
npx cc-grammar install
```

### Pi Coding Agent

```bash
pi install npm:cc-grammar
```

### Codex CLI

```bash
npx cc-grammar install --agent codex
```

### Gemini CLI

```bash
npx cc-grammar install --agent gemini
```

### Configure model (optional)

Default model is `haiku` (fast and cheap). To change:

```bash
npx cc-grammar set model sonnet
```

Verify it works:

```bash
npx cc-grammar test
```

## Uninstall

```bash
npx cc-grammar uninstall                    # Claude Code (default)
npx cc-grammar uninstall --agent codex      # Codex CLI
npx cc-grammar uninstall --agent gemini     # Gemini CLI
pi remove npm:cc-grammar                    # Pi
```

## Update

```bash
npx cc-grammar update
```

## Commands

| Command | Description |
|---------|-------------|
| `npx cc-grammar install [--agent <name>]` | Install for a coding agent |
| `npx cc-grammar uninstall [--agent <name>]` | Remove from a coding agent |
| `npx cc-grammar update` | Update to latest version |
| `npx cc-grammar setup` | Interactive model setup |
| `npx cc-grammar set <field> <val>` | Update a single setting |
| `npx cc-grammar config` | Show current config |
| `npx cc-grammar test` | Test grammar check with sample input |
| `npx cc-grammar models` | List available model aliases |

Supported agents: `claude` (default), `pi`, `codex`, `gemini`

Settings fields: `model`, `minLength`, `systemPrompt`

## Model aliases

| Alias | Description |
|-------|-------------|
| `haiku` | Default — fast and cheap |
| `sonnet` | Balanced |
| `opus` | Most capable |

Or use a full model ID (e.g. `claude-haiku-4-5-20251001`).

## Usage

Just type normally in your coding agent. Grammar errors appear automatically in the status line:

```
✏️  "I has" → "I have" (subject-verb) | "thinked" → "thought" (irregular past)
```

Messages shorter than 10 characters and slash commands are skipped.

## Architecture

```
lib/grammar-engine.mjs          ← Agent-agnostic core (uses claude -p)
  ├── adapters/claude-code/     ← Shell hook + status line
  ├── adapters/pi/              ← TypeScript extension (in-process)
  ├── adapters/codex/           ← Shell hook
  └── adapters/gemini/          ← Shell hook
```

All adapters share the same grammar engine and config (`~/.config/claude-grammar/grammar.config.json`).

## License

MIT
