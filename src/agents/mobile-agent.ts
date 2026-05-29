/**
 * Atomiq AI — Mobile Agent
 *
 * Specialist agent for mobile/responsive testing.
 * Tests across device viewports (iPhone, iPad, Pixel) and validates responsive layouts.
 */

import { BaseAgent } from "./base-agent";
import type { AgentCapability, Task, TaskResult, TaskMetrics } from "./types";
import type { MessageBus } from "./message-bus";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export class MobileAgent extends BaseAgent {
  private projectRoot: string;

  constructor(bus: MessageBus, projectRoot?: string) {
    super("mobile", bus);
    this.projectRoot = projectRoot || process.cwd();
  }

  getCapabilities(): AgentCapability[] {
    return [
      {
        name: "run-all",
        description: "Run all mobile/responsive test specs",
      },
      {
        name: "run-spec",
        description: "Run a specific mobile test spec file",
        inputSchema: { specFile: "string" },
      },
      {
        name: "run-device",
        description: "Run tests for a specific device profile",
        inputSchema: { device: "string" },
      },
    ];
  }

  async perform(task: Task): Promise<TaskResult> {
    const { command, specFile, device, options } = task.input as {
      command: string;
      specFile?: string;
      device?: string;
      options?: Record<string, unknown>;
    };

    switch (command) {
      case "run-all":
        return this.runAll(options);
      case "run-spec":
        return this.runSpec(specFile!, options);
      case "run-device":
        return this.runDevice(device!, options);
      default:
        return { success: false, error: `Unknown command: ${command}` };
    }
  }

  private async runAll(options?: Record<string, unknown>): Promise<TaskResult> {
    return this.executePlaywright("examples/mobile-test.spec.ts", options);
  }

  private async runSpec(
    specFile: string,
    options?: Record<string, unknown>,
  ): Promise<TaskResult> {
    return this.executePlaywright(specFile, options);
  }

  private async runDevice(
    device: string,
    options?: Record<string, unknown>,
  ): Promise<TaskResult> {
    return this.executePlaywright(
      `examples/mobile-test.spec.ts --grep "${device}"`,
      options,
    );
  }

  private async executePlaywright(
    args: string,
    options?: Record<string, unknown>,
  ): Promise<TaskResult> {
    const startTime = Date.now();
    const timeout = (options?.timeout as number) || 60000;
    const cmd = `npx playwright test "${args}" --reporter=line`;

    try {
      const { stdout } = await execAsync(cmd, {
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
        error: error.message?.slice(0, 500) || "Mobile test execution failed",
        metrics: {
          duration: Date.now() - startTime,
          testsRun: 0,
          testsPassed: 0,
          testsFailed: 0,
        },
      };
    }
  }

  private parseResults(output: string): TaskMetrics {
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
    console.log("[MobileAgent] Specialist started — ready for device testing");
  }
}
