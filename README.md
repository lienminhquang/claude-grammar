# cc-grammar

Automatic grammar checking for coding agents. Catches grammar, spelling, and punctuation errors in your messages and displays them in the status line — without polluting the conversation context.

Supports **Claude Code**, **Pi Coding Agent**, **Codex CLI**, and **Gemini CLI**.

Uses **any LLM provider** (OpenAI, Anthropic, Google, Groq, Ollama, etc.) via [pi-ai](https://github.com/badlogic/pi-mono/tree/main/packages/ai).

## How it works

1. You type a message and hit enter
2. Your message is sent to a fast LLM for grammar analysis (in the background)
3. Errors (if any) are displayed in the status line at the bottom of your terminal
4. The agent's conversation stays clean — no context injection

## Prerequisites

- Node.js >= 20
- One of: [Claude Code](https://docs.anthropic.com/en/docs/claude-code), [Pi](https://github.com/badlogic/pi-mono), [Codex CLI](https://github.com/openai/codex), or [Gemini CLI](https://github.com/google-gemini/gemini-cli)

## Installation

### Claude Code (default)

```bash
npx cc-grammar install
```

### Pi Coding Agent

```bash
pi install npm:cc-grammar
```

Or test without installing:

```bash
pi -e npm:cc-grammar
```

### Codex CLI

```bash
npx cc-grammar install --agent codex
```

### Gemini CLI

```bash
npx cc-grammar install --agent gemini
```

### Then configure your provider/model

```bash
npx cc-grammar setup
```

Or set fields individually:

```bash
npx cc-grammar set provider anthropic
npx cc-grammar set model claude-haiku-4-5-20251001
npx cc-grammar set apiKeyEnv ANTHROPIC_API_KEY
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
| `npx cc-grammar setup` | Interactive setup wizard |
| `npx cc-grammar set <field> <val>` | Update a single setting |
| `npx cc-grammar config` | Show current config |
| `npx cc-grammar test` | Test grammar check with sample input |
| `npx cc-grammar login` | OAuth login for current provider |
| `npx cc-grammar providers` | List available providers |
| `npx cc-grammar models` | List models for current provider |

Supported agents: `claude` (default), `pi`, `codex`, `gemini`

Settings fields: `provider`, `model`, `baseUrl`, `apiKey`, `apiKeyEnv`, `minLength`, `systemPrompt`

## Authentication

### API key (environment variable)

```bash
npx cc-grammar set apiKeyEnv ANTHROPIC_API_KEY
```

### API key (direct)

```bash
npx cc-grammar set apiKey sk-...
```

### OAuth (Claude Pro/Max subscription)

```bash
npx cc-grammar login
```

## Supported providers

| Provider | Model examples | API key env var |
|----------|---------------|-----------------|
| `anthropic` | `claude-haiku-4-5-20251001`, `claude-sonnet-4-20250514` | `ANTHROPIC_API_KEY` |
| `openai` | `gpt-4o-mini`, `gpt-4o` | `OPENAI_API_KEY` |
| `google` | `gemini-2.0-flash` | `GEMINI_API_KEY` |
| `groq` | `llama-3.1-8b-instant` | `GROQ_API_KEY` |
| `mistral` | `mistral-small-latest` | `MISTRAL_API_KEY` |
| `xai` | `grok-2` | `XAI_API_KEY` |
| `openrouter` | Any model on OpenRouter | `OPENROUTER_API_KEY` |

For local models (Ollama, vLLM, LM Studio), see [pi-ai docs](https://github.com/badlogic/pi-mono/tree/main/packages/ai).

## Usage

Just type normally in your coding agent. Grammar errors appear automatically in the status line:

```
✏️  "I has" → "I have" (subject-verb) | "thinked" → "thought" (irregular past)
```

Messages shorter than 10 characters and slash commands are skipped.

## Architecture

```
lib/grammar-engine.mjs          ← Agent-agnostic core
  ├── adapters/claude-code/     ← Shell hook + status line
  ├── adapters/pi/              ← TypeScript extension (in-process)
  ├── adapters/codex/           ← Shell hook
  └── adapters/gemini/          ← Shell hook
```

All adapters share the same grammar engine and config (`~/.config/claude-grammar/grammar.config.json`).

## License

MIT
