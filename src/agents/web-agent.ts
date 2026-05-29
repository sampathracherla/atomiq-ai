/**
 * Atomiq AI — Web Agent
 *
 * Specialist agent for browser-based testing.
 * Wraps Playwright execution, manages POM tests, and reports results.
 */

import { BaseAgent } from "./base-agent";
import type { AgentCapability, Task, TaskResult, TaskMetrics } from "./types";
import type { MessageBus } from "./message-bus";
import { exec } from "child_process";
import { promisify } from "util";
import * as path from "path";

const execAsync = promisify(exec);

export class WebAgent extends BaseAgent {
  private projectRoot: string;

  constructor(bus: MessageBus, projectRoot?: string) {
    super("web", bus);
    this.projectRoot = projectRoot || process.cwd();
  }

  getCapabilities(): AgentCapability[] {
    return [
      {
        name: "run-all",
        description: "Run all web test specs",
      },
      {
        name: "run-spec",
        description: "Run a specific test spec file",
        inputSchema: { specFile: "string" },
      },
      {
        name: "run-grep",
        description: "Run tests matching a pattern",
        inputSchema: { pattern: "string" },
      },
      {
        name: "list-specs",
        description: "List all available web test specs",
      },
    ];
  }

  async perform(task: Task): Promise<TaskResult> {
    const startTime = Date.now();
    const { command, specFile, pattern, options } = task.input as {
      command: string;
      specFile?: string;
      pattern?: string;
      options?: Record<string, unknown>;
    };

    switch (command) {
      case "run-all":
        return this.runAll(options);
      case "run-spec":
        return this.runSpec(specFile!, options);
      case "run-grep":
        return this.runGrep(pattern!, options);
      case "list-specs":
        return this.listSpecs();
      default:
        return { success: false, error: `Unknown command: ${command}` };
    }
  }

  /**
   * Run all web test specs.
   */
  private async runAll(options?: Record<string, unknown>): Promise<TaskResult> {
    const specs = [
      "examples/google-search.spec.ts",
      "examples/saucedemo-test.spec.ts",
      "examples/web-app.spec.ts",
    ];

    const specArgs = specs.join(" ");
    return this.executePlaywright(specArgs, options);
  }

  /**
   * Run a specific spec file.
   */
  private async runSpec(
    specFile: string,
    options?: Record<string, unknown>,
  ): Promise<TaskResult> {
    return this.executePlaywright(specFile, options);
  }

  /**
   * Run tests matching a grep pattern.
   */
  private async runGrep(
    pattern: string,
    options?: Record<string, unknown>,
  ): Promise<TaskResult> {
    return this.executePlaywright(`--grep "${pattern}"`, options);
  }

  /**
   * List available spec files.
   */
  private async listSpecs(): Promise<TaskResult> {
    try {
      const { stdout } = await execAsync(`npx playwright test --list`, {
        cwd: this.projectRoot,
      });
      return { success: true, data: { specs: stdout.trim().split("\n") } };
    } catch (error) {
      return {
        success: true,
        data: { specs: [] },
        error: "Could not list specs",
      };
    }
  }

  /**
   * Execute Playwright tests and parse results.
   */
  private async executePlaywright(
    args: string,
    options?: Record<string, unknown>,
  ): Promise<TaskResult> {
    const startTime = Date.now();
    const timeout = (options?.timeout as number) || 60000;
    const extraArgs: string[] = [];

    if (options?.headed) extraArgs.push("--headed");
    if (options?.workers) extraArgs.push(`--workers=${options.workers}`);

    const cmd = `npx playwright test "${args}" --reporter=line ${extraArgs.join(" ")}`;

    try {
      const { stdout, stderr } = await execAsync(cmd, {
        cwd: this.projectRoot,
        timeout,
      });

      const metrics = this.parseResults(stdout);
      return {
        success: metrics.testsFailed === 0,
        data: { output: stdout.slice(0, 2000) },
        metrics: { ...metrics, duration: Date.now() - startTime },
      };
    } catch (error: any) {
      // Playwright exits with code 1 on test failures — still parse output
      const output = error.stdout || error.message || "";
      const metrics = this.parseResults(output);

      if (metrics.testsRun > 0) {
        return {
          success: metrics.testsFailed === 0,
          data: { output: output.slice(0, 2000) },
          metrics: { ...metrics, duration: Date.now() - startTime },
        };
      }

      return {
        success: false,
        error: error.message?.slice(0, 500) || "Playwright execution failed",
        metrics: {
          duration: Date.now() - startTime,
          testsRun: 0,
          testsPassed: 0,
          testsFailed: 0,
        },
      };
    }
  }

  /**
   * Parse Playwright output to extract test metrics.
   */
  private parseResults(output: string): TaskMetrics {
    // Try to parse "X passed" and "X failed" from output
    const passedMatch = output.match(/(\d+)\s+passed/);
    const failedMatch = output.match(/(\d+)\s+failed/);

    const passed = passedMatch ? parseInt(passedMatch[1], 10) : 0;
    const failed = failedMatch ? parseInt(failedMatch[1], 10) : 0;

    return {
      duration: 0,
      testsRun: passed + failed,
      testsPassed: passed,
      testsFailed: failed,
    };
  }

  protected onStart(): void {
    console.log("[WebAgent] Specialist started — ready for browser testing");
  }
}
