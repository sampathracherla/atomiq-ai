/**
 * Page Object Model — Sauce Demo E-Commerce (saucedemo.com)
 *
 * Extends Atomiq AI BasePage for self-healing, visual regression, and discovery.
 * Full e-commerce flow: login → browse → add to cart → checkout.
 */
import type { Page, Locator } from "@playwright/test";
import { BasePage } from "../../src/pages/base-page";
import type { FrameworkConfig } from "../../src/core/types";

export class SauceDemoPage extends BasePage {
  // --- Login Locators ---
  readonly usernameInput: Locator;
  readonly passwordInput: Locator;
  readonly loginButton: Locator;

  // --- Inventory Locators ---
  readonly inventoryList: Locator;
  readonly inventoryItems: Locator;
  readonly cartBadge: Locator;
  readonly cartLink: Locator;
  readonly sortDropdown: Locator;
  readonly menuButton: Locator;
  readonly productTitle: Locator;

  // --- Cart & Checkout ---
  readonly checkoutButton: Locator;
  readonly continueButton: Locator;
  readonly finishButton: Locator;
  readonly completeHeader: Locator;

  constructor(page: Page, config?: FrameworkConfig) {
    super(page, config);
    this.usernameInput = this.first("#user-name, input[data-test='username']");
    this.passwordInput = this.first("#password, input[data-test='password']");
    this.loginButton = this.first(
      "#login-button, input[data-test='login-button']",
    );

    this.inventoryList = this.first(".inventory_list, #inventory_container");
    this.inventoryItems = this.page.locator(".inventory_item");
    this.cartBadge = this.first(".shopping_cart_badge");
    this.cartLink = this.first(".shopping_cart_link, a.shopping_cart_link");
    this.sortDropdown = this.first(
      ".product_sort_container, select[data-test='product-sort-container']",
    );
    this.menuButton = this.first(
      "#react-burger-menu-btn, button[id='react-burger-menu-btn']",
    );
    this.productTitle = this.first(
      ".inventory_details_name, [data-test='inventory-item-name']",
    );

    this.checkoutButton = this.first("#checkout, button[data-test='checkout']");
    this.continueButton = this.first("#continue, input[data-test='continue']");
    this.finishButton = this.first("#finish, button[data-test='finish']");
    this.completeHeader = this.first(
      ".complete-header, h2[data-test='complete-header']",
    );
  }

  async goto() {
    await this.navigate("https://www.saucedemo.com");
  }

  async login(username = "standard_user", password = "secret_sauce") {
    await this.usernameInput.fill(username);
    await this.passwordInput.fill(password);
    await this.loginButton.click();
  }

  async addItemToCart(index: number = 0) {
    await this.inventoryItems
      .nth(index)
      .locator("button:has-text('Add to cart')")
      .click();
  }

  async getItemCount(): Promise<number> {
    return this.inventoryItems.count();
  }

  async getCartCount(): Promise<string | null> {
    return this.cartBadge.textContent();
  }

  async sortBy(value: string) {
    await this.sortDropdown.selectOption(value);
  }

  async getItemNames(): Promise<string[]> {
    return this.inventoryItems
      .locator(".inventory_item_name")
      .allTextContents();
  }

  async getItemPrices(): Promise<string[]> {
    return this.inventoryItems
      .locator(".inventory_item_price")
      .allTextContents();
  }
}
