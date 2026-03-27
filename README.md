# cc-grammar

Automatic grammar checking for Claude Code. Catches grammar, spelling, and punctuation errors in your messages and displays them in the status line — without polluting Claude's conversation context.

Supports **any LLM provider** (OpenAI, Anthropic, Google, Groq, Ollama, etc.) via [pi-ai](https://github.com/badlogic/pi-mono/tree/main/packages/ai).

## How it works

1. You type a message and hit enter
2. A `UserPromptSubmit` hook sends your message to your configured LLM for grammar analysis
3. Errors (if any) are displayed in the status line at the bottom of your terminal
4. Claude's conversation stays clean — no context injection

## Prerequisites

- [Claude Code](https://docs.anthropic.com/en/docs/claude-code) CLI installed
- Node.js >= 20

## Installation

```bash
npx cc-grammar install
```

This installs `cc-grammar` globally and registers the grammar-check hook + status line in `~/.claude/settings.json`.

Then configure your provider and model:

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

## Update

```bash
npx cc-grammar update
```

## Uninstall

```bash
npx cc-grammar uninstall
```

Removes hooks from `~/.claude/settings.json` and uninstalls the global package. Config in `~/.config/claude-grammar/` is preserved.

## Commands

| Command | Description |
|---------|-------------|
| `npx cc-grammar install` | Install hooks into Claude Code |
| `npx cc-grammar update` | Update to latest version |
| `npx cc-grammar uninstall` | Remove hooks from Claude Code |
| `npx cc-grammar setup` | Interactive setup wizard |
| `npx cc-grammar set <field> <val>` | Update a single setting |
| `npx cc-grammar config` | Show current config |
| `npx cc-grammar test` | Test grammar check with sample input |
| `npx cc-grammar login` | OAuth login for current provider |
| `npx cc-grammar providers` | List available providers |
| `npx cc-grammar models` | List models for current provider |

Settings fields: `provider`, `model`, `baseUrl`, `apiKey`, `apiKeyEnv`, `minLength`

## Authentication

### API key (environment variable)

```bash
npx cc-grammar set apiKeyEnv ANTHROPIC_API_KEY
```

### API key (direct)

```bash
npx cc-grammar set apiKey sk-...
```

### Claude Pro/Max subscription (OAuth)

```bash
npx cc-grammar login
```

Opens your browser for OAuth login. Tokens are saved and auto-refreshed.

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

Just type normally in Claude Code. Grammar errors appear automatically in the status line:

```
[Grammar] "I has" -> "I have" (subject-verb agreement)
          "thinked" -> "thought" (irregular past tense)
```

Messages shorter than 10 characters and slash commands are skipped.

## License

MIT
