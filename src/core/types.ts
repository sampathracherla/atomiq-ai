/**
 * Atomiq AI Framework — Core Type Definitions
 *
 * All shared types, interfaces, and enums used across the framework.
 */

import type { Page, BrowserContext, APIRequestContext } from "@playwright/test";

// ─── AI Provider Types ───────────────────────────────────────────────

export type AIProviderType =
  | "openai"
  | "azure-openai"
  | "gemini"
  | "claude"
  | "custom";

export interface AIProviderConfig {
  type: AIProviderType;
  apiKey?: string;
  endpoint?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  /** Custom headers for API calls */
  headers?: Record<string, string>;
}

export interface AIMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface AIResponse {
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  model?: string;
  finishReason?: string;
}

export interface AIProvider {
  readonly name: string;
  chat(
    messages: AIMessage[],
    options?: Partial<AIProviderConfig>,
  ): Promise<AIResponse>;
  isAvailable(): Promise<boolean>;
}

// ─── Test Generation Types ───────────────────────────────────────────

export interface TestGenerationRequest {
  /** Natural language description of what to test */
  description: string;
  /** Application type for adapter selection */
  appType: AppType;
  /** URL or endpoint of the application */
  targetUrl?: string;
  /** Page snapshot / DOM for context */
  pageContext?: string;
  /** Existing test code to enhance */
  existingCode?: string;
  /** Additional context (API specs, requirements, etc.) */
  additionalContext?: string;
}

export interface GeneratedTest {
  code: string;
  description: string;
  steps: string[];
  confidence: number;
  warnings?: string[];
}

// ─── Adapter Types ───────────────────────────────────────────────────

export type AppType = "web" | "api" | "sap" | "mobile";

export interface AdapterContext {
  page?: Page;
  context?: BrowserContext;
  apiContext?: APIRequestContext;
  config: FrameworkConfig;
}

export interface ElementInfo {
  selector: string;
  alternativeSelectors: string[];
  tagName: string;
  text?: string;
  attributes: Record<string, string>;
  boundingBox?: { x: number; y: number; width: number; height: number };
  visible: boolean;
  /** Unique fingerprint for self-healing */
  fingerprint: string;
}

export interface BaseAdapter {
  readonly appType: AppType;
  initialize(context: AdapterContext): Promise<void>;
  click(selector: string, options?: ActionOptions): Promise<void>;
  fill(selector: string, value: string, options?: ActionOptions): Promise<void>;
  getText(selector: string, options?: ActionOptions): Promise<string>;
  waitForElement(selector: string, options?: WaitOptions): Promise<void>;
  getElementInfo(selector: string): Promise<ElementInfo>;
  takeScreenshot(name?: string): Promise<Buffer>;
  /** Discover all interactable elements on current view */
  discoverElements(): Promise<ElementInfo[]>;
}

export interface ActionOptions {
  timeout?: number;
  force?: boolean;
  /** Enable self-healing for this action */
  selfHeal?: boolean;
}

export interface WaitOptions {
  timeout?: number;
  state?: "visible" | "hidden" | "attached" | "detached";
}

// ─── Self-Healing Types ──────────────────────────────────────────────

export interface HealingResult {
  originalSelector: string;
  healedSelector: string;
  strategy: HealingStrategy;
  confidence: number;
  /** Whether the healing was successful */
  success: boolean;
}

export type HealingStrategy =
  | "attribute-fallback"
  | "text-content"
  | "structural-similarity"
  | "ai-assisted"
  | "visual-anchor";

export interface LocatorEntry {
  selector: string;
  alternatives: string[];
  fingerprint: string;
  lastUsed: string;
  healCount: number;
  lastHealedFrom?: string;
}

// ─── Visual Testing Types ────────────────────────────────────────────

export interface VisualComparisonResult {
  match: boolean;
  diffPercentage: number;
  diffImagePath?: string;
  baselinePath: string;
  actualPath: string;
  aiAnalysis?: string;
}

export interface VisualTestOptions {
  threshold?: number;
  /** Regions to ignore during comparison */
  ignoreRegions?: Array<{
    x: number;
    y: number;
    width: number;
    height: number;
  }>;
  /** Use AI to analyze visual differences */
  useAI?: boolean;
  /** Update baseline if not found */
  autoBaseline?: boolean;
}

// ─── Test Data Types ─────────────────────────────────────────────────

export interface DataGenerationRequest {
  /** Schema or description of data needed */
  schema: string | Record<string, unknown>;
  /** Number of records */
  count?: number;
  /** Locale for realistic data */
  locale?: string;
  /** Constraints (e.g., "age > 18", "email must be corporate") */
  constraints?: string[];
  /** Use AI for complex data generation */
  useAI?: boolean;
}

export interface GeneratedData {
  data: Record<string, unknown>[];
  schema: Record<string, unknown>;
}

// ─── Reporting Types ─────────────────────────────────────────────────

export interface TestResult {
  name: string;
  suite: string;
  status: "passed" | "failed" | "skipped" | "flaky";
  duration: number;
  error?: { message: string; stack?: string };
  steps: TestStepResult[];
  screenshots?: string[];
  healingEvents?: HealingResult[];
  visualResults?: VisualComparisonResult[];
}

export interface TestStepResult {
  name: string;
  status: "passed" | "failed";
  duration: number;
  error?: string;
}

export interface TestRunSummary {
  totalTests: number;
  passed: number;
  failed: number;
  skipped: number;
  flaky: number;
  duration: number;
  results: TestResult[];
  aiAnalysis?: string;
  healingSummary?: {
    totalHealed: number;
    strategies: Record<HealingStrategy, number>;
  };
}

export interface ReportOptions {
  format: "html" | "json" | "markdown";
  outputDir: string;
  includeAIAnalysis?: boolean;
  includeScreenshots?: boolean;
  includeHealingLog?: boolean;
}

// ─── Framework Configuration ─────────────────────────────────────────

export interface FrameworkConfig {
  /** AI provider configuration */
  ai: AIProviderConfig;
  /** Default application type */
  appType: AppType;
  /** Base URL of the application under test */
  baseUrl: string;
  /** Self-healing configuration */
  healing: {
    enabled: boolean;
    /** Max attempts before failing */
    maxAttempts: number;
    /** Use AI for healing when other strategies fail */
    useAI: boolean;
    /** Path to locator cache */
    cachePath: string;
  };
  /** Visual testing configuration */
  visual: {
    enabled: boolean;
    baselineDir: string;
    diffDir: string;
    threshold: number;
    useAI: boolean;
  };
  /** Reporting configuration */
  reporting: ReportOptions;
  /** SAP-specific configuration */
  sap?: {
    baseUrl: string;
    client: string;
    language: string;
    username?: string;
    password?: string;
    useDhikraft?: boolean;
  };
  /** API testing configuration */
  api?: {
    baseUrl: string;
    defaultHeaders?: Record<string, string>;
    authToken?: string;
  };
  /** Timeouts */
  timeouts: {
    action: number;
    navigation: number;
    assertion: number;
  };
  /** Logging level */
  logLevel: "debug" | "info" | "warn" | "error";
}

// ─── Plugin Types ────────────────────────────────────────────────────

export interface Plugin {
  name: string;
  version: string;
  /** Called when framework initializes */
  onInit?(config: FrameworkConfig): Promise<void>;
  /** Called before each test */
  onBeforeTest?(testName: string): Promise<void>;
  /** Called after each test */
  onAfterTest?(result: TestResult): Promise<void>;
  /** Called before an action (click, fill, etc.) */
  onBeforeAction?(action: string, selector: string): Promise<void>;
  /** Called after an action */
  onAfterAction?(
    action: string,
    selector: string,
    success: boolean,
  ): Promise<void>;
  /** Called when healing occurs */
  onHealing?(result: HealingResult): Promise<void>;
}
