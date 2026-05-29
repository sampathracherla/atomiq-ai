/**
 * Atomiq AI — Planner Agent
 *
 * AI-powered test planning specialist.
 * Generates structured test plans from natural language descriptions,
 * analyzes application flows, and decomposes features into test cases.
 */

import { BaseAgent } from "./base-agent";
import type { AgentCapability, Task, TaskResult } from "./types";
import type { MessageBus } from "./message-bus";

export interface TestPlanItem {
  id: string;
  title: string;
  steps: string[];
  expectedResult: string;
  priority: "high" | "medium" | "low";
  type: "functional" | "api" | "visual" | "performance" | "accessibility";
}

export interface TestPlan {
  feature: string;
  description: string;
  items: TestPlanItem[];
  generatedAt: number;
  estimatedDuration: string;
}

export class PlannerAgent extends BaseAgent {
  constructor(bus: MessageBus) {
    super("planner", bus);
  }

  getCapabilities(): AgentCapability[] {
    return [
      {
        name: "generate-plan",
        description: "Generate a test plan from a feature description",
        inputSchema: {
          feature: "string",
          description: "string",
          appType: "string",
        },
      },
      {
        name: "decompose-feature",
        description: "Break a feature into individual test cases",
        inputSchema: { feature: "string", context: "string" },
      },
      {
        name: "prioritize",
        description: "Prioritize test cases by risk and impact",
        inputSchema: { testCases: "array" },
      },
      {
        name: "estimate",
        description: "Estimate execution time for a test plan",
        inputSchema: { plan: "object" },
      },
    ];
  }

  async perform(task: Task): Promise<TaskResult> {
    const startTime = Date.now();
    const { command, feature, description, appType, testCases, context } =
      task.input as {
        command: string;
        feature?: string;
        description?: string;
        appType?: string;
        testCases?: string[];
        context?: string;
      };

    switch (command) {
      case "generate-plan":
        return this.generatePlan(
          feature!,
          description || "",
          appType || "web",
          startTime,
        );
      case "decompose-feature":
        return this.decomposeFeature(feature!, context || "", startTime);
      case "prioritize":
        return this.prioritize(testCases || [], startTime);
      case "estimate":
        return this.estimate(task.input as any, startTime);
      default:
        return { success: false, error: `Unknown command: ${command}` };
    }
  }

  /**
   * Generate a comprehensive test plan from a feature description.
   * Uses rule-based decomposition (AI provider integration in Phase 5).
   */
  private async generatePlan(
    feature: string,
    description: string,
    appType: string,
    startTime: number,
  ): Promise<TaskResult> {
    const items: TestPlanItem[] = [];
    const keywords = this.extractKeywords(description || feature);

    // Generate test cases based on common patterns
    if (keywords.includes("login") || keywords.includes("auth")) {
      items.push(
        this.createItem(
          "Valid Login",
          [
            "Navigate to login page",
            "Enter valid credentials",
            "Click login button",
          ],
          "User is authenticated and redirected to dashboard",
          "high",
          "functional",
        ),
        this.createItem(
          "Invalid Password",
          [
            "Navigate to login page",
            "Enter valid username",
            "Enter wrong password",
            "Click login",
          ],
          "Error message displayed, user not authenticated",
          "high",
          "functional",
        ),
        this.createItem(
          "Empty Fields",
          ["Navigate to login page", "Leave fields empty", "Click login"],
          "Validation errors shown for required fields",
          "medium",
          "functional",
        ),
      );
    }

    if (
      keywords.includes("form") ||
      keywords.includes("input") ||
      keywords.includes("create")
    ) {
      items.push(
        this.createItem(
          "Submit Valid Data",
          ["Navigate to form", "Fill all required fields", "Submit form"],
          "Success message, data saved correctly",
          "high",
          "functional",
        ),
        this.createItem(
          "Validation Errors",
          ["Navigate to form", "Leave required fields empty", "Submit"],
          "Validation errors displayed for each field",
          "high",
          "functional",
        ),
        this.createItem(
          "Boundary Values",
          [
            "Enter min/max values in numeric fields",
            "Enter max-length strings",
            "Submit",
          ],
          "Form handles edge cases gracefully",
          "medium",
          "functional",
        ),
      );
    }

    if (
      keywords.includes("table") ||
      keywords.includes("list") ||
      keywords.includes("search")
    ) {
      items.push(
        this.createItem(
          "Data Loads",
          ["Navigate to list page", "Wait for data to load"],
          "Table/list displays records correctly",
          "high",
          "functional",
        ),
        this.createItem(
          "Search/Filter",
          ["Enter search query", "Apply filter"],
          "Results match the criteria",
          "medium",
          "functional",
        ),
        this.createItem(
          "Pagination",
          ["Navigate through pages", "Check page indicators"],
          "All pages load correctly with proper data",
          "low",
          "functional",
        ),
      );
    }

    if (
      keywords.includes("cart") ||
      keywords.includes("checkout") ||
      keywords.includes("order")
    ) {
      items.push(
        this.createItem(
          "Add to Cart",
          ["Browse products", "Add item to cart", "Verify cart badge updates"],
          "Item appears in cart with correct count",
          "high",
          "functional",
        ),
        this.createItem(
          "Complete Checkout",
          [
            "Add items to cart",
            "Go to checkout",
            "Fill shipping/payment",
            "Confirm order",
          ],
          "Order confirmed with confirmation number",
          "high",
          "functional",
        ),
        this.createItem(
          "Remove from Cart",
          ["Add item to cart", "Remove item", "Verify cart is empty"],
          "Cart badge resets, item removed",
          "medium",
          "functional",
        ),
      );
    }

    if (
      keywords.includes("api") ||
      keywords.includes("endpoint") ||
      keywords.includes("rest")
    ) {
      items.push(
        this.createItem(
          "GET Endpoint",
          [
            "Send GET request",
            "Validate response status 200",
            "Validate response schema",
          ],
          "Returns expected data structure",
          "high",
          "api",
        ),
        this.createItem(
          "POST Create",
          [
            "Send POST with valid body",
            "Validate 201 status",
            "Verify resource created",
          ],
          "Resource created and returned",
          "high",
          "api",
        ),
        this.createItem(
          "Error Handling",
          [
            "Send invalid request",
            "Validate 4xx status",
            "Check error message format",
          ],
          "Proper error response returned",
          "medium",
          "api",
        ),
      );
    }

    // Always add cross-cutting concerns
    if (appType === "web" || appType === "mobile") {
      items.push(
        this.createItem(
          "Responsive Layout",
          [
            "Resize to mobile viewport",
            "Check element visibility",
            "Verify navigation accessible",
          ],
          "Layout adapts correctly to smaller screens",
          "medium",
          "visual",
        ),
        this.createItem(
          "Performance Check",
          ["Measure page load time", "Check time to interactive"],
          "Page loads within acceptable thresholds",
          "low",
          "performance",
        ),
      );
    }

    // If no keywords matched, generate generic plan
    if (items.length === 0) {
      items.push(
        this.createItem(
          "Happy Path",
          [
            "Navigate to feature",
            "Perform primary action",
            "Verify expected outcome",
          ],
          "Feature works as described",
          "high",
          "functional",
        ),
        this.createItem(
          "Error Handling",
          [
            "Trigger error condition",
            "Verify error message",
            "Verify no data corruption",
          ],
          "Errors handled gracefully",
          "medium",
          "functional",
        ),
        this.createItem(
          "Edge Cases",
          [
            "Test boundary values",
            "Test empty inputs",
            "Test concurrent access",
          ],
          "System handles edge cases",
          "low",
          "functional",
        ),
      );
    }

    const plan: TestPlan = {
      feature,
      description: description || feature,
      items,
      generatedAt: Date.now(),
      estimatedDuration: `${items.length * 15}s`,
    };

    return {
      success: true,
      data: plan,
      metrics: {
        duration: Date.now() - startTime,
        testsRun: items.length,
        testsPassed: items.length,
        testsFailed: 0,
      },
    };
  }

  /**
   * Decompose a feature into individual test cases.
   */
  private async decomposeFeature(
    feature: string,
    context: string,
    startTime: number,
  ): Promise<TaskResult> {
    const keywords = this.extractKeywords(feature + " " + context);
    const testCases: string[] = [];

    // Generate test case names from keywords
    testCases.push(`Verify ${feature} loads correctly`);
    testCases.push(`Verify ${feature} handles invalid input`);
    testCases.push(`Verify ${feature} displays success state`);
    testCases.push(`Verify ${feature} displays error state`);

    if (keywords.includes("user") || keywords.includes("role")) {
      testCases.push(`Verify ${feature} respects permissions`);
    }
    if (keywords.includes("data") || keywords.includes("save")) {
      testCases.push(`Verify ${feature} persists data correctly`);
    }
    if (keywords.includes("mobile") || keywords.includes("responsive")) {
      testCases.push(`Verify ${feature} works on mobile viewport`);
    }

    return {
      success: true,
      data: { feature, testCases, count: testCases.length },
      metrics: { duration: Date.now() - startTime },
    };
  }

  /**
   * Prioritize test cases by risk and impact.
   */
  private async prioritize(
    testCases: string[],
    startTime: number,
  ): Promise<TaskResult> {
    const prioritized = testCases.map((tc, i) => ({
      testCase: tc,
      priority:
        i < testCases.length * 0.3
          ? "high"
          : i < testCases.length * 0.7
            ? "medium"
            : "low",
      reason:
        i < testCases.length * 0.3
          ? "Core functionality — high user impact"
          : i < testCases.length * 0.7
            ? "Important but not critical path"
            : "Edge case — lower probability",
    }));

    return {
      success: true,
      data: { prioritized, total: testCases.length },
      metrics: { duration: Date.now() - startTime },
    };
  }

  /**
   * Estimate execution time for a set of tests.
   */
  private async estimate(
    input: Record<string, unknown>,
    startTime: number,
  ): Promise<TaskResult> {
    const testCount =
      (input.testCases as string[])?.length ||
      (input.plan as any)?.items?.length ||
      5;
    const avgPerTest = 8; // seconds
    const estimatedSeconds = testCount * avgPerTest;

    return {
      success: true,
      data: {
        testCount,
        estimatedSeconds,
        estimatedFormatted:
          estimatedSeconds < 60
            ? `${estimatedSeconds}s`
            : `${Math.ceil(estimatedSeconds / 60)}m ${estimatedSeconds % 60}s`,
        breakdown: {
          setup: "2s",
          perTest: `${avgPerTest}s`,
          teardown: "1s",
        },
      },
      metrics: { duration: Date.now() - startTime },
    };
  }

  private extractKeywords(text: string): string[] {
    return text
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length > 2);
  }

  private createItem(
    title: string,
    steps: string[],
    expectedResult: string,
    priority: "high" | "medium" | "low",
    type: TestPlanItem["type"],
  ): TestPlanItem {
    return {
      id: `tc_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      title,
      steps,
      expectedResult,
      priority,
      type,
    };
  }

  protected onStart(): void {
    console.log(
      "[PlannerAgent] Specialist started — ready for AI test planning",
    );
  }
}
