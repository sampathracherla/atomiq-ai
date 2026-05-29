/**
 * Plugin manager — registers and orchestrates framework plugins.
 */

import type {
  Plugin,
  FrameworkConfig,
  TestResult,
  HealingResult,
} from "./types";
import { Logger } from "./logger";

const log = new Logger("PluginManager");

export class PluginManager {
  private plugins: Plugin[] = [];

  register(plugin: Plugin): void {
    if (this.plugins.find((p) => p.name === plugin.name)) {
      log.warn(`Plugin "${plugin.name}" already registered, skipping`);
      return;
    }
    this.plugins.push(plugin);
    log.info(`Plugin registered: ${plugin.name}@${plugin.version}`);
  }

  unregister(name: string): void {
    this.plugins = this.plugins.filter((p) => p.name !== name);
  }

  async initialize(config: FrameworkConfig): Promise<void> {
    for (const plugin of this.plugins) {
      if (plugin.onInit) {
        await plugin.onInit(config);
      }
    }
  }

  async beforeTest(testName: string): Promise<void> {
    for (const plugin of this.plugins) {
      if (plugin.onBeforeTest) await plugin.onBeforeTest(testName);
    }
  }

  async afterTest(result: TestResult): Promise<void> {
    for (const plugin of this.plugins) {
      if (plugin.onAfterTest) await plugin.onAfterTest(result);
    }
  }

  async beforeAction(action: string, selector: string): Promise<void> {
    for (const plugin of this.plugins) {
      if (plugin.onBeforeAction) await plugin.onBeforeAction(action, selector);
    }
  }

  async afterAction(
    action: string,
    selector: string,
    success: boolean,
  ): Promise<void> {
    for (const plugin of this.plugins) {
      if (plugin.onAfterAction)
        await plugin.onAfterAction(action, selector, success);
    }
  }

  async onHealing(result: HealingResult): Promise<void> {
    for (const plugin of this.plugins) {
      if (plugin.onHealing) await plugin.onHealing(result);
    }
  }

  getPlugins(): readonly Plugin[] {
    return this.plugins;
  }
}

export const pluginManager = new PluginManager();
