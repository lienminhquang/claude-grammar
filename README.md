# claude-grammar

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

### Option 1: Plugin install (recommended)

```bash
claude plugin install claude-grammar@<marketplace>
```

### Option 2: Local plugin

```bash
git clone https://github.com/your-username/claude-grammar.git
cd claude-grammar
npm install
claude --plugin-dir /path/to/claude-grammar
```

### Status line setup

Plugins can't auto-register a status line. To see grammar errors in the bottom bar, add this to your `~/.claude/settings.json`:

```json
{
  "statusLine": {
    "type": "command",
    "command": "/path/to/claude-grammar/scripts/grammar-statusline.sh"
  }
}
```

Replace `/path/to/claude-grammar` with the actual path where you cloned the repo.

## Configuration

Edit `grammar.config.json` in the plugin directory to choose your LLM provider and model:

```json
{
  "provider": "anthropic",
  "model": "claude-haiku-4-5-20251001",
  "minLength": 10
}
```

### Optional fields

| Field | Description |
|-------|-------------|
| `baseUrl` | Custom API endpoint (e.g. `"https://my-proxy.example.com"`) |
| `apiKey` | API key value (not recommended — use `apiKeyEnv` instead) |
| `apiKeyEnv` | Name of env var containing the API key (e.g. `"MY_API_KEY"`) |

Example with custom endpoint:

```json
{
  "provider": "anthropic",
  "model": "claude-haiku-4-5-20251001",
  "baseUrl": "https://my-proxy.example.com",
  "apiKeyEnv": "MY_ANTHROPIC_KEY"
}
```

### Using Claude Pro/Max subscription (OAuth)

If you have a Claude Pro or Max subscription, you can use it instead of an API key:

```bash
cd /path/to/claude-grammar
npx @mariozechner/pi-ai login anthropic
```

This opens your browser for OAuth login and saves credentials to `auth.json`. The grammar checker will automatically use and refresh these tokens.

### Supported providers

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

Just type normally. Grammar errors appear automatically in the status line:

```
[Grammar] "I has" -> "I have" (subject-verb agreement)
          "thinked" -> "thought" (irregular past tense)
```

Messages shorter than 10 characters and slash commands are skipped.

## License

MIT
