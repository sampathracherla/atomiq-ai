/**
 * Anthropic Claude provider — Claude 4, Claude 3.5 Sonnet, Claude 3 Opus, etc.
 */

import { BaseAIProvider } from "./base-provider";
import type { AIMessage, AIResponse, AIProviderConfig } from "../../core/types";

export class ClaudeProvider extends BaseAIProvider {
  readonly name = "claude";

  async chat(
    messages: AIMessage[],
    options?: Partial<AIProviderConfig>,
  ): Promise<AIResponse> {
    const config = this.mergeConfig(options);

    try {
      const { default: Anthropic } = await import("@anthropic-ai/sdk");
      const client = new Anthropic({
        apiKey: config.apiKey,
        ...(config.endpoint ? { baseURL: config.endpoint } : {}),
      });

      // Extract system message (Claude handles it separately)
      const systemMsg =
        messages.find((m) => m.role === "system")?.content ?? undefined;
      const chatMessages = messages
        .filter((m) => m.role !== "system")
        .map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        }));

      const response = await client.messages.create({
        model: config.model ?? "claude-sonnet-4-20250514",
        max_tokens: config.maxTokens ?? 4096,
        ...(systemMsg ? { system: systemMsg } : {}),
        messages: chatMessages,
        temperature: config.temperature ?? 0.2,
      });

      const textBlock = response.content.find(
        (block: any) => block.type === "text",
      );
      const content = textBlock ? (textBlock as any).text : "";

      return {
        content,
        usage: response.usage
          ? {
              promptTokens: response.usage.input_tokens,
              completionTokens: response.usage.output_tokens,
              totalTokens:
                response.usage.input_tokens + response.usage.output_tokens,
            }
          : undefined,
        model: response.model,
        finishReason: response.stop_reason ?? undefined,
      };
    } catch (error: unknown) {
      this.log.error("Anthropic Claude API call failed", {
        error: (error as Error).message,
      });
      throw error;
    }
  }

  async isAvailable(): Promise<boolean> {
    try {
      await import("@anthropic-ai/sdk");
      return !!this.config.apiKey;
    } catch {
      return false;
    }
  }
}
