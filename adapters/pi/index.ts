/**
 * Pi coding agent adapter — grammar checking extension.
 *
 * Intercepts user input via the `input` event, runs grammar check
 * asynchronously, and displays corrections in the footer status line.
 *
 * Install: pi install npm:cc-grammar
 * Test:    pi -e ./adapters/pi/index.ts
 */

import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
// @ts-ignore — .mjs import works at runtime via jiti
import { checkGrammar, loadConfig, shouldSkip, truncateCorrections } from "../../lib/grammar-engine.mjs";

export default function (pi: ExtensionAPI) {
  const STATUS_KEY = "grammar";

  pi.on("session_start", async (_event, ctx) => {
    // Clear any stale status from previous session
    ctx.ui.setStatus(STATUS_KEY, undefined);
  });

  pi.on("input", async (event, ctx) => {
    // Skip in non-interactive modes (print, JSON)
    if (!ctx.hasUI) return { action: "continue" as const };

    // Skip extension-injected messages
    if (event.source === "extension") return { action: "continue" as const };

    // Clear previous grammar status immediately
    ctx.ui.setStatus(STATUS_KEY, undefined);

    const config = loadConfig();

    // Skip empty, slash commands, short messages
    if (shouldSkip(event.text, config)) {
      return { action: "continue" as const };
    }

    // Fire-and-forget grammar check — never block user input
    runGrammarCheck(event.text, config, ctx).catch(() => {
      // Silently ignore errors
    });

    return { action: "continue" as const };
  });

  async function runGrammarCheck(text: string, config: any, ctx: any) {
    try {
      const result = await checkGrammar(text, config);

      if (!result.hasErrors) return;

      const theme = ctx.ui.theme;
      const corrections = truncateCorrections(result.corrections);

      // Colorize using pi's theme system
      const themed = colorizeThemed(corrections, theme);
      ctx.ui.setStatus(STATUS_KEY, "✏️  " + themed);
    } catch {
      // Silently ignore — never disrupt the user
    }
  }

  function colorizeThemed(text: string, theme: any): string {
    // Pattern: "original" → "corrected" (reason)
    return text.replace(
      /"([^"]*?)"\s*→\s*"([^"]*?)"\s*(\([^)]*\))/g,
      (_match: string, original: string, corrected: string, reason: string) => {
        return (
          theme.fg("error", `"${original}"`) +
          " → " +
          theme.fg("success", `"${corrected}"`) +
          " " +
          theme.fg("dim", reason)
        );
      }
    );
  }

  // Register /grammar-config command for viewing config in pi
  pi.registerCommand("grammar-config", {
    description: "Show grammar checker configuration",
    handler: async (_args: string, ctx: any) => {
      const config = loadConfig();
      const lines = [
        `Provider: ${config.provider}`,
        `Model: ${config.model}`,
        `Min length: ${config.minLength}`,
      ];
      if (config.baseUrl) lines.push(`Base URL: ${config.baseUrl}`);
      if (config.apiKeyEnv) lines.push(`API key env: ${config.apiKeyEnv}`);
      if (config.apiKey) lines.push(`API key: ${config.apiKey.substring(0, 8)}...`);
      ctx.ui.notify(lines.join(" | "), "info");
    },
  });
}
