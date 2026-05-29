/**
 * Mobile adapter — handles mobile web and responsive testing via Playwright.
 * For native mobile, extend with Appium integration.
 */

import type { AppType, AdapterContext, ActionOptions } from "../core/types";
import { AbstractAdapter } from "./base-adapter";

export interface DeviceProfile {
  name: string;
  viewport: { width: number; height: number };
  userAgent: string;
  deviceScaleFactor: number;
  isMobile: boolean;
  hasTouch: boolean;
}

const DEVICE_PROFILES: Record<string, DeviceProfile> = {
  "iphone-14": {
    name: "iPhone 14",
    viewport: { width: 390, height: 844 },
    userAgent:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1",
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
  },
  "ipad-pro": {
    name: "iPad Pro",
    viewport: { width: 1024, height: 1366 },
    userAgent:
      "Mozilla/5.0 (iPad; CPU OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1",
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  },
  "pixel-7": {
    name: "Pixel 7",
    viewport: { width: 412, height: 915 },
    userAgent:
      "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
    deviceScaleFactor: 2.625,
    isMobile: true,
    hasTouch: true,
  },
  "galaxy-s23": {
    name: "Samsung Galaxy S23",
    viewport: { width: 360, height: 780 },
    userAgent:
      "Mozilla/5.0 (Linux; Android 13; SM-S911B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
  },
};

export class MobileAdapter extends AbstractAdapter {
  readonly appType: AppType = "mobile";
  private deviceProfile?: DeviceProfile;

  async initialize(context: AdapterContext): Promise<void> {
    await super.initialize(context);
  }

  /**
   * Emulate a specific device.
   */
  async emulateDevice(deviceName: string): Promise<void> {
    const profile =
      DEVICE_PROFILES[deviceName.toLowerCase().replace(/\s+/g, "-")];
    if (!profile) {
      throw new Error(
        `Unknown device: ${deviceName}. Available: ${Object.keys(DEVICE_PROFILES).join(", ")}`,
      );
    }
    this.deviceProfile = profile;
    this.log.info(`Emulating device: ${profile.name}`);

    await this.page.setViewportSize(profile.viewport);
    // Note: userAgent and touch emulation should be set at context creation time
  }

  /**
   * Tap (touch) an element. Falls back to click if touch is not enabled.
   */
  async tap(selector: string, options?: ActionOptions): Promise<void> {
    const resolved = await this.resolveSelector(selector, options);
    try {
      await this.page.tap(resolved, {
        timeout: options?.timeout ?? this.ctx.config.timeouts.action,
      });
    } catch {
      // Fallback to click when hasTouch is not enabled on the browser context
      this.log.debug("Touch not supported, falling back to click");
      await this.page.click(resolved, {
        timeout: options?.timeout ?? this.ctx.config.timeouts.action,
      });
    }
  }

  /**
   * Swipe gesture simulation.
   */
  async swipe(
    direction: "up" | "down" | "left" | "right",
    distance: number = 300,
  ): Promise<void> {
    const viewport = this.page.viewportSize();
    if (!viewport) throw new Error("No viewport size available");

    const centerX = viewport.width / 2;
    const centerY = viewport.height / 2;

    const directionMap = {
      up: {
        startX: centerX,
        startY: centerY + distance / 2,
        endX: centerX,
        endY: centerY - distance / 2,
      },
      down: {
        startX: centerX,
        startY: centerY - distance / 2,
        endX: centerX,
        endY: centerY + distance / 2,
      },
      left: {
        startX: centerX + distance / 2,
        startY: centerY,
        endX: centerX - distance / 2,
        endY: centerY,
      },
      right: {
        startX: centerX - distance / 2,
        startY: centerY,
        endX: centerX + distance / 2,
        endY: centerY,
      },
    };

    const { startX, startY, endX, endY } = directionMap[direction];

    await this.page.mouse.move(startX, startY);
    await this.page.mouse.down();
    await this.page.mouse.move(endX, endY, { steps: 10 });
    await this.page.mouse.up();
  }

  /**
   * Pinch zoom simulation.
   */
  async pinchZoom(scale: number): Promise<void> {
    await this.page.evaluate((s) => {
      document.documentElement.style.transform = `scale(${s})`;
    }, scale);
  }

  /**
   * Check if current layout is responsive (mobile/tablet/desktop).
   */
  async getLayoutMode(): Promise<"mobile" | "tablet" | "desktop"> {
    // Use actual page viewport via evaluate for accuracy
    const width = await this.page.evaluate(() => window.innerWidth);
    if (width < 600) return "mobile";
    if (width < 1200) return "tablet";
    return "desktop";
  }

  /**
   * Get available device profiles.
   */
  static getDeviceProfiles(): Record<string, DeviceProfile> {
    return { ...DEVICE_PROFILES };
  }
}
