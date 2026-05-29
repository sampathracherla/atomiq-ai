/**
 * Atomiq AI — Supervisor Agent
 *
 * The orchestrator. Routes tasks to specialist agents, manages parallel
 * execution, aggregates results, and handles failures.
 */

import { BaseAgent } from "./base-agent";
import type {
  AgentCapability,
  AgentRole,
  Task,
  TaskResult,
  TaskMetrics,
} from "./types";
import type { MessageBus } from "./message-bus";
import type { AgentRegistry } from "./agent-registry";

interface SupervisorTask extends Task {
  input: {
    command: string;
    targets?: AgentRole[];
    options?: Record<string, unknown>;
  };
}

export class SupervisorAgent extends BaseAgent {
  private registry: AgentRegistry;
  private taskHistory: Array<{ task: Task; result: TaskResult }> = [];

  constructor(bus: MessageBus, registry: AgentRegistry) {
    super("supervisor", bus);
    this.registry = registry;
  }

  getCapabilities(): AgentCapability[] {
    return [
      {
        name: "orchestrate",
        description: "Route tasks to appropriate specialist agents",
      },
      {
        name: "run-regression",
        description: "Execute full regression across all platforms",
      },
      {
        name: "run-suite",
        description:
          "Execute tests for a specific platform (web, api, mobile, sap)",
      },
      {
        name: "system-status",
        description: "Get status of all agents in the system",
      },
    ];
  }

  async perform(task: SupervisorTask): Promise<TaskResult> {
    const { command, targets, options } = task.input;
    const startTime = Date.now();

    switch (command) {
      case "run-regression":
        return this.runRegression(options);
      case "run-suite":
        return this.runSuite(targets || [], options);
      case "system-status":
        return this.getSystemStatus();
      case "route":
        return this.routeTask(task, targets);
      default:
        return this.autoRoute(task);
    }
  }

  /**
   * Run full regression — delegates to all available specialist agents in parallel.
   */
  private async runRegression(
    options?: Record<string, unknown>,
  ): Promise<TaskResult> {
    const startTime = Date.now();
    const specialists: AgentRole[] = ["web", "api", "mobile", "sap"];
    const available = specialists.filter((role) => this.registry.get(role));

    if (available.length === 0) {
      return { success: false, error: "No specialist agents available" };
    }

    await this.broadcast({ event: "regression-started", agents: available });

    // Run all specialists in parallel
    const results = await Promise.allSettled(
      available.map((role) =>
        this.delegate(role, {
          id: `regression_${role}_${Date.now()}`,
          type: "run-all",
          description: `Run all ${role} tests`,
          status: "pending",
          input: { command: "run-all", options },
          createdAt: Date.now(),
        }),
      ),
    );

    // Aggregate results
    const aggregated = this.aggregateResults(available, results);
    aggregated.metrics = {
      ...aggregated.metrics!,
      duration: Date.now() - startTime,
    };

    await this.broadcast({
      event: "regression-completed",
      results: aggregated,
    });
    return aggregated;
  }

  /**
   * Run tests for specific platforms.
   */
  private async runSuite(
    targets: AgentRole[],
    options?: Record<string, unknown>,
  ): Promise<TaskResult> {
    const startTime = Date.now();

    const results = await Promise.allSettled(
      targets.map((role) =>
        this.delegate(role, {
          id: `suite_${role}_${Date.now()}`,
          type: "run-all",
          description: `Run ${role} test suite`,
          status: "pending",
          input: { command: "run-all", options },
          createdAt: Date.now(),
        }),
      ),
    );

    const aggregated = this.aggregateResults(targets, results);
    aggregated.metrics = {
      ...aggregated.metrics!,
      duration: Date.now() - startTime,
    };

    return aggregated;
  }

  /**
   * Route a task to specific agents.
   */
  private async routeTask(
    task: Task,
    targets?: AgentRole[],
  ): Promise<TaskResult> {
    if (!targets || targets.length === 0) {
      return this.autoRoute(task);
    }

    const target = targets[0];
    const agent = this.registry.get(target);
    if (!agent) {
      return { success: false, error: `Agent not available: ${target}` };
    }

    return this.delegate(target, task);
  }

  /**
   * Auto-route a task based on its type/description.
   */
  private autoRoute(task: Task): Promise<TaskResult> {
    const description = task.description.toLowerCase();
    let target: AgentRole;

    if (
      description.includes("api") ||
      description.includes("endpoint") ||
      description.includes("rest")
    ) {
      target = "api";
    } else if (
      description.includes("mobile") ||
      description.includes("responsive") ||
      description.includes("device")
    ) {
      target = "mobile";
    } else if (
      description.includes("sap") ||
      description.includes("fiori") ||
      description.includes("ui5")
    ) {
      target = "sap";
    } else if (
      description.includes("plan") ||
      description.includes("strategy")
    ) {
      target = "planner";
    } else if (
      description.includes("heal") ||
      description.includes("fix") ||
      description.includes("broken")
    ) {
      target = "healer";
    } else if (
      description.includes("report") ||
      description.includes("dashboard")
    ) {
      target = "report";
    } else {
      target = "web"; // Default to web agent
    }

    const agent = this.registry.get(target);
    if (!agent) {
      return Promise.resolve({
        success: false,
        error: `No agent available for: ${target}`,
      });
    }

    return this.delegate(target, task);
  }

  /**
   * Get system-wide status.
   */
  private getSystemStatus(): Promise<TaskResult> {
    const agents = this.registry.listAgents();
    return Promise.resolve({
      success: true,
      data: {
        agents,
        totalAgents: agents.length,
        busyAgents: agents.filter((a) => a.status.state === "busy").length,
        messageHistory: this.bus.getHistory(10),
      },
    });
  }

  /**
   * Aggregate results from multiple parallel agent executions.
   */
  private aggregateResults(
    agents: AgentRole[],
    results: PromiseSettledResult<TaskResult>[],
  ): TaskResult {
    let totalTests = 0;
    let totalPassed = 0;
    let totalFailed = 0;
    const agentResults: Record<string, TaskResult> = {};
    let allSuccess = true;

    results.forEach((result, idx) => {
      const role = agents[idx];
      if (result.status === "fulfilled") {
        agentResults[role] = result.value;
        if (!result.value.success) allSuccess = false;
        if (result.value.metrics) {
          totalTests += result.value.metrics.testsRun || 0;
          totalPassed += result.value.metrics.testsPassed || 0;
          totalFailed += result.value.metrics.testsFailed || 0;
        }
      } else {
        allSuccess = false;
        agentResults[role] = {
          success: false,
          error: result.reason?.message || "Unknown error",
        };
      }
    });

    return {
      success: allSuccess,
      data: agentResults,
      metrics: {
        duration: 0,
        testsRun: totalTests,
        testsPassed: totalPassed,
        testsFailed: totalFailed,
      },
    };
  }

  protected onStart(): void {
    console.log("[Supervisor] Agent started — ready to orchestrate");
  }
}
