/**
 * Google Gemini provider — Gemini Pro, Gemini Ultra, etc.
 */

import { BaseAIProvider } from "./base-provider";
import type { AIMessage, AIResponse, AIProviderConfig } from "../../core/types";

export class GeminiProvider extends BaseAIProvider {
  readonly name = "gemini";

  async chat(
    messages: AIMessage[],
    options?: Partial<AIProviderConfig>,
  ): Promise<AIResponse> {
    const config = this.mergeConfig(options);

    try {
      const { GoogleGenerativeAI } = await import("@google/generative-ai");
      const genAI = new GoogleGenerativeAI(config.apiKey ?? "");
      const model = genAI.getGenerativeModel({
        model: config.model ?? "gemini-pro",
        generationConfig: {
          temperature: config.temperature ?? 0.2,
          maxOutputTokens: config.maxTokens ?? 4096,
        },
      });

      // Convert messages to Gemini format
      const systemMsg =
        messages.find((m) => m.role === "system")?.content ?? "";
      const chatMessages = messages
        .filter((m) => m.role !== "system")
        .map((m) => ({
          role: m.role === "user" ? ("user" as const) : ("model" as const),
          parts: [{ text: m.content }],
        }));

      // Prepend system message to first user message
      if (
        systemMsg &&
        chatMessages.length > 0 &&
        chatMessages[0].role === "user"
      ) {
        chatMessages[0].parts[0].text = `${systemMsg}\n\n${chatMessages[0].parts[0].text}`;
      }

      const chat = model.startChat({ history: chatMessages.slice(0, -1) });
      const lastMessage = chatMessages[chatMessages.length - 1];
      const result = await chat.sendMessage(lastMessage.parts[0].text);
      const response = result.response;

      return {
        content: response.text(),
        model: config.model ?? "gemini-pro",
        finishReason: response.candidates?.[0]?.finishReason ?? undefined,
      };
    } catch (error: unknown) {
      this.log.error("Gemini API call failed", {
        error: (error as Error).message,
      });
      throw error;
    }
  }

  async isAvailable(): Promise<boolean> {
    try {
      await import("@google/generative-ai");
      return !!this.config.apiKey;
    } catch {
      return false;
    }
  }
}
