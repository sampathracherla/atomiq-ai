/**
 * Page Object — TodoMVC Application
 */
import type { Page, Locator } from "@playwright/test";
import { BasePage } from "../../src/pages/base-page";
import type { FrameworkConfig } from "../../src/core/types";

export class TodoMvcPage extends BasePage {
  readonly newTodoInput: Locator;
  readonly todoList: Locator;
  readonly todoItems: Locator;

  constructor(page: Page, config?: FrameworkConfig) {
    super(page, config);
    this.newTodoInput = this.locator(".new-todo");
    this.todoList = this.locator(".todo-list");
    this.todoItems = this.locator(".todo-list li");
  }

  async goto() {
    await this.navigate("https://demo.playwright.dev/todomvc");
  }

  async addTodo(text: string) {
    await this.fill(".new-todo", text, { selfHeal: true });
    await this.page.keyboard.press("Enter");
  }

  async getTodoText(index = 0): Promise<string> {
    return (await this.todoItems.nth(index).textContent()) ?? "";
  }

  async getTodoCount(): Promise<number> {
    return this.todoItems.count();
  }
}
