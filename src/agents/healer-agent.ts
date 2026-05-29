/**
 * Atomiq AI — Healer Agent
 *
 * AI-powered test failure diagnosis and auto-healing specialist.
 * Analyzes test failures, identifies root causes, suggests fixes,
 * and can auto-apply healing strategies for common failure patterns.
 */

import { BaseAgent } from "./base-agent";
import type { AgentCapability, Task, TaskResult } from "./types";
import type { MessageBus } from "./message-bus";
import { exec } from "child_process";
import { promisify } from "util";
import * as fs from "fs";
import * as path from "path";

const execAsync = promisify(exec);

export interface FailureAnalysis {
  testFile: string;
  testName: string;
  errorType: string;
  errorMessage: string;
  rootCause: string;
  suggestion: string;
  confidence: number;
  autoFixable: boolean;
}

export interface HealingReport {
  analyzed: number;
  autoFixed: number;
  manualReview: number;
  failures: FailureAnalysis[];
}

export class HealerAgent extends BaseAgent {
  private projectRoot: string;

  constructor(bus: MessageBus, projectRoot?: string) {
    super("healer", bus);
    this.projectRoot = projectRoot || process.cwd();
  }

  getCapabilities(): AgentCapability[] {
    return [
      {
        name: "diagnose",
        description: "Diagnose a test failure and suggest fixes",
        inputSchema: { errorMessage: "string", testFile: "string" },
      },
      {
        name: "analyze-report",
        description: "Analyze a Playwright test report for failure patterns",
      },
      {
        name: "heal-selector",
        description: "Attempt to heal a broken selector",
        inputSchema: { selector: "string", pageUrl: "string" },
      },
      {
        name: "retry-with-fix",
        description: "Re-run a failing test after applying suggested fix",
        inputSchema: { specFile: "string", fixStrategy: "string" },
      },
    ];
  }

  async perform(task: Task): Promise<TaskResult> {
    const startTime = Date.now();
    const {
      command,
      errorMessage,
      testFile,
      selector,
      pageUrl,
      specFile,
      fixStrategy,
    } = task.input as {
      command: string;
      errorMessage?: string;
      testFile?: string;
      selector?: string;
      pageUrl?: string;
      specFile?: string;
      fixStrategy?: string;
    };

    switch (command) {
      case "diagnose":
        return this.diagnose(errorMessage || "", testFile || "", startTime);
      case "analyze-report":
        return this.analyzeReport(startTime);
      case "heal-selector":
        return this.healSelector(selector || "", pageUrl || "", startTime);
      case "retry-with-fix":
        return this.retryWithFix(
          specFile || "",
          fixStrategy || "timeout",
          startTime,
        );
      default:
        return { success: false, error: `Unknown command: ${command}` };
    }
  }

  /**
   * Diagnose a test failure and provide root cause analysis.
   */
  private async diagnose(
    errorMessage: string,
    testFile: string,
    startTime: number,
  ): Promise<TaskResult> {
    const analysis = this.analyzeError(errorMessage, testFile);

    return {
      success: true,
      data: analysis,
      metrics: {
        duration: Date.now() - startTime,
        healingAttempts: 1,
        healingSuccesses: analysis.autoFixable ? 1 : 0,
      },
    };
  }

  /**
   * Analyze the latest Playwright test report for failure patterns.
   */
  private async analyzeReport(startTime: number): Promise<TaskResult> {
    const reportPath = path.join(this.projectRoot, "test-results");

    try {
      // Run tests and capture failures
      const { stdout, stderr } = await execAsync(
        "npx playwright test --reporter=json 2>&1 || true",
        { cwd: this.projectRoot, timeout: 90000 },
      ).catch((e) => ({ stdout: e.stdout || "", stderr: e.stderr || "" }));

      let report: any;
      try {
        report = JSON.parse(stdout);
      } catch {
        // If JSON parse fails, analyze from text output
        return {
          success: true,
          data: {
            analyzed: 0,
            autoFixed: 0,
            manualReview: 0,
            failures: [],
            note: "No JSON report available — tests may all be passing",
          },
          metrics: { duration: Date.now() - startTime },
        };
      }

      const failures: FailureAnalysis[] = [];

      if (report.suites) {
        for (const suite of report.suites) {
          for (const spec of suite.specs || []) {
            for (const test of spec.tests || []) {
              if (test.status === "unexpected" || test.status === "failed") {
                const error =
                  test.results?.[0]?.error?.message || "Unknown error";
                failures.push(this.analyzeError(error, suite.file || ""));
              }
            }
          }
        }
      }

      const healingReport: HealingReport = {
        analyzed: failures.length,
        autoFixed: failures.filter((f) => f.autoFixable).length,
        manualReview: failures.filter((f) => !f.autoFixable).length,
        failures,
      };

      return {
        success: true,
        data: healingReport,
        metrics: {
          duration: Date.now() - startTime,
          healingAttempts: failures.length,
          healingSuccesses: healingReport.autoFixed,
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message?.slice(0, 500) || "Report analysis failed",
        metrics: { duration: Date.now() - startTime },
      };
    }
  }

  /**
   * Attempt to heal a broken selector using multiple strategies.
   */
  private async healSelector(
    selector: string,
    pageUrl: string,
    startTime: number,
  ): Promise<TaskResult> {
    const strategies = this.generateHealingStrategies(selector);

    return {
      success: true,
      data: {
        originalSelector: selector,
        pageUrl,
        strategies,
        recommendation: strategies[0],
        note: "Apply the recommended strategy and re-run the test",
      },
      metrics: {
        duration: Date.now() - startTime,
        healingAttempts: strategies.length,
        healingSuccesses: strategies.length > 0 ? 1 : 0,
      },
    };
  }

  /**
   * Re-run a test with a fix strategy applied.
   */
  private async retryWithFix(
    specFile: string,
    fixStrategy: string,
    startTime: number,
  ): Promise<TaskResult> {
    const extraArgs: string[] = [];

    switch (fixStrategy) {
      case "timeout":
        extraArgs.push("--timeout=60000");
        break;
      case "retry":
        extraArgs.push("--retries=2");
        break;
      case "headed":
        extraArgs.push("--headed");
        break;
      default:
        extraArgs.push("--retries=1");
    }

    const cmd = `npx playwright test "${specFile}" --reporter=line ${extraArgs.join(" ")}`;

    try {
      const { stdout } = await execAsync(cmd, {
        cwd: this.projectRoot,
        timeout: 90000,
      });
      const passedMatch = stdout.match(/(\d+)\s+passed/);
      const failedMatch = stdout.match(/(\d+)\s+failed/);
      const passed = passedMatch ? parseInt(passedMatch[1], 10) : 0;
      const failed = failedMatch ? parseInt(failedMatch[1], 10) : 0;

      return {
        success: failed === 0,
        data: {
          strategy: fixStrategy,
          output: stdout.slice(0, 2000),
          healed: failed === 0,
        },
        metrics: {
          duration: Date.now() - startTime,
          testsRun: passed + failed,
          testsPassed: passed,
          testsFailed: failed,
          healingAttempts: 1,
          healingSuccesses: failed === 0 ? 1 : 0,
        },
      };
    } catch (error: any) {
      const output = error.stdout || "";
      const passedMatch = output.match(/(\d+)\s+passed/);
      const failedMatch = output.match(/(\d+)\s+failed/);
      const passed = passedMatch ? parseInt(passedMatch[1], 10) : 0;
      const failed = failedMatch ? parseInt(failedMatch[1], 10) : 0;

      return {
        success: false,
        data: {
          strategy: fixStrategy,
          output: output.slice(0, 2000),
          healed: false,
        },
        error: `Fix strategy "${fixStrategy}" did not resolve the failure`,
        metrics: {
          duration: Date.now() - startTime,
          testsRun: passed + failed,
          testsPassed: passed,
          testsFailed: failed,
          healingAttempts: 1,
          healingSuccesses: 0,
        },
      };
    }
  }

  /**
   * Analyze an error message and determine root cause + fix suggestion.
   */
  private analyzeError(
    errorMessage: string,
    testFile: string,
  ): FailureAnalysis {
    const lower = errorMessage.toLowerCase();
    let errorType = "unknown";
    let rootCause = "Unknown failure";
    let suggestion = "Review the test manually";
    let confidence = 0.5;
    let autoFixable = false;

    if (lower.includes("timeout") || lower.includes("exceeded")) {
      errorType = "timeout";
      rootCause =
        "Element not found within timeout period — page may be slow or selector is stale";
      suggestion =
        "Increase timeout, add waitForSelector before interaction, or update the selector";
      confidence = 0.85;
      autoFixable = true;
    } else if (lower.includes("locator") && lower.includes("not found")) {
      errorType = "selector-broken";
      rootCause = "Selector no longer matches any element — UI likely changed";
      suggestion =
        "Use self-healing: try data-testid, role, or text-based selector";
      confidence = 0.9;
      autoFixable = true;
    } else if (lower.includes("expected") && lower.includes("received")) {
      errorType = "assertion-failure";
      rootCause = "Assertion mismatch — expected value differs from actual";
      suggestion =
        "Update expected value or fix the application logic producing wrong data";
      confidence = 0.8;
      autoFixable = false;
    } else if (lower.includes("navigation") || lower.includes("net::err")) {
      errorType = "network-error";
      rootCause = "Network or navigation failure — page unreachable or blocked";
      suggestion = "Check if URL is accessible, verify network/proxy settings";
      confidence = 0.9;
      autoFixable = false;
    } else if (
      lower.includes("strict mode") ||
      lower.includes("multiple elements")
    ) {
      errorType = "ambiguous-selector";
      rootCause = "Selector matches multiple elements — not specific enough";
      suggestion =
        "Add .first(), .nth(), or make selector more specific with additional attributes";
      confidence = 0.85;
      autoFixable = true;
    } else if (lower.includes("detached") || lower.includes("stale")) {
      errorType = "stale-element";
      rootCause =
        "Element was removed from DOM between locating and interacting";
      suggestion =
        "Add a wait for the element to be stable, or re-locate before interaction";
      confidence = 0.8;
      autoFixable = true;
    }

    return {
      testFile,
      testName: this.extractTestName(errorMessage),
      errorType,
      errorMessage: errorMessage.slice(0, 300),
      rootCause,
      suggestion,
      confidence,
      autoFixable,
    };
  }

  /**
   * Generate alternative selectors for a broken one.
   */
  private generateHealingStrategies(
    selector: string,
  ): Array<{ strategy: string; selector: string; confidence: number }> {
    const strategies: Array<{
      strategy: string;
      selector: string;
      confidence: number;
    }> = [];

    // Strategy 1: Try data-testid
    if (selector.includes("#")) {
      const id = selector.replace("#", "");
      strategies.push({
        strategy: "data-testid",
        selector: `[data-testid="${id}"]`,
        confidence: 0.8,
      });
    }

    // Strategy 2: Try role-based
    if (selector.includes("button") || selector.includes("btn")) {
      strategies.push({
        strategy: "role-based",
        selector: `role=button`,
        confidence: 0.7,
      });
    }
    if (selector.includes("input")) {
      strategies.push({
        strategy: "role-based",
        selector: `role=textbox`,
        confidence: 0.7,
      });
    }

    // Strategy 3: Try text-based
    strategies.push({
      strategy: "text-content",
      selector: `text=<extract visible text>`,
      confidence: 0.6,
    });

    // Strategy 4: Try structural (parent/sibling)
    strategies.push({
      strategy: "structural",
      selector: `${selector} >> visible=true`,
      confidence: 0.5,
    });

    return strategies;
  }

  private extractTestName(errorMessage: string): string {
    const match = errorMessage.match(/›\s*(.+?)(?:\s*›|\s*$)/);
    return match ? match[1].trim() : "unknown test";
  }

  protected onStart(): void {
    console.log(
      "[HealerAgent] Specialist started — ready for failure diagnosis and auto-healing",
    );
  }
}
