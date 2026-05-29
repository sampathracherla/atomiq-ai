/**
 * Self-healing locator engine — automatically resolves broken selectors
 * using multiple strategies: attribute fallback, text matching,
 * structural similarity, and AI-assisted healing.
 */

import type { Page } from "@playwright/test";
import type {
  HealingResult,
  HealingStrategy,
  FrameworkConfig,
} from "../core/types";
import { Logger } from "../core/logger";
import { LocatorCache } from "./locator-cache";
import { aiEngine } from "../ai/ai-engine";

const log = new Logger("LocatorHealer");

export class LocatorHealer {
  private cache: LocatorCache;
  private config: FrameworkConfig;

  constructor(config: FrameworkConfig) {
    this.config = config;
    this.cache = new LocatorCache(config.healing.cachePath);
  }

  /**
   * Attempt to heal a broken selector using multiple strategies.
   */
  async heal(brokenSelector: string, page: Page): Promise<HealingResult> {
    log.info(`Healing selector: ${brokenSelector}`);

    const strategies: Array<{
      name: HealingStrategy;
      fn: () => Promise<string | null>;
    }> = [
      {
        name: "attribute-fallback",
        fn: () => this.tryAttributeFallback(brokenSelector, page),
      },
      {
        name: "text-content",
        fn: () => this.tryTextContent(brokenSelector, page),
      },
      {
        name: "structural-similarity",
        fn: () => this.tryStructuralSimilarity(brokenSelector, page),
      },
    ];

    // Add AI healing as last resort
    if (this.config.healing.useAI) {
      strategies.push({
        name: "ai-assisted",
        fn: () => this.tryAIHealing(brokenSelector, page),
      });
    }

    for (const strategy of strategies) {
      try {
        const healedSelector = await strategy.fn();
        if (healedSelector) {
          // Verify the healed selector works
          const isValid = await this.verifySelector(healedSelector, page);
          if (isValid) {
            const result: HealingResult = {
              originalSelector: brokenSelector,
              healedSelector,
              strategy: strategy.name,
              confidence: this.getConfidence(strategy.name),
              success: true,
            };

            // Cache the healing
            this.cache.recordHealing(brokenSelector, healedSelector, "");
            log.info(
              `Healed: ${brokenSelector} → ${healedSelector} via ${strategy.name}`,
            );
            return result;
          }
        }
      } catch (err) {
        log.debug(
          `Strategy ${strategy.name} failed: ${(err as Error).message}`,
        );
      }
    }

    return {
      originalSelector: brokenSelector,
      healedSelector: brokenSelector,
      strategy: "attribute-fallback",
      confidence: 0,
      success: false,
    };
  }

  /**
   * Strategy 1: Try cached alternatives and attribute-based selectors.
   */
  private async tryAttributeFallback(
    selector: string,
    page: Page,
  ): Promise<string | null> {
    // Check cache first
    const cached = this.cache.getAlternatives(selector);
    for (const alt of cached) {
      if (await this.verifySelector(alt, page)) return alt;
    }

    // Parse the selector and try attribute variations
    const variations = this.generateAttributeVariations(selector);
    for (const variation of variations) {
      if (await this.verifySelector(variation, page)) return variation;
    }

    return null;
  }

  /**
   * Strategy 2: Find element by text content.
   */
  private async tryTextContent(
    selector: string,
    page: Page,
  ): Promise<string | null> {
    // Extract text hint from selector
    const textMatch =
      selector.match(/text[=~]"([^"]+)"/i) ||
      selector.match(/:has-text\("([^"]+)"\)/i) ||
      selector.match(/\[aria-label="([^"]+)"\]/i);

    if (!textMatch) return null;
    const text = textMatch[1];

    // Try various text-based selectors
    const textSelectors = [
      `text="${text}"`,
      `*:has-text("${text}")`,
      `[aria-label="${text}"]`,
      `button:has-text("${text}")`,
      `a:has-text("${text}")`,
      `input[placeholder="${text}"]`,
    ];

    for (const ts of textSelectors) {
      if (await this.verifySelector(ts, page)) return ts;
    }

    return null;
  }

  /**
   * Strategy 3: Structural similarity — find elements with similar DOM position.
   */
  private async tryStructuralSimilarity(
    selector: string,
    page: Page,
  ): Promise<string | null> {
    // Extract element type from selector
    const tagMatch = selector.match(/^(\w+)/);
    const tag = tagMatch?.[1];
    if (!tag) return null;

    // Get all elements of the same type and find closest match by attributes
    const idMatch = selector.match(/#([\w-]+)/);
    if (idMatch) {
      const partialId = idMatch[1];
      // Try partial ID match
      const found = await page.evaluate(
        (params) => {
          const elements = document.querySelectorAll(
            `[id*="${params.partialId}"]`,
          );
          if (elements.length === 1) return `#${elements[0].id}`;
          return null;
        },
        { partialId: partialId.replace(/\d+$/, "") },
      );

      if (found && (await this.verifySelector(found, page))) return found;
    }

    return null;
  }

  /**
   * Strategy 4: AI-assisted healing — use LLM to analyze page and find element.
   */
  private async tryAIHealing(
    selector: string,
    page: Page,
  ): Promise<string | null> {
    try {
      // Get page content snapshot
      const snapshot = await page.evaluate(() => {
        const walk = (el: Element, depth: number): string => {
          if (depth > 4) return "";
          const tag = el.tagName.toLowerCase();
          const id = el.id ? ` id="${el.id}"` : "";
          const role = el.getAttribute("role")
            ? ` role="${el.getAttribute("role")}"`
            : "";
          const text = el.textContent?.trim().slice(0, 50) ?? "";
          const children = Array.from(el.children)
            .map((c) => walk(c, depth + 1))
            .filter(Boolean)
            .join("");
          return `<${tag}${id}${role}>${text}${children}</${tag}>`;
        };
        return walk(document.body, 0);
      });
      const pageSnapshot = snapshot.slice(0, 8000);

      const result = await aiEngine.healSelector({
        brokenSelector: selector,
        pageSnapshot,
        errorMessage: `Selector "${selector}" not found on page`,
      });

      if (result.confidence >= 0.5) {
        return result.selector;
      }
    } catch (err) {
      log.debug(`AI healing failed: ${(err as Error).message}`);
    }

    return null;
  }

  /**
   * Verify a selector resolves to a visible element.
   */
  private async verifySelector(selector: string, page: Page): Promise<boolean> {
    try {
      const element = page.locator(selector).first();
      await element.waitFor({ timeout: 3000, state: "attached" });
      return true;
    } catch {
      return false;
    }
  }

  private generateAttributeVariations(selector: string): string[] {
    const variations: string[] = [];

    // ID-based: try without numeric suffix
    const idMatch = selector.match(/#([\w-]+)/);
    if (idMatch) {
      const baseId = idMatch[1].replace(/[-_]?\d+$/, "");
      variations.push(`[id^="${baseId}"]`);
      variations.push(`[id*="${baseId}"]`);
    }

    // Class-based: try individual classes
    const classMatch = selector.match(/\.([\w-]+)/g);
    if (classMatch) {
      for (const cls of classMatch) {
        variations.push(`[class*="${cls.slice(1)}"]`);
      }
    }

    // data-testid variations
    const testIdMatch = selector.match(/\[data-testid="([^"]+)"\]/);
    if (testIdMatch) {
      variations.push(`[data-testid*="${testIdMatch[1]}"]`);
      variations.push(`[data-test-id="${testIdMatch[1]}"]`);
      variations.push(`[data-test="${testIdMatch[1]}"]`);
    }

    return variations;
  }

  private getConfidence(strategy: HealingStrategy): number {
    const confidenceMap: Record<HealingStrategy, number> = {
      "attribute-fallback": 0.9,
      "text-content": 0.8,
      "structural-similarity": 0.6,
      "ai-assisted": 0.7,
      "visual-anchor": 0.5,
    };
    return confidenceMap[strategy];
  }

  getCache(): LocatorCache {
    return this.cache;
  }
}
