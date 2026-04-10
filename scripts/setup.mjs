#!/usr/bin/env node

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { createInterface } from 'readline';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

import { SYSTEM_PROMPT } from './prompt.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = join(__dirname, '..');
const CONFIG_DIR = join(process.env.HOME || process.env.USERPROFILE, '.config', 'claude-grammar');
const CONFIG_PATH = join(CONFIG_DIR, 'grammar.config.json');

// Supported agents and their config
const AGENTS = {
  claude: { name: 'Claude Code' },
  codex: { name: 'Codex CLI' },
  gemini: { name: 'Gemini CLI' },
  pi: { name: 'Pi Coding Agent' },
};

// ─── Config helpers ──────────────────────────────────────────────────────────

function loadConfig() {
  const defaults = { model: 'haiku', minLength: 10 };
  try {
    if (existsSync(CONFIG_PATH)) {
      return { ...defaults, ...JSON.parse(readFileSync(CONFIG_PATH, 'utf-8')) };
    }
  } catch {}
  return defaults;
}

function saveConfig(config) {
  mkdirSync(CONFIG_DIR, { recursive: true });
  writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2) + '\n');
}

function createPrompt() {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const ask = (q) => new Promise((resolve) => rl.question(q, resolve));
  const close = () => rl.close();
  return { ask, close };
}

// ─── Setup wizard ────────────────────────────────────────────────────────────

async function fullSetup() {
  const { ask, close } = createPrompt();
  const config = loadConfig();

  console.log('cc-grammar setup\n');
  console.log('Current config:', JSON.stringify(config, null, 2));
  console.log('\nUses `claude -p` (Claude Code pipe mode) — no API key needed.\n');
  console.log('Model aliases: haiku, sonnet, opus (or full model ID)\n');

  const input = await ask(`Model [${config.model || 'haiku'}]: `);
  config.model = input.trim() || config.model || 'haiku';

  saveConfig(config);
  console.log('\nConfig saved to grammar.config.json:');
  console.log(JSON.stringify(config, null, 2));
  close();
}

async function setField(field, value) {
  const config = loadConfig();

  switch (field) {
    case 'model':
      config.model = value;
      break;
    case 'minLength':
      config.minLength = parseInt(value, 10);
      break;
    case 'systemPrompt':
      if (value === '' || value === 'none' || value === 'default') {
        delete config.systemPrompt;
      } else {
        config.systemPrompt = value;
      }
      break;
    default:
      console.error(`Unknown field "${field}".`);
      console.error('Available: model, minLength, systemPrompt');
      process.exit(1);
  }

  saveConfig(config);
  console.log(`Updated ${field} = ${JSON.stringify(config[field])}`);
}

// ─── Test ────────────────────────────────────────────────────────────────────

async function testGrammarCheck() {
  const { checkGrammar, colorizeAnsi } = await import('../lib/grammar-engine.mjs');

  const testInput = 'my name are quang and I has a cat';
  console.log(`Testing grammar check...\n`);

  const config = loadConfig();
  console.log(`Model: ${config.model}`);
  console.log(`Input: "${testInput}"\n`);

  try {
    const result = await checkGrammar(testInput, config);
    if (result.hasErrors) {
      console.log(`Result:\n${result.raw}`);
      console.log(`\nFormatted: ${colorizeAnsi(result.corrections)}`);
    } else {
      console.log('Result: NO_ERRORS');
    }
  } catch (err) {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  }
}

// ─── Agent: Claude Code ──────────────────────────────────────────────────────

const CLAUDE_SETTINGS_PATH = join(process.env.HOME || process.env.USERPROFILE, '.claude', 'settings.json');

function loadClaudeSettings() {
  try {
    if (existsSync(CLAUDE_SETTINGS_PATH)) {
      return JSON.parse(readFileSync(CLAUDE_SETTINGS_PATH, 'utf-8'));
    }
  } catch {}
  return {};
}

function saveClaudeSettings(settings) {
  mkdirSync(dirname(CLAUDE_SETTINGS_PATH), { recursive: true });
  writeFileSync(CLAUDE_SETTINGS_PATH, JSON.stringify(settings, null, 2) + '\n');
}

async function installClaude() {
  const { execSync } = await import('child_process');

  console.log('Installing cc-grammar globally...');
  try {
    execSync('npm install -g cc-grammar', { stdio: 'inherit' });
  } catch {
    console.error('Failed to install globally. Try: sudo npm install -g cc-grammar');
    process.exit(1);
  }

  const globalRoot = execSync('npm root -g', { encoding: 'utf-8' }).trim();
  const scriptDir = join(globalRoot, 'cc-grammar', 'scripts');

  if (!existsSync(join(scriptDir, 'grammar-check.mjs'))) {
    console.error('Error: Could not find grammar-check.mjs at ' + scriptDir);
    process.exit(1);
  }

  const settings = loadClaudeSettings();

  if (!settings.hooks) settings.hooks = {};
  if (!settings.hooks.UserPromptSubmit) settings.hooks.UserPromptSubmit = [];

  // Remove existing cc-grammar hooks
  settings.hooks.UserPromptSubmit = settings.hooks.UserPromptSubmit.filter(
    h => !JSON.stringify(h).includes('grammar-check.mjs') && !JSON.stringify(h).includes('cc-grammar')
  );

  settings.hooks.UserPromptSubmit.push({
    matcher: '',
    hooks: [{
      type: 'command',
      command: `node ${scriptDir}/grammar-check.mjs`,
      timeout: 15000
    }]
  });

  settings.statusLine = {
    type: 'command',
    command: `${scriptDir}/grammar-statusline.sh`
  };

  saveClaudeSettings(settings);

  console.log('\n✅ Claude Code — installed successfully!');
  console.log(`  Hook: node ${scriptDir}/grammar-check.mjs`);
  console.log(`  Status line: ${scriptDir}/grammar-statusline.sh`);
}

async function uninstallClaude() {
  const settings = loadClaudeSettings();

  if (settings.hooks?.UserPromptSubmit) {
    settings.hooks.UserPromptSubmit = settings.hooks.UserPromptSubmit.filter(
      h => !JSON.stringify(h).includes('grammar-check.mjs') && !JSON.stringify(h).includes('cc-grammar')
    );
    if (!settings.hooks.UserPromptSubmit.length) delete settings.hooks.UserPromptSubmit;
    if (!Object.keys(settings.hooks).length) delete settings.hooks;
  }

  if (settings.statusLine?.command?.includes('grammar-statusline') || settings.statusLine?.command?.includes('cc-grammar')) {
    delete settings.statusLine;
  }

  saveClaudeSettings(settings);
  console.log('✅ Claude Code — hooks removed from ~/.claude/settings.json');

  const { execSync } = await import('child_process');
  try {
    execSync('npm uninstall -g cc-grammar', { stdio: 'inherit' });
    console.log('Global package removed.');
  } catch {}
}

// ─── Agent: Codex CLI ────────────────────────────────────────────────────────

async function installCodex() {
  const { execSync } = await import('child_process');

  console.log('Installing cc-grammar globally...');
  try {
    execSync('npm install -g cc-grammar', { stdio: 'inherit' });
  } catch {
    console.error('Failed to install globally. Try: sudo npm install -g cc-grammar');
    process.exit(1);
  }

  const globalRoot = execSync('npm root -g', { encoding: 'utf-8' }).trim();
  const adapterPath = join(globalRoot, 'cc-grammar', 'adapters', 'codex', 'hook.mjs');

  if (!existsSync(adapterPath)) {
    console.error('Error: Could not find codex adapter at ' + adapterPath);
    process.exit(1);
  }

  const codexDir = join(process.env.HOME || process.env.USERPROFILE, '.codex');
  mkdirSync(codexDir, { recursive: true });

  const hooksPath = join(codexDir, 'hooks.json');
  let hooks = {};
  try {
    if (existsSync(hooksPath)) {
      hooks = JSON.parse(readFileSync(hooksPath, 'utf-8'));
    }
  } catch {}

  if (!hooks.UserPromptSubmit) hooks.UserPromptSubmit = [];

  // Remove existing cc-grammar hooks
  hooks.UserPromptSubmit = hooks.UserPromptSubmit.filter(
    h => !JSON.stringify(h).includes('cc-grammar')
  );

  hooks.UserPromptSubmit.push({
    hooks: [{
      type: 'command',
      command: `node ${adapterPath}`,
      timeout: 15000
    }]
  });

  writeFileSync(hooksPath, JSON.stringify(hooks, null, 2) + '\n');

  console.log('\n✅ Codex CLI — installed successfully!');
  console.log(`  Hook: node ${adapterPath}`);
  console.log(`  Config: ${hooksPath}`);
}

async function uninstallCodex() {
  const codexHooksPath = join(process.env.HOME || process.env.USERPROFILE, '.codex', 'hooks.json');
  try {
    if (existsSync(codexHooksPath)) {
      const hooks = JSON.parse(readFileSync(codexHooksPath, 'utf-8'));
      if (hooks.UserPromptSubmit) {
        hooks.UserPromptSubmit = hooks.UserPromptSubmit.filter(
          h => !JSON.stringify(h).includes('cc-grammar')
        );
        if (!hooks.UserPromptSubmit.length) delete hooks.UserPromptSubmit;
      }
      writeFileSync(codexHooksPath, JSON.stringify(hooks, null, 2) + '\n');
    }
  } catch {}
  console.log('✅ Codex CLI — hooks removed from ~/.codex/hooks.json');
}

// ─── Agent: Gemini CLI ───────────────────────────────────────────────────────

async function installGemini() {
  const { execSync } = await import('child_process');

  console.log('Installing cc-grammar globally...');
  try {
    execSync('npm install -g cc-grammar', { stdio: 'inherit' });
  } catch {
    console.error('Failed to install globally. Try: sudo npm install -g cc-grammar');
    process.exit(1);
  }

  const globalRoot = execSync('npm root -g', { encoding: 'utf-8' }).trim();
  const adapterPath = join(globalRoot, 'cc-grammar', 'adapters', 'gemini', 'hook.mjs');

  if (!existsSync(adapterPath)) {
    console.error('Error: Could not find gemini adapter at ' + adapterPath);
    process.exit(1);
  }

  const geminiDir = join(process.env.HOME || process.env.USERPROFILE, '.gemini');
  mkdirSync(geminiDir, { recursive: true });

  const settingsPath = join(geminiDir, 'settings.json');
  let settings = {};
  try {
    if (existsSync(settingsPath)) {
      settings = JSON.parse(readFileSync(settingsPath, 'utf-8'));
    }
  } catch {}

  if (!settings.hooks) settings.hooks = {};
  if (!settings.hooks.UserPromptSubmit) settings.hooks.UserPromptSubmit = [];

  // Remove existing cc-grammar hooks
  settings.hooks.UserPromptSubmit = settings.hooks.UserPromptSubmit.filter(
    h => !JSON.stringify(h).includes('cc-grammar')
  );

  settings.hooks.UserPromptSubmit.push({
    hooks: [{
      type: 'command',
      command: `node ${adapterPath}`,
      timeout: 15000
    }]
  });

  writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + '\n');

  console.log('\n✅ Gemini CLI — installed successfully!');
  console.log(`  Hook: node ${adapterPath}`);
  console.log(`  Config: ${settingsPath}`);
}

async function uninstallGemini() {
  const geminiSettingsPath = join(process.env.HOME || process.env.USERPROFILE, '.gemini', 'settings.json');
  try {
    if (existsSync(geminiSettingsPath)) {
      const settings = JSON.parse(readFileSync(geminiSettingsPath, 'utf-8'));
      if (settings.hooks?.UserPromptSubmit) {
        settings.hooks.UserPromptSubmit = settings.hooks.UserPromptSubmit.filter(
          h => !JSON.stringify(h).includes('cc-grammar')
        );
        if (!settings.hooks.UserPromptSubmit.length) delete settings.hooks.UserPromptSubmit;
        if (settings.hooks && !Object.keys(settings.hooks).length) delete settings.hooks;
      }
      writeFileSync(geminiSettingsPath, JSON.stringify(settings, null, 2) + '\n');
    }
  } catch {}
  console.log('✅ Gemini CLI — hooks removed from ~/.gemini/settings.json');
}

// ─── Agent: Pi ───────────────────────────────────────────────────────────────

function installPi() {
  console.log('\n✅ Pi Coding Agent — install via pi\'s package manager:\n');
  console.log('  pi install npm:cc-grammar\n');
  console.log('Or test without installing:\n');
  console.log('  pi -e npm:cc-grammar\n');
  console.log('The extension auto-discovers and uses your cc-grammar config.');
  console.log('Requires Claude Code CLI to be installed.');
}

function uninstallPi() {
  console.log('\n✅ Pi Coding Agent — uninstall via pi\'s package manager:\n');
  console.log('  pi remove npm:cc-grammar\n');
}

// ─── Multi-agent install/uninstall router ────────────────────────────────────

function parseAgentFlag(args) {
  const idx = args.indexOf('--agent');
  if (idx !== -1 && args[idx + 1]) {
    return args[idx + 1].toLowerCase();
  }
  // Also check for direct flags like --claude, --pi, etc.
  for (const key of Object.keys(AGENTS)) {
    if (args.includes(`--${key}`)) return key;
  }
  return null;
}

async function installHooks(args) {
  const agent = parseAgentFlag(args);

  if (agent) {
    switch (agent) {
      case 'claude': return installClaude();
      case 'codex': return installCodex();
      case 'gemini': return installGemini();
      case 'pi': return installPi();
      default:
        console.error(`Unknown agent: ${agent}`);
        console.error(`Supported: claude, codex, gemini, pi`);
        process.exit(1);
    }
  }

  // Default: install for Claude Code (backward compat)
  return installClaude();
}

async function uninstallHooks(args) {
  const agent = parseAgentFlag(args);

  if (agent) {
    switch (agent) {
      case 'claude': return uninstallClaude();
      case 'codex': return uninstallCodex();
      case 'gemini': return uninstallGemini();
      case 'pi': return uninstallPi();
      default:
        console.error(`Unknown agent: ${agent}`);
        console.error(`Supported: claude, codex, gemini, pi`);
        process.exit(1);
    }
  }

  // Default: uninstall from Claude Code (backward compat)
  return uninstallClaude();
}

async function updatePackage() {
  const { execSync } = await import('child_process');

  console.log('Updating cc-grammar to latest version...');
  try {
    execSync('npm install -g cc-grammar@latest', { stdio: 'inherit' });
  } catch {
    console.error('Failed to update. Try: sudo npm install -g cc-grammar@latest');
    process.exit(1);
  }

  const globalRoot = execSync('npm root -g', { encoding: 'utf-8' }).trim();
  const scriptDir = join(globalRoot, 'cc-grammar', 'scripts');

  if (!existsSync(join(scriptDir, 'grammar-check.mjs'))) {
    console.error('Error: Could not find grammar-check.mjs at ' + scriptDir);
    process.exit(1);
  }

  // Re-register Claude Code hooks (backward compat)
  const settings = loadClaudeSettings();

  if (!settings.hooks) settings.hooks = {};
  if (!settings.hooks.UserPromptSubmit) settings.hooks.UserPromptSubmit = [];

  settings.hooks.UserPromptSubmit = settings.hooks.UserPromptSubmit.filter(
    h => !JSON.stringify(h).includes('grammar-check.mjs') && !JSON.stringify(h).includes('cc-grammar')
  );

  settings.hooks.UserPromptSubmit.push({
    matcher: '',
    hooks: [{
      type: 'command',
      command: `node ${scriptDir}/grammar-check.mjs`,
      timeout: 15000
    }]
  });

  settings.statusLine = {
    type: 'command',
    command: `${scriptDir}/grammar-statusline.sh`
  };

  saveClaudeSettings(settings);

  const pkg = JSON.parse(readFileSync(join(scriptDir, '..', 'package.json'), 'utf-8'));
  console.log(`\nUpdated to v${pkg.version}`);
  console.log(`  Hook: node ${scriptDir}/grammar-check.mjs`);
  console.log(`  Status line: ${scriptDir}/grammar-statusline.sh`);
}

// ─── Help & info ─────────────────────────────────────────────────────────────

function showHelp() {
  console.log(`cc-grammar — Grammar checking for coding agents

Uses \`claude -p\` (Claude Code pipe mode) — no API key needed.

Usage:
  npx cc-grammar install [--agent <name>]   Install hooks (default: claude)
  npx cc-grammar uninstall [--agent <name>] Remove hooks (default: claude)
  npx cc-grammar update                     Update to latest version
  npx cc-grammar setup                      Interactive model setup
  npx cc-grammar set <field> <val>          Update a single setting
  npx cc-grammar config                     Show current config
  npx cc-grammar test                       Test grammar check with sample input
  npx cc-grammar models                     List available model aliases

Supported agents:
  claude    Claude Code (default)
  pi        Pi Coding Agent (via pi install npm:cc-grammar)
  codex     Codex CLI
  gemini    Gemini CLI

Examples:
  npx cc-grammar install                    # Install for Claude Code
  npx cc-grammar install --agent codex      # Install for Codex CLI
  npx cc-grammar set model sonnet           # Use Sonnet instead of Haiku

Settings fields: model, minLength, systemPrompt
  Use 'set systemPrompt default' to reset to built-in prompt`);
}

function showConfig() {
  const config = loadConfig();
  console.log(JSON.stringify(config, null, 2));
}

function listModels() {
  console.log('Available model aliases:\n');
  console.log('  haiku   (default, fast & cheap)');
  console.log('  sonnet');
  console.log('  opus');
  console.log('\nOr use a full model ID (e.g. claude-haiku-4-5-20251001)');
}

// ─── CLI entry ───────────────────────────────────────────────────────────────

const allArgs = process.argv.slice(2);
const command = allArgs[0];
const args = allArgs.slice(1);

switch (command) {
  case 'install':
    await installHooks(args);
    break;
  case 'update':
    await updatePackage();
    break;
  case 'uninstall':
    await uninstallHooks(args);
    break;
  case undefined:
  case 'setup':
    await fullSetup();
    break;
  case 'set':
    if (args.length < 2) {
      console.error('Usage: npx cc-grammar set <field> <value>');
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
