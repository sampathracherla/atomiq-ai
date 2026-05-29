/**
 * Base adapter — shared logic for all application adapters.
 */

import type { Page } from "@playwright/test";
import type {
  BaseAdapter,
  AdapterContext,
  AppType,
  ElementInfo,
  ActionOptions,
  WaitOptions,
} from "../core/types";
import { Logger } from "../core/logger";
import { LocatorHealer } from "../healing/locator-healer";
import * as crypto from "crypto";

export abstract class AbstractAdapter implements BaseAdapter {
  abstract readonly appType: AppType;
  protected page!: Page;
  protected ctx!: AdapterContext;
  protected log: Logger;
  protected healer?: LocatorHealer;

  constructor() {
    this.log = new Logger(`Adapter:${this.constructor.name}`);
  }

  async initialize(context: AdapterContext): Promise<void> {
    this.ctx = context;
    if (context.page) this.page = context.page;
    if (context.config.healing.enabled) {
      this.healer = new LocatorHealer(context.config);
    }
  }

  async click(selector: string, options?: ActionOptions): Promise<void> {
    const resolvedSelector = await this.resolveSelector(selector, options);
    await this.page.click(resolvedSelector, {
      timeout: options?.timeout ?? this.ctx.config.timeouts.action,
    });
  }

  async fill(
    selector: string,
    value: string,
    options?: ActionOptions,
  ): Promise<void> {
    const resolvedSelector = await this.resolveSelector(selector, options);
    await this.page.fill(resolvedSelector, value, {
      timeout: options?.timeout ?? this.ctx.config.timeouts.action,
    });
  }

  async getText(selector: string, options?: ActionOptions): Promise<string> {
    const resolvedSelector = await this.resolveSelector(selector, options);
    return (
      (await this.page.textContent(resolvedSelector, {
        timeout: options?.timeout ?? this.ctx.config.timeouts.action,
      })) ?? ""
    );
  }

  async waitForElement(selector: string, options?: WaitOptions): Promise<void> {
    await this.page.waitForSelector(selector, {
      timeout: options?.timeout ?? this.ctx.config.timeouts.action,
      state: options?.state ?? "visible",
    });
  }

  async getElementInfo(selector: string): Promise<ElementInfo> {
    const element = this.page.locator(selector).first();
    const tagName = await element.evaluate((el) => el.tagName.toLowerCase());
    const text = (await element.textContent()) ?? undefined;
    const boundingBox = (await element.boundingBox()) ?? undefined;
    const visible = await element.isVisible();

    const attributes: Record<string, string> = await element.evaluate((el) => {
      const attrs: Record<string, string> = {};
      for (let i = 0; i < el.attributes.length; i++) {
        const attr = el.attributes[i];
        attrs[attr.name] = attr.value;
      }
      return attrs;
    });

    // Generate fingerprint from stable attributes
    const fingerprintData = `${tagName}|${text ?? ""}|${attributes["data-testid"] ?? ""}|${attributes["role"] ?? ""}|${attributes["aria-label"] ?? ""}`;
    const fingerprint = crypto
      .createHash("md5")
      .update(fingerprintData)
      .digest("hex");

    // Generate alternative selectors
    const alternativeSelectors = this.generateAlternativeSelectors(
      tagName,
      text,
      attributes,
    );

    return {
      selector,
      alternativeSelectors,
      tagName,
      text: text ?? undefined,
      attributes,
      boundingBox: boundingBox ?? undefined,
      visible,
      fingerprint,
    };
  }

  async takeScreenshot(name?: string): Promise<Buffer> {
    return await this.page.screenshot({
      fullPage: true,
      path: name ? `.ai-test/screenshots/${name}.png` : undefined,
    });
  }

  async discoverElements(): Promise<ElementInfo[]> {
    const interactiveSelectors =
      'button, a, input, select, textarea, [role="button"], [role="link"], [role="textbox"], [role="combobox"], [role="checkbox"], [role="radio"], [onclick], [tabindex]';

    const count = await this.page.locator(interactiveSelectors).count();
    const elements: ElementInfo[] = [];

    for (let i = 0; i < Math.min(count, 100); i++) {
      try {
        const el = this.page.locator(interactiveSelectors).nth(i);
        const visible = await el.isVisible();
        if (!visible) continue;

        const tagName = await el.evaluate((e) => e.tagName.toLowerCase());
        const text = (await el.textContent()) ?? undefined;
        const attributes: Record<string, string> = await el.evaluate((e) => {
          const attrs: Record<string, string> = {};
          for (let i = 0; i < e.attributes.length; i++) {
            const attr = e.attributes[i];
            attrs[attr.name] = attr.value;
          }
          return attrs;
        });

        const selector = this.buildBestSelector(tagName, text, attributes);
        const alternativeSelectors = this.generateAlternativeSelectors(
          tagName,
          text,
          attributes,
        );
        const fingerprintData = `${tagName}|${text ?? ""}|${attributes["data-testid"] ?? ""}`;
        const fingerprint = crypto
          .createHash("md5")
          .update(fingerprintData)
          .digest("hex");

        elements.push({
          selector,
          alternativeSelectors,
          tagName,
          text: text?.trim() ?? undefined,
          attributes,
          visible: true,
          fingerprint,
        });
      } catch {
        // Element may have been detached
      }
    }

    return elements;
  }

  /**
   * Resolve selector with self-healing fallback.
   */
  protected async resolveSelector(
    selector: string,
    options?: ActionOptions,
  ): Promise<string> {
    if (!options?.selfHeal && !this.ctx.config.healing.enabled) return selector;

    try {
      // Try original selector
      await this.page.waitForSelector(selector, {
        timeout: 5000,
        state: "attached",
      });
      return selector;
    } catch {
      if (!this.healer) throw new Error(`Selector not found: ${selector}`);
      this.log.warn(`Selector broken, attempting self-heal: ${selector}`);
      const result = await this.healer.heal(selector, this.page);
      if (result.success) {
        this.log.info(
          `Healed selector: ${selector} → ${result.healedSelector} (${result.strategy})`,
        );
        return result.healedSelector;
      }
      throw new Error(`Self-healing failed for selector: ${selector}`);
    }
  }

  private generateAlternativeSelectors(
    tagName: string,
    text: string | undefined,
    attributes: Record<string, string>,
  ): string[] {
    const alts: string[] = [];
    if (attributes["data-testid"])
      alts.push(`[data-testid="${attributes["data-testid"]}"]`);
    if (attributes["id"]) alts.push(`#${attributes["id"]}`);
    if (attributes["role"]) alts.push(`[role="${attributes["role"]}"]`);
    if (attributes["aria-label"])
      alts.push(`[aria-label="${attributes["aria-label"]}"]`);
    if (text?.trim())
      alts.push(`${tagName}:has-text("${text.trim().slice(0, 50)}")`);
    if (attributes["name"])
      alts.push(`${tagName}[name="${attributes["name"]}"]`);
    return alts;
  }

  private buildBestSelector(
    tagName: string,
    text: string | undefined,
    attributes: Record<string, string>,
  ): string {
    if (attributes["data-testid"])
      return `[data-testid="${attributes["data-testid"]}"]`;
    if (attributes["role"] && attributes["aria-label"])
      return `[role="${attributes["role"]}"][aria-label="${attributes["aria-label"]}"]`;
    if (attributes["id"] && !attributes["id"].match(/^[\d_]/))
      return `#${attributes["id"]}`;
    if (text?.trim())
      return `${tagName}:has-text("${text.trim().slice(0, 50)}")`;
    if (attributes["name"]) return `${tagName}[name="${attributes["name"]}"]`;
    return `${tagName}`;
  }
}
