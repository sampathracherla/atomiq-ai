/**
 * Atomiq AI Fixtures — extends Playwright test with AI-powered capabilities.
 *
 * Usage:
 *   import { test, expect } from 'atomiq-ai';
 *
 *   test('my test', async ({ page, ai, web, api, visual, dataGen }) => {
 *     // All enterprise features available as fixtures
 *   });
 */

import { test as base, expect } from "@playwright/test";
import type { Page, BrowserContext, APIRequestContext } from "@playwright/test";
import type {
  FrameworkConfig,
  TestGenerationRequest,
  GeneratedTest,
  VisualComparisonResult,
  VisualTestOptions,
  DataGenerationRequest,
  GeneratedData,
} from "../core/types";
import { loadConfig } from "../core/config";
import { Logger } from "../core/logger";
import { AIEngine } from "../ai/ai-engine";
import { WebAdapter } from "../adapters/web-adapter";
import { APIAdapter } from "../adapters/api-adapter";
import type { APIResponse, RequestOptions } from "../adapters/api-adapter";
import { SAPAdapter } from "../adapters/sap-adapter";
import { MobileAdapter } from "../adapters/mobile-adapter";
import { LocatorHealer } from "../healing/locator-healer";
import { ScreenshotManager } from "../visual/screenshot-manager";
import { AIVisualComparator } from "../visual/ai-comparator";
import { DataGenerator } from "../data/data-generator";
import { ReportGenerator } from "../reporting/report-generator";
import { AIAnalyzer } from "../reporting/ai-analyzer";

const log = new Logger("Fixtures");

// ─── Fixture Type Definitions ────────────────────────────────────────

export interface AIFixture {
  /** Generate a test from natural language description */
  generateTest(request: TestGenerationRequest): Promise<GeneratedTest>;
  /** Enhance existing test code */
  enhanceTest(code: string, instructions: string): Promise<GeneratedTest>;
  /** Diagnose a test failure */
  diagnoseFailure(
    testName: string,
    error: string,
    stack?: string,
  ): Promise<{ rootCause: string; category: string; suggestedFix: string }>;
  /** Raw AI engine access */
  engine: AIEngine;
}

export interface WebFixture extends WebAdapter {}
export interface APIFixture extends APIAdapter {}
export interface SAPFixture extends SAPAdapter {}
export interface MobileFixture extends MobileAdapter {}

export interface HealingFixture {
  /** Manually trigger healing for a selector */
  heal(selector: string): Promise<string>;
  /** Get healing statistics */
  stats(): { totalEntries: number; totalHealings: number };
}

export interface VisualFixture {
  /** Compare current page against baseline */
  compare(
    name: string,
    options?: VisualTestOptions,
  ): Promise<VisualComparisonResult>;
  /** Update baseline */
  updateBaseline(name: string): Promise<void>;
  /** List all baselines */
  listBaselines(): string[];
}

export interface DataGenFixture {
  /** Generate test data */
  generate(request: DataGenerationRequest): Promise<GeneratedData>;
  /** Quick data generators */
  randomEmail(): string;
  randomName(): string;
  randomPhone(): string;
  randomUUID(): string;
  randomCompany(): string;
}

// ─── Extended Test Type ──────────────────────────────────────────────

type EnterpriseFixtures = {
  config: FrameworkConfig;
  ai: AIFixture;
  web: WebFixture;
  apiClient: APIFixture;
  sap: SAPFixture;
  mobile: MobileFixture;
  healing: HealingFixture;
  visual: VisualFixture;
  dataGen: DataGenFixture;
};

// ─── Fixture Implementation ─────────────────────────────────────────

export const test = base.extend<EnterpriseFixtures>({
  // Configuration
  config: async ({}, use) => {
    const config = loadConfig();
    await use(config);
  },

  // AI Engine
  ai: async ({ config }, use) => {
    const engine = new AIEngine();
    await engine.initialize(config);

    const fixture: AIFixture = {
      engine,
      generateTest: (req) => engine.generateTest(req),
      enhanceTest: (code, instructions) =>
        engine.enhanceTest(code, instructions),
      diagnoseFailure: async (testName, error, stack) => {
        const result = await engine.diagnoseFailure({
          testName,
          errorMessage: error,
          errorStack: stack,
        });
        return {
          rootCause: result.rootCause,
          category: result.category,
          suggestedFix: result.suggestedFix,
        };
      },
    };

    await use(fixture);
  },

  // Web Adapter
  web: async ({ page, config }, use) => {
    const adapter = new WebAdapter();
    await adapter.initialize({ page, config });
    await use(adapter as WebFixture);
  },

  // API Adapter
  apiClient: async ({ request, config }, use) => {
    const adapter = new APIAdapter();
    await adapter.initialize({ apiContext: request, config });
    await use(adapter as APIFixture);
  },

  // SAP Adapter
  sap: async ({ page, config }, use) => {
    const adapter = new SAPAdapter();
    await adapter.initialize({ page, config });
    await use(adapter as SAPFixture);
  },

  // Mobile Adapter
  mobile: async ({ page, config }, use) => {
    const adapter = new MobileAdapter();
    await adapter.initialize({ page, config });
    await use(adapter as MobileFixture);
  },

  // Self-Healing
  healing: async ({ page, config }, use) => {
    const healer = new LocatorHealer(config);

    const fixture: HealingFixture = {
      heal: async (selector) => {
        const result = await healer.heal(selector, page);
        return result.success ? result.healedSelector : selector;
      },
      stats: () => {
        const cache = healer.getCache();
        const s = cache.getStats();
        return { totalEntries: s.totalEntries, totalHealings: s.totalHealings };
      },
    };

    await use(fixture);
  },

  // Visual Testing
  visual: async ({ page, config }, use) => {
    const manager = new ScreenshotManager(config);

    const fixture: VisualFixture = {
      compare: (name, options) => manager.compare(page, name, options),
      updateBaseline: (name) => manager.updateBaseline(page, name),
      listBaselines: () => manager.listBaselines(),
    };

    await use(fixture);
  },

  // Data Generation
  dataGen: async ({}, use) => {
    const generator = new DataGenerator();

    const fixture: DataGenFixture = {
      generate: (req) => generator.generate(req),
      randomEmail: () => `test_${Date.now()}@example.com`,
      randomName: () =>
        ["Alice", "Bob", "Charlie", "Diana", "Eve"][
          Math.floor(Math.random() * 5)
        ],
      randomPhone: () =>
        `+1${Array.from({ length: 10 }, () => Math.floor(Math.random() * 10)).join("")}`,
      randomUUID: () =>
        "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
          const r = (Math.random() * 16) | 0;
          return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
        }),
      randomCompany: () =>
        `${["Acme", "Global", "Tech", "Alpha"][Math.floor(Math.random() * 4)]} Corp`,
    };

    await use(fixture);
  },
});

export { expect };
