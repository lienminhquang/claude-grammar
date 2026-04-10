#!/bin/bash

# Claude Code status line adapter.
# Reads grammar check result from temp file and displays with pencil icon.

# Read stdin — Claude Code sends session JSON with session_id
input=$(cat)

# Extract session_id from JSON
SESSION_ID=$(echo "$input" | grep -o '"session_id":"[^"]*"' | cut -d'"' -f4)
SESSION_ID=${SESSION_ID:-default}

GRAMMAR_FILE="/tmp/cc-grammar-status-${SESSION_ID}.txt"

if [ ! -f "$GRAMMAR_FILE" ]; then
  exit 0
fi

CONTENT=$(cat "$GRAMMAR_FILE")
if [ -z "$CONTENT" ]; then
  exit 0
fi

echo -e "✏️  $CONTENT"
