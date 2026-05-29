/**
 * Example: Mobile Responsive Testing.
 */
import { test, expect } from "../src/fixtures/enterprise-fixtures";

test.describe("Mobile Responsive Testing", () => {
  test("iPhone 14 — responsive layout", async ({ page, mobile, web }) => {
    await test.step("Emulate iPhone 14", async () => {
      await mobile.emulateDevice("iphone-14");
    });

    await test.step("Navigate to app", async () => {
      await web.navigate("https://demo.playwright.dev/todomvc");
    });

    await test.step("Verify mobile layout", async () => {
      const layout = await mobile.getLayoutMode();
      expect(layout).toBe("mobile");
    });

    await test.step("Test touch interaction", async () => {
      await mobile.tap(".new-todo");
      await page.keyboard.type("Mobile task");
      await page.keyboard.press("Enter");
    });
  });

  test("iPad Pro — tablet layout", async ({ page, mobile, web }) => {
    await test.step("Emulate iPad Pro", async () => {
      await mobile.emulateDevice("ipad-pro");
    });

    await test.step("Navigate", async () => {
      await web.navigate("https://demo.playwright.dev/todomvc");
    });

    await test.step("Verify tablet layout", async () => {
      const layout = await mobile.getLayoutMode();
      expect(layout).toBe("tablet");
    });
  });

  test("Swipe gesture test", async ({ page, mobile, web }) => {
    await test.step("Setup mobile view", async () => {
      await mobile.emulateDevice("pixel-7");
      await web.navigate("https://demo.playwright.dev/todomvc");
    });

    await test.step("Perform swipe", async () => {
      await mobile.swipe("down", 200);
    });
  });
});
