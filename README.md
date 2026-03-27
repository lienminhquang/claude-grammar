# claude-grammar

Automatic grammar checking for Claude Code. Catches grammar, spelling, and punctuation errors in your messages and displays them in the status line — without polluting Claude's conversation context.

## How it works

1. You type a message and hit enter
2. A `UserPromptSubmit` hook sends your message to Claude Haiku for grammar analysis
3. Errors (if any) are displayed in the status line at the bottom of your terminal
4. Claude's conversation stays clean — no context injection

## Prerequisites

- [Claude Code](https://docs.anthropic.com/en/docs/claude-code) CLI installed
- `jq` installed (`brew install jq` on macOS)

## Installation

### Option 1: Plugin install (recommended)

```bash
claude plugin install claude-grammar@<marketplace>
```

### Option 2: Local plugin

Clone this repo and point Claude Code to it:

```bash
git clone https://github.com/your-username/claude-grammar.git
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

Replace `/path/to/claude-grammar` with the actual path where you cloned the repo (or where the plugin was installed).

## Usage

Just type normally. Grammar errors appear automatically in the status line:

```
[Grammar] "I has" → "I have" (subject-verb agreement)
          "thinked" → "thought" (irregular past tense)
```

Messages shorter than 10 characters and slash commands are skipped.

## License

MIT
