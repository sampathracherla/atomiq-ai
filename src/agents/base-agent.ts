/**
 * Atomiq AI — Base Agent
 *
 * Abstract base class for all agents. Provides lifecycle management,
 * message handling, and capability declaration.
 */

import type {
  AgentRole,
  AgentCapability,
  AgentStatus,
  AgentMessage,
  Task,
  TaskResult,
} from "./types";
import type { MessageBus } from "./message-bus";

export abstract class BaseAgent {
  readonly role: AgentRole;
  protected bus: MessageBus;
  protected status: AgentStatus;
  private unsubscribe?: () => void;

  constructor(role: AgentRole, bus: MessageBus) {
    this.role = role;
    this.bus = bus;
    this.status = {
      role,
      state: "idle",
      completedTasks: 0,
      failedTasks: 0,
      lastActivity: Date.now(),
    };
  }

  /**
   * Initialize the agent and start listening for messages.
   */
  start(): void {
    this.unsubscribe = this.bus.subscribe(this.role, (msg) =>
      this.handleMessage(msg),
    );
    this.onStart();
  }

  /**
   * Stop the agent and unsubscribe from messages.
   */
  stop(): void {
    this.unsubscribe?.();
    this.status.state = "idle";
    this.onStop();
  }

  /**
   * Handle incoming messages — routes to appropriate handler.
   */
  private async handleMessage(message: AgentMessage): Promise<void> {
    this.status.lastActivity = Date.now();

    switch (message.type) {
      case "task":
        await this.executeTask(message);
        break;
      case "query":
        await this.handleQuery(message);
        break;
      case "command":
        await this.handleCommand(message);
        break;
      default:
        break;
    }
  }

  /**
   * Execute a task and send the result back.
   */
  private async executeTask(message: AgentMessage): Promise<void> {
    const task = message.payload as Task;
    this.status.state = "busy";
    this.status.currentTask = task.id;

    try {
      const result = await this.perform(task);
      this.status.completedTasks++;
      this.status.state = "idle";
      this.status.currentTask = undefined;

      // Send result back to sender
      await this.bus.publish(
        this.bus.createMessage(
          "result",
          this.role,
          message.from,
          result,
          message.correlationId,
        ),
      );
    } catch (error) {
      this.status.failedTasks++;
      this.status.state = "idle";
      this.status.currentTask = undefined;

      const errorResult: TaskResult = {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };

      await this.bus.publish(
        this.bus.createMessage(
          "result",
          this.role,
          message.from,
          errorResult,
          message.correlationId,
        ),
      );
    }
  }

  /**
   * Send a message to another agent.
   */
  protected async send(
    to: AgentRole,
    type: AgentMessage["type"],
    payload: unknown,
  ): Promise<void> {
    await this.bus.publish(
      this.bus.createMessage(type, this.role, to, payload),
    );
  }

  /**
   * Send a task to another agent and wait for the result.
   */
  protected async delegate(
    to: AgentRole,
    task: Task,
    timeout?: number,
  ): Promise<TaskResult> {
    const response = await this.bus.request(this.role, to, task, timeout);
    return response.payload as TaskResult;
  }

  /**
   * Emit an event to all agents.
   */
  protected async broadcast(payload: unknown): Promise<void> {
    await this.bus.publish(
      this.bus.createMessage("event", this.role, "broadcast", payload),
    );
  }

  /**
   * Get current agent status.
   */
  getStatus(): AgentStatus {
    return { ...this.status };
  }

  // ─── Abstract Methods (implemented by each agent) ───

  /** Declare what this agent can do. */
  abstract getCapabilities(): AgentCapability[];

  /** Perform a task — the core logic of the agent. */
  abstract perform(task: Task): Promise<TaskResult>;

  // ─── Optional Hooks ───

  /** Called when agent starts. Override for initialization. */
  protected onStart(): void {}

  /** Called when agent stops. Override for cleanup. */
  protected onStop(): void {}

  /** Handle a query message. Override if agent responds to queries. */
  protected async handleQuery(_message: AgentMessage): Promise<void> {}

  /** Handle a command message. Override if agent accepts commands. */
  protected async handleCommand(_message: AgentMessage): Promise<void> {}
}
