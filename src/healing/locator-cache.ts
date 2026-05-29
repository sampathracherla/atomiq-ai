/**
 * Locator cache — persists selector mappings and healing history.
 */

import * as fs from "fs";
import * as path from "path";
import type { LocatorEntry } from "../core/types";
import { Logger } from "../core/logger";

const log = new Logger("LocatorCache");

export class LocatorCache {
  private cache: Map<string, LocatorEntry> = new Map();
  private filePath: string;

  constructor(cachePath: string) {
    this.filePath = path.resolve(cachePath);
    this.load();
  }

  get(selector: string): LocatorEntry | undefined {
    return this.cache.get(selector);
  }

  set(selector: string, entry: LocatorEntry): void {
    this.cache.set(selector, entry);
    this.save();
  }

  /**
   * Record a healing event: original selector → new selector.
   */
  recordHealing(
    originalSelector: string,
    healedSelector: string,
    fingerprint: string,
  ): void {
    const existing = this.cache.get(originalSelector);
    if (existing) {
      existing.healCount++;
      existing.lastHealedFrom = originalSelector;
      existing.selector = healedSelector;
      existing.lastUsed = new Date().toISOString();
    } else {
      this.cache.set(originalSelector, {
        selector: healedSelector,
        alternatives: [originalSelector],
        fingerprint,
        lastUsed: new Date().toISOString(),
        healCount: 1,
        lastHealedFrom: originalSelector,
      });
    }

    // Also store the healed selector for future lookups
    if (!this.cache.has(healedSelector)) {
      this.cache.set(healedSelector, {
        selector: healedSelector,
        alternatives: [originalSelector],
        fingerprint,
        lastUsed: new Date().toISOString(),
        healCount: 0,
      });
    }

    this.save();
    log.info(`Healing recorded: ${originalSelector} → ${healedSelector}`);
  }

  /**
   * Get all known alternatives for a selector.
   */
  getAlternatives(selector: string): string[] {
    const entry = this.cache.get(selector);
    return entry?.alternatives ?? [];
  }

  /**
   * Get healing statistics.
   */
  getStats(): {
    totalEntries: number;
    totalHealings: number;
    mostHealedSelectors: Array<{ selector: string; count: number }>;
  } {
    const entries = Array.from(this.cache.values());
    const totalHealings = entries.reduce((sum, e) => sum + e.healCount, 0);
    const mostHealed = entries
      .filter((e) => e.healCount > 0)
      .sort((a, b) => b.healCount - a.healCount)
      .slice(0, 10)
      .map((e) => ({ selector: e.selector, count: e.healCount }));

    return {
      totalEntries: this.cache.size,
      totalHealings,
      mostHealedSelectors: mostHealed,
    };
  }

  private load(): void {
    try {
      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, "utf-8");
        const data: Record<string, LocatorEntry> = JSON.parse(raw);
        this.cache = new Map(Object.entries(data));
        log.debug(`Loaded ${this.cache.size} locator entries from cache`);
      }
    } catch (err) {
      log.warn("Failed to load locator cache, starting fresh");
    }
  }

  private save(): void {
    try {
      const dir = path.dirname(this.filePath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      const data = Object.fromEntries(this.cache);
      fs.writeFileSync(this.filePath, JSON.stringify(data, null, 2));
    } catch (err) {
      log.warn("Failed to save locator cache");
    }
  }

  clear(): void {
    this.cache.clear();
    this.save();
  }
}
