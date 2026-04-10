#!/usr/bin/env node

/**
 * Claude Code adapter — UserPromptSubmit hook.
 * Reads JSON from stdin, runs grammar check, writes result to temp file.
 */

import { readFileSync, writeFileSync } from 'fs';
import { checkGrammar, loadConfig, shouldSkip, truncateCorrections, colorizeAnsi } from '../../lib/grammar-engine.mjs';

async function main() {
  if (process.env.CC_GRAMMAR_RUNNING) process.exit(0);

  try {
    const input = readFileSync(0, 'utf-8');
    const data = JSON.parse(input);
    const prompt = data.prompt || '';
    const sessionId = data.session_id || 'default';
    const grammarFile = `/tmp/cc-grammar-status-${sessionId}.txt`;

    const config = loadConfig();

    if (shouldSkip(prompt, config)) {
      writeResult(grammarFile, '');
      process.exit(0);
    }

    const result = await checkGrammar(prompt, config);

    if (!result.hasErrors) {
      writeResult(grammarFile, '');
    } else {
      const truncated = truncateCorrections(result.corrections);
      writeResult(grammarFile, colorizeAnsi(truncated));
    }
  } catch (err) {
    writeResult('/tmp/cc-grammar-status-default.txt', '');
  }

  process.exit(0);
}

function writeResult(filePath, content) {
  try {
    writeFileSync(filePath, content);
  } catch {
    // ignore write errors
  }
}

main();
