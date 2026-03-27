#!/usr/bin/env node

import { getProviders, getModels, getModel } from '@mariozechner/pi-ai';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { createInterface } from 'readline';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CONFIG_PATH = join(__dirname, '..', 'grammar.config.json');

function loadConfig() {
  const defaults = { provider: 'anthropic', model: 'claude-haiku-4-5-20251001', minLength: 10 };
  try {
    if (existsSync(CONFIG_PATH)) {
      return { ...defaults, ...JSON.parse(readFileSync(CONFIG_PATH, 'utf-8')) };
    }
  } catch {}
  return defaults;
}

function saveConfig(config) {
  writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2) + '\n');
}

function createPrompt() {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const ask = (q) => new Promise((resolve) => rl.question(q, resolve));
  const close = () => rl.close();
  return { ask, close };
}

async function selectProvider({ ask }) {
  const providers = getProviders();
  console.log('\nAvailable providers:\n');
  providers.forEach((p, i) => console.log(`  ${i + 1}. ${p}`));
  console.log();

  const input = await ask(`Select provider (1-${providers.length}): `);
  const index = parseInt(input, 10) - 1;
  if (index < 0 || index >= providers.length) {
    console.error('Invalid selection.');
    return null;
  }
  return providers[index];
}

async function selectModel({ ask }, provider) {
  const models = getModels(provider);
  if (!models.length) {
    console.error(`No models found for provider "${provider}".`);
    return null;
  }

  console.log(`\nAvailable models for ${provider}:\n`);
  models.forEach((m, i) => console.log(`  ${i + 1}. ${m.id}`));
  console.log();

  const input = await ask(`Select model (1-${models.length}): `);
  const index = parseInt(input, 10) - 1;
  if (index < 0 || index >= models.length) {
    console.error('Invalid selection.');
    return null;
  }
  return models[index].id;
}

async function setupAuth({ ask }, config) {
  console.log('\nAuthentication method:\n');
  console.log('  1. Environment variable (e.g. ANTHROPIC_API_KEY)');
  console.log('  2. OAuth login (Claude Pro/Max subscription)');
  console.log('  3. Custom API key');
  console.log('  4. Skip (use pi-ai defaults)');
  console.log();

  const choice = await ask('Select auth method (1-4): ');

  switch (choice.trim()) {
    case '1': {
      const envVar = await ask('Environment variable name: ');
      if (envVar.trim()) {
        config.apiKeyEnv = envVar.trim();
        delete config.apiKey;
      }
      break;
    }
    case '2': {
      console.log('\nRunning OAuth login...\n');
      const { execSync } = await import('child_process');
      try {
        execSync('npx @mariozechner/pi-ai login ' + config.provider, {
          stdio: 'inherit',
          cwd: join(__dirname, '..')
        });
        console.log('\nOAuth credentials saved.');
      } catch {
        console.error('OAuth login failed.');
      }
      delete config.apiKey;
      delete config.apiKeyEnv;
      break;
    }
    case '3': {
      const key = await ask('API key: ');
      if (key.trim()) {
        config.apiKey = key.trim();
        delete config.apiKeyEnv;
      }
      break;
    }
    case '4':
      delete config.apiKey;
      delete config.apiKeyEnv;
      break;
    default:
      console.log('Skipping auth setup.');
  }

  return config;
}

async function setupBaseUrl({ ask }, config) {
  const current = config.baseUrl || '(default)';
  const input = await ask(`\nCustom base URL [${current}]: `);
  if (input.trim()) {
    config.baseUrl = input.trim();
  } else if (input === '' && config.baseUrl) {
    // keep existing
  }
  return config;
}

async function fullSetup() {
  const { ask, close } = createPrompt();
  let config = loadConfig();

  console.log('claude-grammar setup\n');
  console.log('Current config:', JSON.stringify(config, null, 2));

  const provider = await selectProvider({ ask });
  if (!provider) { close(); return; }
  config.provider = provider;

  const model = await selectModel({ ask }, provider);
  if (!model) { close(); return; }
  config.model = model;

  config = await setupBaseUrl({ ask }, config);
  config = await setupAuth({ ask }, config);

  saveConfig(config);
  console.log('\nConfig saved to grammar.config.json:');
  console.log(JSON.stringify(config, null, 2));
  close();
}

async function setField(field, value) {
  const config = loadConfig();

  switch (field) {
    case 'provider': {
      const providers = getProviders();
      if (!providers.includes(value)) {
        console.error(`Unknown provider "${value}". Available: ${providers.join(', ')}`);
        process.exit(1);
      }
      config.provider = value;
      break;
    }
    case 'model': {
      const models = getModels(config.provider);
      const match = models.find(m => m.id === value);
      if (!match) {
        console.error(`Unknown model "${value}" for provider "${config.provider}".`);
        console.error(`Available: ${models.map(m => m.id).join(', ')}`);
        process.exit(1);
      }
      config.model = value;
      break;
    }
    case 'baseUrl':
      if (value === '' || value === 'none') {
        delete config.baseUrl;
      } else {
        config.baseUrl = value;
      }
      break;
    case 'apiKey':
      config.apiKey = value;
      delete config.apiKeyEnv;
      break;
    case 'apiKeyEnv':
      config.apiKeyEnv = value;
      delete config.apiKey;
      break;
    case 'minLength':
      config.minLength = parseInt(value, 10);
      break;
    default:
      console.error(`Unknown field "${field}".`);
      console.error('Available: provider, model, baseUrl, apiKey, apiKeyEnv, minLength');
      process.exit(1);
  }

  saveConfig(config);
  console.log(`Updated ${field} = ${JSON.stringify(config[field])}`);
}

async function testGrammarCheck() {
  const piAi = await import('@mariozechner/pi-ai');
  const { getOAuthApiKey } = await import('@mariozechner/pi-ai/oauth');
  const { completeSimple, getEnvApiKey } = piAi;

  const testInput = 'my name are quang and I has a cat';
  console.log(`Testing grammar check...\n`);

  const config = loadConfig();
  console.log(`Provider: ${config.provider}`);
  console.log(`Model: ${config.model}`);
  if (config.baseUrl) console.log(`Base URL: ${config.baseUrl}`);
  console.log(`Input: "${testInput}"\n`);

  // Resolve model
  const model = getModel(config.provider, config.model);
  if (config.baseUrl) model.baseUrl = config.baseUrl;

  // Resolve API key (same logic as grammar-check.mjs)
  const options = {};
  const authFile = join(__dirname, '..', 'auth.json');
  if (existsSync(authFile)) {
    try {
      const auth = JSON.parse(readFileSync(authFile, 'utf-8'));
      if (auth[config.provider]) {
        const { type, ...credentials } = auth[config.provider];
        const result = await getOAuthApiKey(config.provider, { [config.provider]: credentials });
        if (result) options.apiKey = result.apiKey;
      }
    } catch {}
  }
  if (!options.apiKey && config.apiKey) {
    options.apiKey = config.apiKey;
  } else if (!options.apiKey && config.apiKeyEnv) {
    options.apiKey = process.env[config.apiKeyEnv] || '';
  }

  if (!options.apiKey) {
    const defaultKey = getEnvApiKey(config.provider);
    if (!defaultKey) {
      console.error('Error: No API key configured.');
      console.error('\nFix with one of:');
      console.error(`  claude-grammar set apiKeyEnv ANTHROPIC_API_KEY`);
      console.error(`  claude-grammar login`);
      console.error(`  claude-grammar setup`);
      process.exit(1);
    }
  }

  try {
    const response = await completeSimple(model, {
      systemPrompt: 'You are a grammar checker. Output corrections in format: "original" → "corrected" (reason). If no errors, output NO_ERRORS.',
      messages: [{ role: 'user', content: testInput, timestamp: Date.now() }]
    }, options);

    if (response.stopReason === 'error') {
      console.error(`API error: ${response.errorMessage}`);
      process.exit(1);
    }

    const text = response.content.filter(b => b.type === 'text').map(b => b.text).join('');
    console.log(`Result:\n${text}`);
  } catch (err) {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  }
}

function showHelp() {
  console.log(`Usage:
  npx claude-grammar setup              Interactive setup wizard
  npx claude-grammar set <field> <val>  Update a single setting
  npx claude-grammar config             Show current config
  npx claude-grammar test               Test grammar check with sample input
  npx claude-grammar login              OAuth login for current provider
  npx claude-grammar providers          List available providers
  npx claude-grammar models             List models for current provider

Fields for 'set': provider, model, baseUrl, apiKey, apiKeyEnv, minLength`);
}

function showConfig() {
  const config = loadConfig();
  console.log(JSON.stringify(config, null, 2));
}

function listProviders() {
  const providers = getProviders();
  console.log('Available providers:\n');
  providers.forEach(p => console.log(`  ${p}`));
}

function listModels() {
  const config = loadConfig();
  const models = getModels(config.provider);
  console.log(`Models for ${config.provider}:\n`);
  models.forEach(m => console.log(`  ${m.id}`));
}

async function oauthLogin() {
  const config = loadConfig();
  const { execSync } = await import('child_process');
  console.log(`Logging in to ${config.provider} via OAuth...\n`);
  try {
    execSync('npx @mariozechner/pi-ai login ' + config.provider, {
      stdio: 'inherit',
      cwd: join(__dirname, '..')
    });
  } catch {
    console.error('OAuth login failed.');
    process.exit(1);
  }
}

// CLI entry
const [command, ...args] = process.argv.slice(2);

switch (command) {
  case undefined:
  case 'setup':
    await fullSetup();
    break;
  case 'set':
    if (args.length < 2) {
      console.error('Usage: npx claude-grammar set <field> <value>');
      process.exit(1);
    }
    await setField(args[0], args.slice(1).join(' '));
    break;
  case 'config':
    showConfig();
    break;
  case 'test':
    await testGrammarCheck();
    break;
  case 'login':
    await oauthLogin();
    break;
  case 'providers':
    listProviders();
    break;
  case 'models':
    listModels();
    break;
  case 'help':
  case '--help':
  case '-h':
    showHelp();
    break;
  default:
    console.error(`Unknown command: ${command}`);
    showHelp();
    process.exit(1);
}
