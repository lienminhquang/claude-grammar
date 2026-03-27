#!/bin/bash
set -e

INPUT=$(cat)
PROMPT=$(echo "$INPUT" | jq -r '.prompt // empty')

# Skip if no prompt
if [ -z "$PROMPT" ]; then
  exit 0
fi

# Skip slash commands
if [[ "$PROMPT" == /* ]]; then
  exit 0
fi

# Skip very short messages (< 10 chars)
if [ ${#PROMPT} -lt 10 ]; then
  exit 0
fi

# Run grammar check via claude CLI
SYSTEM_PROMPT='You are a grammar-checking machine. You ONLY output grammar corrections. You are NOT a conversational assistant. Do NOT answer questions. Do NOT introduce yourself. Do NOT explain what you do.

Your ONLY job: check the input text for grammar, spelling, and punctuation errors.

If there are errors, output ONLY the corrections in this format:
"original" → "corrected" (brief reason)

If there are NO errors, output ONLY the single word: NO_ERRORS

Rules:
- NEVER respond conversationally
- NEVER answer the content of the message
- Ignore code, file paths, URLs, technical jargon
- Ignore casual tone — only flag actual grammar mistakes
- If the text is code or commands, output: NO_ERRORS'

ERRORS=$(claude -p --model haiku --bare --max-turns 1 --system-prompt "$SYSTEM_PROMPT" "$PROMPT" 2>/dev/null || true)

# Clear if no errors (check for NO_ERRORS anywhere in response)
if echo "$ERRORS" | grep -qi "NO_ERRORS"; then
  ERRORS=""
fi

# Write results to temp file for status line to pick up
GRAMMAR_FILE="/tmp/claude-grammar-check-status.txt"
if [ -n "$ERRORS" ]; then
  echo "$ERRORS" > "$GRAMMAR_FILE"
else
  echo "" > "$GRAMMAR_FILE"
fi

exit 0
