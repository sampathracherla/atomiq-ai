/**
 * Example: Web Application Testing with AI-powered features (Page Object Model).
 *
 * Demonstrates: POM with BasePage, self-healing selectors, visual regression,
 * data generation, and element discovery.
 */
import { test, expect } from "../src/fixtures/enterprise-fixtures";
import { TodoMvcPage } from "./pages/todomvc.page";

test.describe("Web Application — AI-Powered Tests (POM)", () => {
  let todoPage: TodoMvcPage;

  test.beforeEach(async ({ page, config }) => {
    todoPage = new TodoMvcPage(page, config);
    await todoPage.goto();
  });

  test("Todo flow with self-healing selectors", async () => {
    await test.step("Add a todo with self-healing", async () => {
      await todoPage.addTodo("Buy groceries");
    });

    await test.step("Verify todo was added", async () => {
      const text = await todoPage.getTodoText(0);
      expect(text).toContain("Buy groceries");
    });
  });

  test("Visual regression test", async () => {
    await test.step("Compare against baseline", async () => {
      const result = await todoPage.compareVisual("todomvc-home", {
        threshold: 0.05,
        autoBaseline: true,
      });
      expect(result.match).toBe(true);
    });
  });

  test("AI-generated test data", async ({ dataGen }) => {
    await test.step("Generate realistic test data", async () => {
      const { data } = await dataGen.generate({
        schema: {
          name: "firstName",
          email: "email",
          company: "companyName",
          phone: "phone",
        },
        count: 3,
      });

      expect(data).toHaveLength(3);
      expect(data[0]).toHaveProperty("name");
      expect(data[0]).toHaveProperty("email");
    });

    await test.step("Use quick generators", async () => {
      const email = dataGen.randomEmail();
      const name = dataGen.randomName();
      expect(email).toContain("@");
      expect(name).toBeTruthy();
    });
  });

  test("Element discovery", async () => {
    await test.step("Discover interactive elements", async () => {
      const elements = await todoPage.discoverElements();
      expect(elements.length).toBeGreaterThan(0);

      for (const el of elements) {
        expect(el.selector).toBeTruthy();
        expect(el.fingerprint).toBeTruthy();
      }
    });
  });
});
