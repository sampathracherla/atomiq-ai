/**
 * Atomiq AI — SAP Agent
 *
 * Specialist agent for SAP Fiori/UI5 testing.
 * Manages SAP-specific test execution using dhikraft patterns.
 */

import { BaseAgent } from "./base-agent";
import type { AgentCapability, Task, TaskResult, TaskMetrics } from "./types";
import type { MessageBus } from "./message-bus";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export class SapAgent extends BaseAgent {
  private projectRoot: string;

  constructor(bus: MessageBus, projectRoot?: string) {
    super("sap", bus);
    this.projectRoot = projectRoot || process.cwd();
  }

  getCapabilities(): AgentCapability[] {
    return [
      {
        name: "run-all",
        description: "Run all SAP/Fiori test specs",
      },
      {
        name: "run-spec",
        description: "Run a specific SAP test spec file",
        inputSchema: { specFile: "string" },
      },
      {
        name: "run-transaction",
        description: "Run tests for a specific SAP transaction",
        inputSchema: { transaction: "string" },
      },
      {
        name: "check-connection",
        description: "Verify SAP system connectivity",
      },
    ];
  }

  async perform(task: Task): Promise<TaskResult> {
    const { command, specFile, transaction, options } = task.input as {
      command: string;
      specFile?: string;
      transaction?: string;
      options?: Record<string, unknown>;
    };

    switch (command) {
      case "run-all":
        return this.runAll(options);
      case "run-spec":
        return this.runSpec(specFile!, options);
      case "run-transaction":
        return this.runTransaction(transaction!, options);
      case "check-connection":
        return this.checkConnection();
      default:
        return { success: false, error: `Unknown command: ${command}` };
    }
  }

  private async runAll(options?: Record<string, unknown>): Promise<TaskResult> {
    return this.executePlaywright("examples/sap-test.spec.ts", options);
  }

  private async runSpec(
    specFile: string,
    options?: Record<string, unknown>,
  ): Promise<TaskResult> {
    return this.executePlaywright(specFile, options);
  }

  private async runTransaction(
    transaction: string,
    options?: Record<string, unknown>,
  ): Promise<TaskResult> {
    return this.executePlaywright(
      `examples/sap-test.spec.ts --grep "${transaction}"`,
      options,
    );
  }

  /**
   * Check SAP system connectivity by verifying env vars and base URL.
   */
  private async checkConnection(): Promise<TaskResult> {
    const baseUrl = process.env.SAP_CLOUD_BASE_URL;
    const username = process.env.SAP_CLOUD_USERNAME;

    if (!baseUrl) {
      return {
        success: false,
        error: "SAP_CLOUD_BASE_URL not configured",
        data: {
          configured: false,
          env: { baseUrl: !!baseUrl, username: !!username },
        },
      };
    }

    return {
      success: true,
      data: {
        configured: true,
        baseUrl,
        username: username ? `${username.slice(0, 3)}***` : "not set",
      },
    };
  }

  private async executePlaywright(
    args: string,
    options?: Record<string, unknown>,
  ): Promise<TaskResult> {
    const startTime = Date.now();
    const timeout = (options?.timeout as number) || 90000; // SAP needs longer timeout
    const cmd = `npx playwright test "${args}" --reporter=line --workers=1`;

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
        error: error.message?.slice(0, 500) || "SAP test execution failed",
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
    console.log("[SapAgent] Specialist started — ready for SAP Fiori testing");
  }
}
