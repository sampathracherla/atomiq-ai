// Type stubs for optional peer dependencies

declare module "openai" {
  interface ChatCompletionMessage {
    role: string;
    content: string | null;
  }
  interface ChatCompletionChoice {
    message: ChatCompletionMessage;
    finish_reason: string | null;
  }
  interface CompletionUsage {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  }
  interface ChatCompletion {
    choices: ChatCompletionChoice[];
    model: string;
    usage?: CompletionUsage;
  }
  interface ChatCompletionCreateParams {
    model: string;
    messages: Array<{ role: string; content: string }>;
    temperature?: number;
    max_tokens?: number;
  }
  interface Chat {
    completions: {
      create(params: ChatCompletionCreateParams): Promise<ChatCompletion>;
    };
  }
  class OpenAI {
    chat: Chat;
    constructor(config: {
      apiKey?: string;
      baseURL?: string;
      defaultQuery?: Record<string, string>;
      defaultHeaders?: Record<string, string>;
    });
  }
  export default OpenAI;
}

declare module "@google/generative-ai" {
  interface GenerationConfig {
    temperature?: number;
    maxOutputTokens?: number;
  }
  interface Part {
    text: string;
  }
  interface Content {
    role: "user" | "model";
    parts: Part[];
  }
  interface Candidate {
    finishReason?: string;
  }
  interface GenerateContentResponse {
    text(): string;
    candidates?: Candidate[];
  }
  interface GenerateContentResult {
    response: GenerateContentResponse;
  }
  interface ChatSession {
    sendMessage(message: string): Promise<GenerateContentResult>;
  }
  interface GenerativeModel {
    startChat(params: { history?: Content[] }): ChatSession;
  }
  class GoogleGenerativeAI {
    constructor(apiKey: string);
    getGenerativeModel(params: {
      model: string;
      generationConfig?: GenerationConfig;
    }): GenerativeModel;
  }
  export { GoogleGenerativeAI };
}

declare module "@azure/openai" {
  // Stub — Azure OpenAI is accessed through the openai SDK in Azure mode
  export {};
}

declare module "@anthropic-ai/sdk" {
  interface TextBlock {
    type: "text";
    text: string;
  }
  interface ContentBlock {
    type: string;
  }
  interface Usage {
    input_tokens: number;
    output_tokens: number;
  }
  interface Message {
    content: (TextBlock | ContentBlock)[];
    model: string;
    stop_reason: string | null;
    usage: Usage;
  }
  interface MessageCreateParams {
    model: string;
    max_tokens: number;
    system?: string;
    messages: Array<{ role: "user" | "assistant"; content: string }>;
    temperature?: number;
  }
  interface Messages {
    create(params: MessageCreateParams): Promise<Message>;
  }
  class Anthropic {
    messages: Messages;
    constructor(config: { apiKey?: string; baseURL?: string });
  }
  export default Anthropic;
}
