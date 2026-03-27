#!/bin/bash

# Read stdin (Claude Code sends session JSON, but we don't need it)
cat > /dev/null

GRAMMAR_FILE="/tmp/claude-grammar-check-status.txt"

if [ -f "$GRAMMAR_FILE" ]; then
  CONTENT=$(cat "$GRAMMAR_FILE")
  if [ -n "$CONTENT" ]; then
    echo -e "\033[33m[Grammar]\033[0m $CONTENT"
  fi
fi
