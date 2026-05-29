/**
 * Example: AI-Powered Test Generation & Analysis.
 *
 * Shows how to use the AI engine to generate tests from natural language
 * and analyze test results.
 */
import { test, expect } from "../src/fixtures/enterprise-fixtures";

test.describe("AI-Powered Capabilities", () => {
  test("Generate test from natural language", async ({ ai }) => {
    await test.step("Generate a login test", async () => {
      const generated = await ai.generateTest({
        description:
          'Test the login flow: navigate to login page, enter username "admin" and password, click login button, verify dashboard is displayed',
        appType: "web",
        targetUrl: "https://my-app.com/login",
      });

      expect(generated.code).toBeTruthy();
      expect(generated.code).toContain("test");
      expect(generated.steps.length).toBeGreaterThan(0);
      expect(generated.confidence).toBeGreaterThan(0.5);

      console.log("Generated test code:");
      console.log(generated.code);
      console.log("Steps:", generated.steps);
    });
  });

  test("Enhance existing test", async ({ ai }) => {
    const existingTest = `
      test('basic login', async ({ page }) => {
        await page.goto('/login');
        await page.fill('#username', 'admin');
        await page.fill('#password', 'pass');
        await page.click('#login-btn');
      });
    `;

    await test.step("Add assertions and error handling", async () => {
      const enhanced = await ai.enhanceTest(
        existingTest,
        "Add proper assertions, error messages, and accessibility checks",
      );

      expect(enhanced.code).toBeTruthy();
      expect(enhanced.code.length).toBeGreaterThan(existingTest.length);
      console.log("Enhanced test:", enhanced.code);
    });
  });

  test("Diagnose a failure", async ({ ai }) => {
    await test.step("Analyze timeout error", async () => {
      const diagnosis = await ai.diagnoseFailure(
        "Login Test",
        'Timeout 30000ms exceeded waiting for selector "#login-button"',
        "Error: Timeout 30000ms exceeded.\n  at LoginPage.clickLogin (login.spec.ts:25:5)",
      );

      expect(diagnosis.rootCause).toBeTruthy();
      expect(diagnosis.category).toBeTruthy();
      expect(diagnosis.suggestedFix).toBeTruthy();
      console.log("Diagnosis:", diagnosis);
    });
  });
});
