/**
 * Web adapter — handles standard web applications.
 */

import type { AppType, ActionOptions } from "../core/types";
import { AbstractAdapter } from "./base-adapter";

export class WebAdapter extends AbstractAdapter {
  readonly appType: AppType = "web";

  async navigate(url: string): Promise<void> {
    await this.page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: this.ctx.config.timeouts.navigation,
    });
  }

  async selectOption(
    selector: string,
    value: string,
    options?: ActionOptions,
  ): Promise<void> {
    const resolved = await this.resolveSelector(selector, options);
    await this.page.selectOption(resolved, value, {
      timeout: options?.timeout ?? this.ctx.config.timeouts.action,
    });
  }

  async check(selector: string, options?: ActionOptions): Promise<void> {
    const resolved = await this.resolveSelector(selector, options);
    await this.page.check(resolved, {
      timeout: options?.timeout ?? this.ctx.config.timeouts.action,
    });
  }

  async uncheck(selector: string, options?: ActionOptions): Promise<void> {
    const resolved = await this.resolveSelector(selector, options);
    await this.page.uncheck(resolved, {
      timeout: options?.timeout ?? this.ctx.config.timeouts.action,
    });
  }

  async hover(selector: string, options?: ActionOptions): Promise<void> {
    const resolved = await this.resolveSelector(selector, options);
    await this.page.hover(resolved, {
      timeout: options?.timeout ?? this.ctx.config.timeouts.action,
    });
  }

  async upload(
    selector: string,
    filePath: string,
    options?: ActionOptions,
  ): Promise<void> {
    const resolved = await this.resolveSelector(selector, options);
    await this.page.setInputFiles(resolved, filePath, {
      timeout: options?.timeout ?? this.ctx.config.timeouts.action,
    });
  }

  async getPageTitle(): Promise<string> {
    return await this.page.title();
  }

  async getCurrentUrl(): Promise<string> {
    return this.page.url();
  }

  async waitForNavigation(options?: { timeout?: number }): Promise<void> {
    await this.page.waitForLoadState("domcontentloaded", {
      timeout: options?.timeout ?? this.ctx.config.timeouts.navigation,
    });
  }

  /**
   * Execute JavaScript in the page context.
   */
  async evaluate<T>(fn: string | (() => T)): Promise<T> {
    return await this.page.evaluate(fn);
  }
}
