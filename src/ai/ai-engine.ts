/**
 * AI Engine — orchestrates AI providers and prompt execution.
 * Central hub for all AI operations in the framework.
 */

import type {
  AIProvider,
  AIProviderConfig,
  AIProviderType,
  FrameworkConfig,
  TestGenerationRequest,
  GeneratedTest,
  TestRunSummary,
} from "../core/types";
import { Logger } from "../core/logger";
import { OpenAIProvider } from "./providers/openai-provider";
import { AzureOpenAIProvider } from "./providers/azure-provider";
import { GeminiProvider } from "./providers/gemini-provider";
import { ClaudeProvider } from "./providers/claude-provider";
import {
  SYSTEM_PROMPT_TEST_GENERATION,
  buildTestGenerationPrompt,
  SYSTEM_PROMPT_TEST_ENHANCEMENT,
  buildTestEnhancementPrompt,
} from "./prompts/test-generation";
import { SYSTEM_PROMPT_HEALING, buildHealingPrompt } from "./prompts/healing";
import {
  SYSTEM_PROMPT_ANALYSIS,
  buildAnalysisPrompt,
  SYSTEM_PROMPT_FAILURE_DIAGNOSIS,
  buildFailureDiagnosisPrompt,
} from "./prompts/analysis";

const log = new Logger("AIEngine");

export class AIEngine {
  private providers: Map<string, AIProvider> = new Map();
  private activeProvider: AIProvider | null = null;

  /**
   * Initialize with framework configuration.
   */
  async initialize(config: FrameworkConfig): Promise<void> {
    this.registerProvider(config.ai);
    log.info(`AI Engine initialized with provider: ${config.ai.type}`);
  }

  /**
   * Register an AI provider from config.
   */
  registerProvider(config: AIProviderConfig): AIProvider {
    const provider = this.createProvider(config);
    this.providers.set(config.type, provider);
    if (!this.activeProvider) this.activeProvider = provider;
    return provider;
  }

  /**
   * Register a custom AI provider.
   */
  registerCustomProvider(provider: AIProvider): void {
    this.providers.set(provider.name, provider);
    if (!this.activeProvider) this.activeProvider = provider;
  }

  /**
   * Switch active provider.
   */
  setActiveProvider(name: AIProviderType | string): void {
    const provider = this.providers.get(name);
    if (!provider) throw new Error(`Provider "${name}" not registered`);
    this.activeProvider = provider;
    log.info(`Active AI provider switched to: ${name}`);
  }

  private getProvider(): AIProvider {
    if (!this.activeProvider) throw new Error("No AI provider configured");
    return this.activeProvider;
  }

  private createProvider(config: AIProviderConfig): AIProvider {
    switch (config.type) {
      case "openai":
        return new OpenAIProvider(config);
      case "azure-openai":
        return new AzureOpenAIProvider(config);
      case "gemini":
        return new GeminiProvider(config);
      case "claude":
        return new ClaudeProvider(config);
      default:
        throw new Error(`Unknown AI provider type: ${config.type}`);
    }
  }

  // ─── Test Generation ─────────────────────────────────────────────

  async generateTest(request: TestGenerationRequest): Promise<GeneratedTest> {
    const provider = this.getProvider();
    log.info("Generating test", {
      description: request.description,
      appType: request.appType,
    });

    const userPrompt = buildTestGenerationPrompt(request);
    const response = await provider.chat([
      { role: "system", content: SYSTEM_PROMPT_TEST_GENERATION },
      { role: "user", content: userPrompt },
    ]);

    // Extract code from response (handle markdown fences)
    const code = this.extractCode(response.content);

    // Extract test steps from code
    const steps = this.extractSteps(code);

    return {
      code,
      description: request.description,
      steps,
      confidence: 0.85, // Base confidence, can be adjusted
    };
  }

  async enhanceTest(
    code: string,
    instructions: string,
  ): Promise<GeneratedTest> {
    const provider = this.getProvider();
    log.info("Enhancing test", { instructions });

    const userPrompt = buildTestEnhancementPrompt(code, instructions);
    const response = await provider.chat([
      { role: "system", content: SYSTEM_PROMPT_TEST_ENHANCEMENT },
      { role: "user", content: userPrompt },
    ]);

    const enhanced = this.extractCode(response.content);
    return {
      code: enhanced,
      description: instructions,
      steps: this.extractSteps(enhanced),
      confidence: 0.8,
    };
  }

  // ─── Self-Healing ────────────────────────────────────────────────

  async healSelector(params: {
    brokenSelector: string;
    elementInfo?: import("../core/types").ElementInfo;
    pageSnapshot: string;
    errorMessage: string;
  }): Promise<{ selector: string; confidence: number; reasoning: string }> {
    const provider = this.getProvider();
    log.info("AI healing selector", { brokenSelector: params.brokenSelector });

    const userPrompt = buildHealingPrompt(params);
    const response = await provider.chat([
      { role: "system", content: SYSTEM_PROMPT_HEALING },
      { role: "user", content: userPrompt },
    ]);

    const cleaned = response.content.replace(/```(?:json)?\n?/g, "").trim();
    return JSON.parse(cleaned);
  }

  // ─── Analysis ────────────────────────────────────────────────────

  async analyzeResults(summary: TestRunSummary): Promise<string> {
    const provider = this.getProvider();
    log.info("Analyzing test results");

    const userPrompt = buildAnalysisPrompt(summary);
    const response = await provider.chat([
      { role: "system", content: SYSTEM_PROMPT_ANALYSIS },
      { role: "user", content: userPrompt },
    ]);

    return response.content;
  }

  async diagnoseFailure(params: {
    testName: string;
    errorMessage: string;
    errorStack?: string;
    testCode?: string;
    pageSnapshot?: string;
  }): Promise<{
    rootCause: string;
    category: string;
    suggestedFix: string;
    confidence: number;
  }> {
    const provider = this.getProvider();
    log.info("Diagnosing failure", { testName: params.testName });

    const userPrompt = buildFailureDiagnosisPrompt(params);
    const response = await provider.chat([
      { role: "system", content: SYSTEM_PROMPT_FAILURE_DIAGNOSIS },
      { role: "user", content: userPrompt },
    ]);

    const cleaned = response.content.replace(/```(?:json)?\n?/g, "").trim();
    return JSON.parse(cleaned);
  }

  // ─── Utility ─────────────────────────────────────────────────────

  private extractCode(response: string): string {
    const fenceMatch = response.match(
      /```(?:typescript|ts|javascript|js)?\n([\s\S]*?)```/,
    );
    return fenceMatch ? fenceMatch[1].trim() : response.trim();
  }

  private extractSteps(code: string): string[] {
    const steps: string[] = [];
    const stepRegex = /test\.step\(['"](.*?)['"]/g;
    let match;
    while ((match = stepRegex.exec(code)) !== null) {
      steps.push(match[1]);
    }
    if (steps.length === 0) {
      // Fallback: extract from comments
      const commentRegex = /\/\/\s*(Step \d+:?\s*.*)/gi;
      while ((match = commentRegex.exec(code)) !== null) {
        steps.push(match[1]);
      }
    }
    return steps;
  }
}

export const aiEngine = new AIEngine();
