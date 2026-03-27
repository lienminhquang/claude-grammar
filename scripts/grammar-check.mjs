#!/usr/bin/env node

import { getModel, completeSimple } from '@mariozechner/pi-ai';
import { getOAuthApiKey } from '@mariozechner/pi-ai/oauth';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CONFIG_DIR = join(process.env.HOME || process.env.USERPROFILE, '.config', 'claude-grammar');
const GRAMMAR_FILE = '/tmp/claude-grammar-check-status.txt';

const SYSTEM_PROMPT = `You are a grammar-checking machine. You ONLY output grammar corrections. You are NOT a conversational assistant. Do NOT answer questions. Do NOT introduce yourself. Do NOT explain what you do.

Your ONLY job: check the input text for grammar, spelling, and punctuation errors.

If there are errors, output ONLY the corrections in this format:
"original" → "corrected" (brief reason)

If there are NO errors, output ONLY the single word: NO_ERRORS

Rules:
- NEVER respond conversationally
- NEVER answer the content of the message
- Ignore code, file paths, URLs, technical jargon
- Ignore casual tone — only flag actual grammar mistakes
- If the text is code or commands, output: NO_ERRORS`;

async function main() {
  try {
    // Read stdin
    const input = readFileSync(0, 'utf-8');
    const data = JSON.parse(input);
    const prompt = data.prompt || '';

    // Skip empty, slash commands, short messages
    if (!prompt || prompt.startsWith('/') || prompt.length < getConfig().minLength) {
      writeResult('');
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

    const response = await completeSimple(model, {
      systemPrompt: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: prompt, timestamp: Date.now() }]
    }, options);

    const text = response.content
      .filter(b => b.type === 'text')
      .map(b => b.text)
      .join('');

    // Check for NO_ERRORS
    if (/NO_ERRORS/i.test(text)) {
      writeResult('');
    } else {
      writeResult(text.trim());
    }
  } catch (err) {
    // Don't block the user on errors — just clear status
    writeResult('');
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

function writeResult(content) {
  try {
    writeFileSync(GRAMMAR_FILE, content);
  } catch {
    // ignore write errors
  }
}

main();
