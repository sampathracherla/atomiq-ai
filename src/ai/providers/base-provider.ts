/**
 * Base AI provider — abstract class all providers extend.
 */

import type {
  AIProvider,
  AIMessage,
  AIResponse,
  AIProviderConfig,
} from "../../core/types";
import { Logger } from "../../core/logger";

export abstract class BaseAIProvider implements AIProvider {
  abstract readonly name: string;
  protected config: AIProviderConfig;
  protected log: Logger;

  constructor(config: AIProviderConfig) {
    this.config = config;
    this.log = new Logger(`AI:${this.constructor.name}`);
  }

  abstract chat(
    messages: AIMessage[],
    options?: Partial<AIProviderConfig>,
  ): Promise<AIResponse>;
  abstract isAvailable(): Promise<boolean>;

  /**
   * Convenience: single prompt → response string.
   */
  async prompt(userMessage: string, systemMessage?: string): Promise<string> {
    const messages: AIMessage[] = [];
    if (systemMessage)
      messages.push({ role: "system", content: systemMessage });
    messages.push({ role: "user", content: userMessage });
    const response = await this.chat(messages);
    return response.content;
  }

  /**
   * Structured JSON response from AI.
   */
  async promptJSON<T = Record<string, unknown>>(
    userMessage: string,
    systemMessage?: string,
  ): Promise<T> {
    const jsonSystem =
      (systemMessage ?? "") +
      "\n\nRespond with valid JSON only. No markdown, no explanation.";
    const response = await this.prompt(userMessage, jsonSystem);
    // Strip markdown code fences if present
    const cleaned = response.replace(/```(?:json)?\n?/g, "").trim();
    return JSON.parse(cleaned) as T;
  }

  protected mergeConfig(options?: Partial<AIProviderConfig>): AIProviderConfig {
    return { ...this.config, ...options };
  }
}
