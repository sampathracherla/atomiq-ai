/**
 * Configuration management — loads, validates, and merges framework configuration.
 */

import * as fs from "fs";
import * as path from "path";
import type { FrameworkConfig, AIProviderType } from "./types";

const DEFAULT_CONFIG: FrameworkConfig = {
  ai: {
    type: "openai" as AIProviderType,
    model: "gpt-4o",
    temperature: 0.2,
    maxTokens: 4096,
  },
  appType: "web",
  baseUrl: "",
  healing: {
    enabled: true,
    maxAttempts: 3,
    useAI: true,
    cachePath: ".ai-test/locator-cache.json",
  },
  visual: {
    enabled: false,
    baselineDir: ".ai-test/baselines",
    diffDir: ".ai-test/diffs",
    threshold: 0.1,
    useAI: false,
  },
  reporting: {
    format: "html",
    outputDir: ".ai-test/reports",
    includeAIAnalysis: true,
    includeScreenshots: true,
    includeHealingLog: true,
  },
  timeouts: {
    action: 30_000,
    navigation: 60_000,
    assertion: 10_000,
  },
  logLevel: "info",
};

/**
 * Deep merge two objects. `overrides` takes precedence.
 */
function deepMerge<T extends Record<string, unknown>>(
  base: T,
  overrides: Partial<T>,
): T {
  const result = { ...base };
  for (const key of Object.keys(overrides) as Array<keyof T>) {
    const val = overrides[key];
    if (
      val &&
      typeof val === "object" &&
      !Array.isArray(val) &&
      typeof result[key] === "object"
    ) {
      result[key] = deepMerge(
        result[key] as Record<string, unknown>,
        val as Record<string, unknown>,
      ) as T[keyof T];
    } else if (val !== undefined) {
      result[key] = val as T[keyof T];
    }
  }
  return result;
}

/**
 * Resolve environment variable placeholders in string values.
 * Supports `${ENV_VAR}` and `$ENV_VAR` syntax.
 */
function resolveEnvVars(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === "string") {
      result[key] = value.replace(/\$\{(\w+)\}|\$(\w+)/g, (_, g1, g2) => {
        const envVar = g1 || g2;
        return process.env[envVar] ?? "";
      });
    } else if (value && typeof value === "object" && !Array.isArray(value)) {
      result[key] = resolveEnvVars(value as Record<string, unknown>);
    } else {
      result[key] = value;
    }
  }
  return result;
}

/**
 * Load framework configuration from file and environment.
 */
export function loadConfig(configPath?: string): FrameworkConfig {
  let fileConfig: Partial<FrameworkConfig> = {};

  // Try loading config file
  const searchPaths = configPath
    ? [configPath]
    : [
        path.resolve("ai-test.config.json"),
        path.resolve("ai-test.config.js"),
        path.resolve(".ai-test/config.json"),
      ];

  for (const p of searchPaths) {
    if (fs.existsSync(p)) {
      if (p.endsWith(".json")) {
        const raw = fs.readFileSync(p, "utf-8");
        fileConfig = JSON.parse(raw);
      } else if (p.endsWith(".js")) {
        fileConfig = require(p);
      }
      break;
    }
  }

  // Merge: defaults → file → env overrides
  const merged: FrameworkConfig = {
    ...DEFAULT_CONFIG,
    ...fileConfig,
    ai: { ...DEFAULT_CONFIG.ai, ...(fileConfig.ai ?? {}) },
    healing: { ...DEFAULT_CONFIG.healing, ...(fileConfig.healing ?? {}) },
    visual: { ...DEFAULT_CONFIG.visual, ...(fileConfig.visual ?? {}) },
    reporting: { ...DEFAULT_CONFIG.reporting, ...(fileConfig.reporting ?? {}) },
    timeouts: { ...DEFAULT_CONFIG.timeouts, ...(fileConfig.timeouts ?? {}) },
  };

  // Apply environment variable overrides
  if (process.env.AI_PROVIDER)
    merged.ai.type = process.env.AI_PROVIDER as AIProviderType;
  if (process.env.AI_API_KEY) merged.ai.apiKey = process.env.AI_API_KEY;
  if (process.env.AI_MODEL) merged.ai.model = process.env.AI_MODEL;
  if (process.env.AI_ENDPOINT) merged.ai.endpoint = process.env.AI_ENDPOINT;
  if (process.env.BASE_URL) merged.baseUrl = process.env.BASE_URL;
  if (process.env.APP_TYPE)
    merged.appType = process.env.APP_TYPE as FrameworkConfig["appType"];
  if (process.env.LOG_LEVEL)
    merged.logLevel = process.env.LOG_LEVEL as FrameworkConfig["logLevel"];

  const resolved = merged;

  return resolved;
}

/**
 * Validate configuration and return any errors.
 */
export function validateConfig(config: FrameworkConfig): string[] {
  const errors: string[] = [];

  if (!config.ai.type) errors.push("AI provider type is required");
  if (config.healing.enabled && config.healing.useAI && !config.ai.apiKey) {
    errors.push("AI API key is required when AI-assisted healing is enabled");
  }
  if (config.visual.enabled && config.visual.useAI && !config.ai.apiKey) {
    errors.push("AI API key is required when AI visual comparison is enabled");
  }

  return errors;
}

export { DEFAULT_CONFIG };
