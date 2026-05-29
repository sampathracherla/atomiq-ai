/**
 * Page Object Model — Google Homepage
 *
 * Extends Atomiq AI BasePage for self-healing, visual regression, and discovery.
 */
import type { Page, Locator } from "@playwright/test";
import { BasePage } from "../../src/pages/base-page";
import type { FrameworkConfig } from "../../src/core/types";

export class GoogleHomePage extends BasePage {
  // --- Locators ---
  readonly searchBox: Locator;
  readonly logo: Locator;
  readonly searchButton: Locator;
  readonly suggestions: Locator;

  constructor(page: Page, config?: FrameworkConfig) {
    super(page, config);
    this.searchBox = this.first("textarea[name='q'], input[name='q']");
    this.logo = this.first(
      "img[alt='Google'], img[alt*='oogle'], #hplogo, [aria-label='Google']",
    );
    this.searchButton = this.first("input[name='btnK'], button[name='btnK']");
    this.suggestions = this.first("[role='listbox'], ul[role='listbox']");
  }

  async goto() {
    await this.navigate("https://www.google.com");
  }

  async typeSearch(query: string) {
    await this.searchBox.click();
    await this.searchBox.fill(query);
  }

  async getLanguage(): Promise<string | null> {
    return this.page.getAttribute("html", "lang");
  }
}
