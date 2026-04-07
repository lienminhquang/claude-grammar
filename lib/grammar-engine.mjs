/**
 * Shared grammar-checking engine.
 * Agent-agnostic: no stdin, no file I/O, no UI.
 * Used by all adapters (Claude Code, Pi, Codex, Gemini, etc.)
 */

import { getModel, completeSimple } from '@mariozechner/pi-ai';
import { getOAuthApiKey } from '@mariozechner/pi-ai/oauth';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { SYSTEM_PROMPT } from './prompt.mjs';

const HOME = process.env.HOME || process.env.USERPROFILE;
const CONFIG_DIR = join(HOME, '.config', 'claude-grammar');
const AUTH_FILE = join(CONFIG_DIR, 'auth.json');

/**
 * Load grammar config from ~/.config/claude-grammar/grammar.config.json
 */
export function loadConfig() {
  const defaults = { provider: 'anthropic', model: 'claude-haiku-4-5-20251001', minLength: 10 };
  try {
    const configPath = join(CONFIG_DIR, 'grammar.config.json');
    const raw = readFileSync(configPath, 'utf-8');
    return { ...defaults, ...JSON.parse(raw) };
  } catch {
    return defaults;
  }
}

/**
 * Resolve API key with priority: OAuth > apiKey > apiKeyEnv > null
 */
export async function resolveApiKey(provider, config) {
  // 1. OAuth
  try {
    if (existsSync(AUTH_FILE)) {
      const auth = JSON.parse(readFileSync(AUTH_FILE, 'utf-8'));
      if (auth[provider]) {
        const { type, ...credentials } = auth[provider];
        const result = await getOAuthApiKey(provider, { [provider]: credentials });
        if (result) {
          // Persist refreshed credentials
          auth[provider] = { type: 'oauth', ...result.newCredentials };
          mkdirSync(CONFIG_DIR, { recursive: true });
          writeFileSync(AUTH_FILE, JSON.stringify(auth, null, 2));
          return result.apiKey;
        }
      }
    }
  } catch {
    // fall through
  }

  // 2. Direct API key
  if (config.apiKey) return config.apiKey;

  // 3. Environment variable
  if (config.apiKeyEnv) return process.env[config.apiKeyEnv] || null;

  // 4. Let pi-ai use its own defaults
  return null;
}

/**
 * Check grammar of the given text.
 * Returns { hasErrors: boolean, corrections: string, raw: string }
 */
export async function checkGrammar(text, config) {
  config = config || loadConfig();

  const model = getModel(config.provider, config.model);
  if (config.baseUrl) {
    model.baseUrl = config.baseUrl;
  }

  const options = {};
  const apiKey = await resolveApiKey(config.provider, config);
  if (apiKey) {
    options.apiKey = apiKey;
  }

  const systemPrompt = config.systemPrompt || SYSTEM_PROMPT;

  const response = await completeSimple(model, {
    systemPrompt,
    messages: [{ role: 'user', content: text, timestamp: Date.now() }]
  }, options);

  if (response.stopReason === 'error') {
    return { hasErrors: false, corrections: '', raw: '' };
  }

  const raw = response.content
    .filter(b => b.type === 'text')
    .map(b => b.text)
    .join('');

  if (/NO_ERRORS/i.test(raw)) {
    return { hasErrors: false, corrections: '', raw };
  }

  // Collapse multi-line output to single line
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
export { CONFIG_DIR, AUTH_FILE };
