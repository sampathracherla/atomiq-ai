/**
 * Screenshot manager — captures, stores, and compares screenshots for visual regression.
 */

import * as fs from "fs";
import * as path from "path";
import type { Page } from "@playwright/test";
import type {
  VisualTestOptions,
  VisualComparisonResult,
  FrameworkConfig,
} from "../core/types";
import { Logger } from "../core/logger";

const log = new Logger("ScreenshotManager");

export class ScreenshotManager {
  private baselineDir: string;
  private diffDir: string;
  private actualDir: string;

  constructor(config: FrameworkConfig) {
    this.baselineDir = path.resolve(config.visual.baselineDir);
    this.diffDir = path.resolve(config.visual.diffDir);
    this.actualDir = path.resolve(config.visual.diffDir, "actual");
    this.ensureDirs();
  }

  /**
   * Compare a page screenshot against its baseline.
   */
  async compare(
    page: Page,
    name: string,
    options?: VisualTestOptions,
  ): Promise<VisualComparisonResult> {
    const threshold = options?.threshold ?? 0.1;
    const baselinePath = path.join(this.baselineDir, `${name}.png`);
    const actualPath = path.join(this.actualDir, `${name}.png`);
    const diffPath = path.join(this.diffDir, `${name}-diff.png`);

    // Capture current screenshot
    const screenshotOptions: Parameters<Page["screenshot"]>[0] = {
      fullPage: true,
      path: actualPath,
    };

    // Mask ignore regions
    if (options?.ignoreRegions?.length) {
      screenshotOptions.mask = options.ignoreRegions.map(
        (r) => page.locator(`xpath=//body`).first(), // placeholder - actual masking via clip
      );
    }

    await page.screenshot(screenshotOptions);

    // Check if baseline exists
    if (!fs.existsSync(baselinePath)) {
      if (options?.autoBaseline !== false) {
        // Create baseline
        fs.copyFileSync(actualPath, baselinePath);
        log.info(`Baseline created: ${name}`);
        return {
          match: true,
          diffPercentage: 0,
          baselinePath,
          actualPath,
        };
      }
      throw new Error(
        `No baseline found for "${name}". Run with autoBaseline: true to create one.`,
      );
    }

    // Compare using pixelmatch
    const { PNG } = await import("pngjs");
    const baseline = PNG.sync.read(fs.readFileSync(baselinePath));
    const actual = PNG.sync.read(fs.readFileSync(actualPath));

    // Handle size differences
    const width = Math.max(baseline.width, actual.width);
    const height = Math.max(baseline.height, actual.height);

    // Resize images to same dimensions if needed
    const baselineResized = this.resizeImage(baseline, width, height);
    const actualResized = this.resizeImage(actual, width, height);

    const diff = new PNG({ width, height });
    const pixelmatch = (await import("pixelmatch")).default;
    const numDiffPixels = pixelmatch(
      baselineResized.data,
      actualResized.data,
      diff.data,
      width,
      height,
      { threshold: 0.1 },
    );

    const totalPixels = width * height;
    const diffPercentage = numDiffPixels / totalPixels;
    const match = diffPercentage <= threshold;

    if (!match) {
      fs.writeFileSync(diffPath, PNG.sync.write(diff));
      log.warn(
        `Visual diff detected: ${name} (${(diffPercentage * 100).toFixed(2)}% different)`,
      );
    }

    return {
      match,
      diffPercentage,
      diffImagePath: match ? undefined : diffPath,
      baselinePath,
      actualPath,
    };
  }

  /**
   * Update baseline with the current screenshot.
   */
  async updateBaseline(page: Page, name: string): Promise<void> {
    const baselinePath = path.join(this.baselineDir, `${name}.png`);
    await page.screenshot({ fullPage: true, path: baselinePath });
    log.info(`Baseline updated: ${name}`);
  }

  /**
   * List all baselines.
   */
  listBaselines(): string[] {
    if (!fs.existsSync(this.baselineDir)) return [];
    return fs
      .readdirSync(this.baselineDir)
      .filter((f) => f.endsWith(".png"))
      .map((f) => f.replace(".png", ""));
  }

  private resizeImage(img: any, width: number, height: number): any {
    if (img.width === width && img.height === height) return img;
    const { PNG } = require("pngjs");
    const resized = new PNG({ width, height, fill: true });
    PNG.bitblt(
      img,
      resized,
      0,
      0,
      Math.min(img.width, width),
      Math.min(img.height, height),
      0,
      0,
    );
    return resized;
  }

  private ensureDirs(): void {
    for (const dir of [this.baselineDir, this.diffDir, this.actualDir]) {
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    }
  }
}
