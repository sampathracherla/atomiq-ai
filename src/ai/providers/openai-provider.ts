/**
 * OpenAI provider — GPT-4o, GPT-4, GPT-3.5-turbo, etc.
 */

import { BaseAIProvider } from "./base-provider";
import type { AIMessage, AIResponse, AIProviderConfig } from "../../core/types";

export class OpenAIProvider extends BaseAIProvider {
  readonly name = "openai";

  async chat(
    messages: AIMessage[],
    options?: Partial<AIProviderConfig>,
  ): Promise<AIResponse> {
    const config = this.mergeConfig(options);

    try {
      const { default: OpenAI } = await import("openai");
      const client = new OpenAI({
        apiKey: config.apiKey,
        ...(config.endpoint ? { baseURL: config.endpoint } : {}),
      });

      const response = await client.chat.completions.create({
        model: config.model ?? "gpt-4o",
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
        temperature: config.temperature ?? 0.2,
        max_tokens: config.maxTokens ?? 4096,
      });

      const choice = response.choices[0];
      return {
        content: choice.message.content ?? "",
        usage: response.usage
          ? {
              promptTokens: response.usage.prompt_tokens,
              completionTokens: response.usage.completion_tokens,
              totalTokens: response.usage.total_tokens,
            }
          : undefined,
        model: response.model,
        finishReason: choice.finish_reason ?? undefined,
      };
    } catch (error: unknown) {
      this.log.error("OpenAI API call failed", {
        error: (error as Error).message,
      });
      throw error;
    }
  }

  async isAvailable(): Promise<boolean> {
    try {
      await import("openai");
      return !!this.config.apiKey;
    } catch {
      return false;
    }
  }
}
