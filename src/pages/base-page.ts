/**
 * BasePage — Framework-level Page Object Model base class.
 *
 * Provides self-healing selectors, visual regression, element discovery,
 * and data generation out of the box for all page objects.
 *
 * @example
 * ```typescript
 * import { BasePage } from 'atomiq-ai';
 *
 * export class LoginPage extends BasePage {
 *   readonly usernameInput = this.locator('#username');
 *   readonly passwordInput = this.locator('#password');
 *   readonly submitButton = this.locator('button[type="submit"]');
 *
 *   async login(username: string, password: string) {
 *     await this.usernameInput.fill(username);
 *     await this.passwordInput.fill(password);
 *     await this.submitButton.click();
 *   }
 * }
 * ```
 */

import type { Page, Locator } from "@playwright/test";
import type {
  FrameworkConfig,
  ElementInfo,
  ActionOptions,
  WaitOptions,
  VisualTestOptions,
  VisualComparisonResult,
} from "../core/types";
import { LocatorHealer } from "../healing/locator-healer";
import { ScreenshotManager } from "../visual/screenshot-manager";
import { Logger } from "../core/logger";

export abstract class BasePage {
  protected readonly log: Logger;
  private healer?: LocatorHealer;
  private screenshotManager?: ScreenshotManager;

  constructor(
    readonly page: Page,
    protected readonly config?: FrameworkConfig,
  ) {
    this.log = new Logger(`Page:${this.constructor.name}`);
    if (config?.healing?.enabled) {
      this.healer = new LocatorHealer(config);
    }
    if (config) {
      this.screenshotManager = new ScreenshotManager(config);
    }
  }

  // ─── Navigation ──────────────────────────────────────────────────

  /** Navigate to a URL. Override in subclasses for app-specific URLs. */
  async navigate(url: string): Promise<void> {
    await this.page.goto(url, { waitUntil: "domcontentloaded" });
  }

  /** Wait for the page to fully stabilize (network idle). */
  async waitForStable(): Promise<void> {
    await this.page.waitForLoadState("networkidle");
  }

  // ─── Locator Helpers ─────────────────────────────────────────────

  /** Create a Playwright Locator. Convenience wrapper for subclass locator definitions. */
  protected locator(selector: string): Locator {
    return this.page.locator(selector);
  }

  /** Create a locator that matches the first element. */
  protected first(selector: string): Locator {
    return this.page.locator(selector).first();
  }

  /** Get a locator by role. */
  protected byRole(
    role: Parameters<Page["getByRole"]>[0],
    options?: Parameters<Page["getByRole"]>[1],
  ): Locator {
    return this.page.getByRole(role, options);
  }

  /** Get a locator by test id. */
  protected byTestId(testId: string): Locator {
    return this.page.getByTestId(testId);
  }

  /** Get a locator by text. */
  protected byText(
    text: string | RegExp,
    options?: { exact?: boolean },
  ): Locator {
    return this.page.getByText(text, options);
  }

  /** Get a locator by label. */
  protected byLabel(
    text: string | RegExp,
    options?: { exact?: boolean },
  ): Locator {
    return this.page.getByLabel(text, options);
  }

  /** Get a locator by placeholder. */
  protected byPlaceholder(
    text: string | RegExp,
    options?: { exact?: boolean },
  ): Locator {
    return this.page.getByPlaceholder(text, options);
  }

  // ─── Self-Healing Actions ────────────────────────────────────────

  /** Click with optional self-healing. */
  async click(selector: string, options?: ActionOptions): Promise<void> {
    const resolved = await this.resolveSelector(selector, options);
    await this.page.click(resolved);
  }

  /** Fill an input with optional self-healing. */
  async fill(
    selector: string,
    value: string,
    options?: ActionOptions,
  ): Promise<void> {
    const resolved = await this.resolveSelector(selector, options);
    await this.page.fill(resolved, value);
  }

  /** Get text content with optional self-healing. */
  async getText(selector: string, options?: ActionOptions): Promise<string> {
    const resolved = await this.resolveSelector(selector, options);
    return (await this.page.textContent(resolved)) ?? "";
  }

  /** Wait for an element to appear. */
  async waitForElement(selector: string, options?: WaitOptions): Promise<void> {
    await this.page.waitForSelector(selector, {
      timeout: options?.timeout ?? 30000,
      state: options?.state ?? "visible",
    });
  }

  // ─── Visual Regression ──────────────────────────────────────────

  /** Compare current page screenshot against a named baseline. */
  async compareVisual(
    name: string,
    options?: VisualTestOptions,
  ): Promise<VisualComparisonResult> {
    if (!this.screenshotManager) {
      throw new Error(
        "Visual testing requires a FrameworkConfig. Pass config to BasePage constructor.",
      );
    }
    return this.screenshotManager.compare(this.page, name, options);
  }

  // ─── Element Discovery ─────────────────────────────────────────

  /** Discover all interactive elements on the current page. */
  async discoverElements(): Promise<ElementInfo[]> {
    const interactiveSelectors =
      'button, a, input, select, textarea, [role="button"], [role="link"], [role="textbox"], [role="combobox"], [role="checkbox"], [role="radio"], [onclick], [tabindex]';

    const count = await this.page.locator(interactiveSelectors).count();
    const elements: ElementInfo[] = [];
    const crypto = await import("crypto");

    for (let i = 0; i < Math.min(count, 100); i++) {
      try {
        const el = this.page.locator(interactiveSelectors).nth(i);
        if (!(await el.isVisible())) continue;

        const tagName = await el.evaluate((e) => e.tagName.toLowerCase());
        const text = (await el.textContent()) ?? undefined;
        const attributes: Record<string, string> = await el.evaluate((e) => {
          const attrs: Record<string, string> = {};
          for (let j = 0; j < e.attributes.length; j++) {
            const attr = e.attributes[j];
            attrs[attr.name] = attr.value;
          }
          return attrs;
        });

        const selector = this.buildSelector(tagName, text, attributes);
        const fingerprint = crypto
          .createHash("md5")
          .update(`${tagName}|${text ?? ""}|${attributes["data-testid"] ?? ""}`)
          .digest("hex");

        elements.push({
          selector,
          alternativeSelectors: [],
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

  // ─── Screenshot ─────────────────────────────────────────────────

  /** Take a full-page screenshot. */
  async takeScreenshot(name?: string): Promise<Buffer> {
    return this.page.screenshot({
      fullPage: true,
      path: name ? `.ai-test/screenshots/${name}.png` : undefined,
    });
  }

  // ─── Internal Helpers ───────────────────────────────────────────

  /** Resolve a selector with self-healing if enabled and selector fails. */
  private async resolveSelector(
    selector: string,
    options?: ActionOptions,
  ): Promise<string> {
    if (!options?.selfHeal && !this.config?.healing?.enabled) return selector;

    try {
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
          `Healed: ${selector} → ${result.healedSelector} (${result.strategy})`,
        );
        return result.healedSelector;
      }
      throw new Error(`Self-healing failed for selector: ${selector}`);
    }
  }

  private buildSelector(
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
    return tagName;
  }
}
