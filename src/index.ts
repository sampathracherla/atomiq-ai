/**
 * Atomiq AI — Enterprise Test Automation Framework
 *
 * AI-powered test automation for Web, API, SAP, and Mobile applications.
 *
 * @example
 * ```typescript
 * import { test, expect } from 'atomiq-ai';
 *
 * test('my enterprise test', async ({ page, ai, web, visual, dataGen }) => {
 *   await web.navigate('https://my-app.com');
 *   await web.click('[data-testid="login"]', { selfHeal: true });
 *   const screenshot = await visual.compare('login-page');
 *   expect(screenshot.match).toBe(true);
 * });
 * ```
 */

// Core
export { loadConfig, validateConfig } from "./core/config";
export { Logger } from "./core/logger";
export { PluginManager, pluginManager } from "./core/plugin-manager";

// Types
export type {
  AIProvider,
  AIProviderConfig,
  AIProviderType,
  AIMessage,
  AIResponse,
  AppType,
  FrameworkConfig,
  TestGenerationRequest,
  GeneratedTest,
  BaseAdapter,
  AdapterContext,
  ElementInfo,
  ActionOptions,
  WaitOptions,
  HealingResult,
  HealingStrategy,
  LocatorEntry,
  VisualComparisonResult,
  VisualTestOptions,
  DataGenerationRequest,
  GeneratedData,
  TestResult,
  TestStepResult,
  TestRunSummary,
  ReportOptions,
  Plugin,
} from "./core/types";

// AI
export { AIEngine, aiEngine } from "./ai/ai-engine";
export { BaseAIProvider } from "./ai/providers/base-provider";
export { OpenAIProvider } from "./ai/providers/openai-provider";
export { AzureOpenAIProvider } from "./ai/providers/azure-provider";
export { GeminiProvider } from "./ai/providers/gemini-provider";
export { ClaudeProvider } from "./ai/providers/claude-provider";

// Adapters
export { WebAdapter } from "./adapters/web-adapter";
export { APIAdapter } from "./adapters/api-adapter";
export type { APIResponse, RequestOptions } from "./adapters/api-adapter";
export { SAPAdapter } from "./adapters/sap-adapter";
export { MobileAdapter } from "./adapters/mobile-adapter";
export type { DeviceProfile } from "./adapters/mobile-adapter";

// Self-Healing
export { LocatorHealer } from "./healing/locator-healer";
export { LocatorCache } from "./healing/locator-cache";

// Visual Testing
export { ScreenshotManager } from "./visual/screenshot-manager";
export { AIVisualComparator } from "./visual/ai-comparator";

// Data Generation
export { DataGenerator } from "./data/data-generator";

// Page Object Model
export { BasePage } from "./pages/base-page";

// Reporting
export { ReportGenerator } from "./reporting/report-generator";
export { AIAnalyzer } from "./reporting/ai-analyzer";
export type { PatternReport } from "./reporting/ai-analyzer";

// Fixtures (primary user-facing API)
export { test, expect } from "./fixtures/enterprise-fixtures";
export type {
  AIFixture,
  WebFixture,
  APIFixture,
  SAPFixture,
  MobileFixture,
  HealingFixture,
  VisualFixture,
  DataGenFixture,
} from "./fixtures/enterprise-fixtures";
