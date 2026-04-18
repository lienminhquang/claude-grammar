/**
 * Shared grammar-checking engine.
 * Agent-agnostic: no stdin, no file I/O, no UI.
 * Uses `claude -p` (Claude Code pipe mode) as the LLM backend.
 */

import { execFileSync } from 'child_process';
import { readFileSync } from 'fs';
import { join } from 'path';
import { SYSTEM_PROMPT } from './prompt.mjs';

const HOME = process.env.HOME || process.env.USERPROFILE;
const CONFIG_DIR = join(HOME, '.config', 'claude-grammar');

/**
 * Load grammar config from ~/.config/claude-grammar/grammar.config.json
 */
export function loadConfig() {
  const defaults = { model: 'haiku', minLength: 10 };
  try {
    const configPath = join(CONFIG_DIR, 'grammar.config.json');
    const raw = readFileSync(configPath, 'utf-8');
    return { ...defaults, ...JSON.parse(raw) };
  } catch {
    return defaults;
  }
}

/**
 * Check grammar of the given text.
 * Returns { hasErrors: boolean, corrections: string, raw: string }
 */
export async function checkGrammar(text, config) {
  config = config || loadConfig();

  const systemPrompt = config.systemPrompt || SYSTEM_PROMPT;
  const model = config.model || 'haiku';

  const args = ['-p', '--system-prompt', systemPrompt, '--model', model];

  const raw = execFileSync('claude', args, {
    input: `<text>\n${text}\n</text>`,
    encoding: 'utf-8',
    timeout: 15000,
    env: { ...process.env, CC_GRAMMAR_RUNNING: '1' },
  }).trim();

  if (/NO_ERRORS/i.test(raw)) {
    return { hasErrors: false, corrections: '', raw };
  }

  const corrections = raw.trim()
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean)
    .join(' | ');

  return { hasErrors: true, corrections, raw };
}

/**
 * Truncate corrections for status bar display.
 */
export function truncateCorrections(text, maxWidth = 150) {
  if (text.length > maxWidth) {
    return text.substring(0, maxWidth) + '…';
  }
  return text;
}

/**
 * Colorize corrections with ANSI escape codes.
 * Pattern: "original" → "corrected" (reason)
 */
export function colorizeAnsi(text) {
  const RED = '\x1b[31m';
  const GREEN = '\x1b[32m';
  const DIM = '\x1b[2m';
  const RESET = '\x1b[0m';

  return text
    .replace(/\[\[([^\]]+)\]\]/g, `${GREEN}$1${RESET}`)
    .replace(/ — (.+)$/, ` ${DIM}— $1${RESET}`);
}

/**
 * Check if text should be skipped (empty, slash command, too short).
 */
export function shouldSkip(text, config) {
  config = config || loadConfig();
  if (!text) return true;
  if (text.startsWith('/')) return true;
  if (text.length < (config.minLength || 10)) return true;
  return false;
}

export { SYSTEM_PROMPT } from './prompt.mjs';
export { CONFIG_DIR };
