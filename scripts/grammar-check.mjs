#!/usr/bin/env node

import { getModel, completeSimple } from '@mariozechner/pi-ai';
import { getOAuthApiKey } from '@mariozechner/pi-ai/oauth';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { SYSTEM_PROMPT } from './prompt.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CONFIG_DIR = join(process.env.HOME || process.env.USERPROFILE, '.config', 'claude-grammar');

async function main() {
  try {
    // Read stdin
    const input = readFileSync(0, 'utf-8');
    const data = JSON.parse(input);
    const prompt = data.prompt || '';
    const sessionId = data.session_id || 'default';
    const grammarFile = `/tmp/claude-grammar-check-status-${sessionId}.txt`;

    // Skip empty, slash commands, short messages
    if (!prompt || prompt.startsWith('/') || prompt.length < getConfig().minLength) {
      writeResult(grammarFile, '');
      process.exit(0);
    }

    const config = getConfig();
    const model = getModel(config.provider, config.model);

    // Override baseUrl if configured
    if (config.baseUrl) {
      model.baseUrl = config.baseUrl;
    }

    const options = {};
    // Resolve API key: oauth > config.apiKey > config.apiKeyEnv > pi-ai default
    const oauthKey = await resolveOAuthKey(config.provider);
    if (oauthKey) {
      options.apiKey = oauthKey;
    } else if (config.apiKey) {
      options.apiKey = config.apiKey;
    } else if (config.apiKeyEnv) {
      options.apiKey = process.env[config.apiKeyEnv] || '';
    }

    const systemPrompt = config.systemPrompt || SYSTEM_PROMPT;

    const response = await completeSimple(model, {
      systemPrompt,
      messages: [{ role: 'user', content: prompt, timestamp: Date.now() }]
    }, options);

    // Check for API errors
    if (response.stopReason === 'error') {
      writeResult(grammarFile, '');
      process.exit(0);
    }

    const text = response.content
      .filter(b => b.type === 'text')
      .map(b => b.text)
      .join('');

    // Check for NO_ERRORS
    if (/NO_ERRORS/i.test(text)) {
      writeResult(grammarFile, '');
    } else {
      // Collapse multi-line output to single line for status bar
      const sanitized = text.trim()
        .split('\n')
        .map(l => l.trim())
        .filter(Boolean)
        .join(' | ');
      // Truncate visible text before adding ANSI colors
      const MAX_WIDTH = 150;
      const truncated = sanitized.length > MAX_WIDTH
        ? sanitized.substring(0, MAX_WIDTH) + '…'
        : sanitized;
      writeResult(grammarFile, colorize(truncated));
    }
  } catch (err) {
    // Don't block the user on errors — just clear status
    writeResult('/tmp/claude-grammar-check-status-default.txt', '');
  }

  process.exit(0);
}

const AUTH_FILE = join(CONFIG_DIR, 'auth.json');

async function resolveOAuthKey(provider) {
  try {
    if (!existsSync(AUTH_FILE)) return null;
    const auth = JSON.parse(readFileSync(AUTH_FILE, 'utf-8'));
    if (!auth[provider]) return null;

    const { type, ...credentials } = auth[provider];
    const result = await getOAuthApiKey(provider, { [provider]: credentials });
    if (!result) return null;

    // Persist refreshed credentials
    auth[provider] = { type: 'oauth', ...result.newCredentials };
    writeFileSync(AUTH_FILE, JSON.stringify(auth, null, 2));

    return result.apiKey;
  } catch {
    return null;
  }
}

function getConfig() {
  const defaults = { provider: 'anthropic', model: 'claude-haiku-4-5-20251001', minLength: 10 };
  try {
    const configPath = join(CONFIG_DIR, 'grammar.config.json');
    const raw = readFileSync(configPath, 'utf-8');
    return { ...defaults, ...JSON.parse(raw) };
  } catch {
    return defaults;
  }
}

function colorize(text) {
  const RED = '\x1b[31m';
  const GREEN = '\x1b[32m';
  const DIM = '\x1b[2m';
  const RESET = '\x1b[0m';

  // Pattern: "original" → "corrected" (reason)
  return text.replace(
    /"([^"]*?)"\s*→\s*"([^"]*?)"\s*(\([^)]*\))/g,
    `${RED}"$1"${RESET} → ${GREEN}"$2"${RESET} ${DIM}$3${RESET}`
  );
}

function writeResult(filePath, content) {
  try {
    writeFileSync(filePath, content);
  } catch {
    // ignore write errors
  }
}

main();
