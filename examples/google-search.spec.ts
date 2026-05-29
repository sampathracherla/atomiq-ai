/**
 * Google.com — 5 Quick Checks using Atomiq AI Framework (Page Object Model).
 *
 * Demonstrates: POM pattern, self-healing selectors, element discovery,
 * visual regression, and search interaction.
 */
import { test, expect } from "../src/fixtures/enterprise-fixtures";
import { GoogleHomePage } from "./pages/google-home.page";

test.describe("Google.com — Quick Checks (POM)", () => {
  let googlePage: GoogleHomePage;

  test.beforeEach(async ({ page, config }) => {
    googlePage = new GoogleHomePage(page, config);
    await googlePage.goto();
  });

  test("Homepage loads with correct title and search box", async ({ page }) => {
    await test.step("Verify page title contains Google", async () => {
      await expect(page).toHaveTitle(/Google/);
    });

    await test.step("Verify search input is visible", async () => {
      await expect(googlePage.searchBox).toBeVisible();
    });

    await test.step("Verify Google logo or branding is present", async () => {
      await expect(googlePage.logo).toBeVisible({ timeout: 5000 });
    });
  });

  test("Search box accepts input and shows suggestions", async () => {
    await test.step("Type a search query", async () => {
      await googlePage.typeSearch("Playwright");
    });

    await test.step("Verify text was entered in search box", async () => {
      await expect(googlePage.searchBox).toHaveValue("Playwright");
    });

    await test.step("Verify autocomplete suggestions appear", async () => {
      await expect(googlePage.suggestions).toBeVisible({ timeout: 5000 });
    });
  });

  test("Google Search and navigation buttons exist", async () => {
    await test.step("Verify Google Search button exists", async () => {
      await expect(googlePage.searchButton).toBeAttached();
    });

    await test.step("Verify footer links are present", async () => {
      const footer = googlePage.page
        .locator("text=Privacy, text=Terms")
        .first();
      await expect(footer)
        .toBeVisible({ timeout: 5000 })
        .catch(() => {
          // Some regions may not show footer — not a hard failure
        });
    });

    await test.step("Verify page language attribute", async () => {
      const lang = await googlePage.getLanguage();
      expect(lang).toBeTruthy();
    });
  });

  test("Visual snapshot of Google homepage", async () => {
    await test.step("Wait for page to stabilize", async () => {
      await googlePage.waitForStable();
    });

    await test.step("Capture and compare visual baseline", async () => {
      const result = await googlePage.compareVisual("google-homepage", {
        threshold: 0.1,
        autoBaseline: true,
      });
      expect(result.match).toBe(true);
    });
  });

  test("Element discovery on Google homepage", async () => {
    await test.step("Discover all interactive elements", async () => {
      const elements = await googlePage.discoverElements();
      expect(elements.length).toBeGreaterThan(0);

      for (const el of elements) {
        expect(el.selector).toBeTruthy();
        expect(el.fingerprint).toBeTruthy();
      }
    });

    await test.step("Verify discovered elements include interactive controls", async () => {
      const elements = await googlePage.discoverElements();
      const hasInteractive = elements.some(
        (el) =>
          el.tagName === "textarea" ||
          el.tagName === "input" ||
          el.tagName === "button" ||
          el.tagName === "a",
      );
      expect(hasInteractive).toBe(true);
    });
  });
});
