/**
 * API adapter — handles REST/GraphQL API testing.
 */

import type { APIRequestContext } from "@playwright/test";
import type { AppType, AdapterContext, ElementInfo } from "../core/types";
import { Logger } from "../core/logger";

export class APIAdapter {
  readonly appType: AppType = "api";
  private apiContext!: APIRequestContext;
  private baseUrl: string = "";
  private defaultHeaders: Record<string, string> = {};
  private log = new Logger("Adapter:API");

  async initialize(context: AdapterContext): Promise<void> {
    if (!context.apiContext) throw new Error("API adapter requires apiContext");
    this.apiContext = context.apiContext;
    this.baseUrl = context.config.api?.baseUrl ?? context.config.baseUrl;
    this.defaultHeaders = context.config.api?.defaultHeaders ?? {};

    if (context.config.api?.authToken) {
      this.defaultHeaders["Authorization"] =
        `Bearer ${context.config.api.authToken}`;
    }
  }

  async get<T = unknown>(
    path: string,
    options?: RequestOptions,
  ): Promise<APIResponse<T>> {
    return this.request<T>("GET", path, options);
  }

  async post<T = unknown>(
    path: string,
    body?: unknown,
    options?: RequestOptions,
  ): Promise<APIResponse<T>> {
    return this.request<T>("POST", path, { ...options, body });
  }

  async put<T = unknown>(
    path: string,
    body?: unknown,
    options?: RequestOptions,
  ): Promise<APIResponse<T>> {
    return this.request<T>("PUT", path, { ...options, body });
  }

  async patch<T = unknown>(
    path: string,
    body?: unknown,
    options?: RequestOptions,
  ): Promise<APIResponse<T>> {
    return this.request<T>("PATCH", path, { ...options, body });
  }

  async delete<T = unknown>(
    path: string,
    options?: RequestOptions,
  ): Promise<APIResponse<T>> {
    return this.request<T>("DELETE", path, options);
  }

  private async request<T>(
    method: string,
    path: string,
    options?: RequestOptions,
  ): Promise<APIResponse<T>> {
    const url = path.startsWith("http") ? path : `${this.baseUrl}${path}`;
    const headers = { ...this.defaultHeaders, ...options?.headers };

    this.log.debug(`${method} ${url}`, { headers: Object.keys(headers) });

    const startTime = Date.now();
    const response = await this.apiContext.fetch(url, {
      method,
      headers,
      data: options?.body,
      params: options?.params,
      timeout: options?.timeout ?? 30_000,
    });
    const duration = Date.now() - startTime;

    let data: T | undefined;
    const contentType = response.headers()["content-type"] ?? "";
    if (contentType.includes("application/json")) {
      data = (await response.json()) as T;
    }

    const result: APIResponse<T> = {
      status: response.status(),
      statusText: response.statusText(),
      headers: response.headers(),
      data,
      duration,
      ok: response.ok(),
    };

    this.log.info(`${method} ${path} → ${result.status} (${duration}ms)`);
    return result;
  }

  // Not applicable for API testing but required by interface concept
  async discoverElements(): Promise<ElementInfo[]> {
    return [];
  }
  async takeScreenshot(): Promise<Buffer> {
    return Buffer.alloc(0);
  }
}

export interface RequestOptions {
  headers?: Record<string, string>;
  body?: unknown;
  params?: Record<string, string | number>;
  timeout?: number;
}

export interface APIResponse<T = unknown> {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  data?: T;
  duration: number;
  ok: boolean;
}
