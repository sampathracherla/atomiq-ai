/**
 * Sauce Demo — 5 E-Commerce Tests using Atomiq AI Framework (Page Object Model).
 *
 * Demonstrates: POM pattern, login flow, product catalog, cart operations,
 * sorting, and full checkout on a real e-commerce application.
 */
import { test, expect } from "../src/fixtures/enterprise-fixtures";
import { SauceDemoPage } from "./pages/amazon-home.page";

test.describe("Sauce Demo — E-Commerce Tests (POM)", () => {
  let shop: SauceDemoPage;

  test.beforeEach(async ({ page, config }) => {
    shop = new SauceDemoPage(page, config);
    await shop.goto();
    await shop.login();
  });

  test("Login and verify product catalog loads", async ({ page }) => {
    await test.step("Verify URL changed to inventory page", async () => {
      await expect(page).toHaveURL(/inventory/);
    });

    await test.step("Verify product list is visible", async () => {
      await expect(shop.inventoryList).toBeVisible();
    });

    await test.step("Verify multiple products are displayed", async () => {
      const count = await shop.getItemCount();
      expect(count).toBeGreaterThan(0);
    });

    await test.step("Verify all products have prices", async () => {
      const prices = await shop.getItemPrices();
      expect(prices.length).toBeGreaterThan(0);
      for (const price of prices) {
        expect(price).toMatch(/\$\d+\.\d{2}/);
      }
    });
  });

  test("Add item to cart and verify badge updates", async () => {
    await test.step("Add first item to cart", async () => {
      await shop.addItemToCart(0);
    });

    await test.step("Verify cart badge shows 1", async () => {
      const count = await shop.getCartCount();
      expect(count).toBe("1");
    });

    await test.step("Add second item to cart", async () => {
      await shop.addItemToCart(1);
    });

    await test.step("Verify cart badge shows 2", async () => {
      const count = await shop.getCartCount();
      expect(count).toBe("2");
    });
  });

  test("Sort products by price low to high", async () => {
    await test.step("Get initial product order", async () => {
      const names = await shop.getItemNames();
      expect(names.length).toBeGreaterThan(0);
    });

    await test.step("Sort by price low to high", async () => {
      await shop.sortBy("lohi");
    });

    await test.step("Verify prices are in ascending order", async () => {
      const prices = await shop.getItemPrices();
      const numPrices = prices.map((p) => parseFloat(p.replace("$", "")));
      for (let i = 1; i < numPrices.length; i++) {
        expect(numPrices[i]).toBeGreaterThanOrEqual(numPrices[i - 1]);
      }
    });
  });

  test("Complete checkout flow end-to-end", async ({ page }) => {
    await test.step("Add item to cart", async () => {
      await shop.addItemToCart(0);
    });

    await test.step("Navigate to cart", async () => {
      await shop.cartLink.click();
      await expect(page).toHaveURL(/cart/);
    });

    await test.step("Proceed to checkout", async () => {
      await shop.checkoutButton.click();
      await expect(page).toHaveURL(/checkout-step-one/);
    });

    await test.step("Fill checkout information", async () => {
      await page.locator("#first-name, [data-test='firstName']").fill("John");
      await page.locator("#last-name, [data-test='lastName']").fill("Doe");
      await page
        .locator("#postal-code, [data-test='postalCode']")
        .fill("12345");
      await shop.continueButton.click();
    });

    await test.step("Finish order", async () => {
      await expect(page).toHaveURL(/checkout-step-two/);
      await shop.finishButton.click();
    });

    await test.step("Verify order complete", async () => {
      await expect(shop.completeHeader).toBeVisible();
      await expect(shop.completeHeader).toContainText("Thank you");
    });
  });

  test("Responsive layout on mobile viewport", async ({ page }) => {
    await test.step("Resize to mobile viewport", async () => {
      await page.setViewportSize({ width: 375, height: 812 });
    });

    await test.step("Verify products still visible", async () => {
      const count = await shop.getItemCount();
      expect(count).toBeGreaterThan(0);
    });

    await test.step("Verify menu button is accessible", async () => {
      await expect(shop.menuButton).toBeVisible();
    });

    await test.step("Verify cart link is visible", async () => {
      await expect(shop.cartLink).toBeVisible();
    });
  });
});
