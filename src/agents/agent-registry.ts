/**
 * Atomiq AI — Agent Registry
 *
 * Central registry for discovering, registering, and managing agents.
 */

import type { AgentRole, AgentCapability, AgentStatus } from "./types";
import type { BaseAgent } from "./base-agent";
import { MessageBus } from "./message-bus";

export class AgentRegistry {
  private agents: Map<AgentRole, BaseAgent> = new Map();
  private bus: MessageBus;

  constructor(bus?: MessageBus) {
    this.bus = bus || new MessageBus();
  }

  /**
   * Register an agent with the registry.
   */
  register(agent: BaseAgent): void {
    if (this.agents.has(agent.role)) {
      throw new Error(`Agent already registered: ${agent.role}`);
    }
    this.agents.set(agent.role, agent);
  }

  /**
   * Unregister an agent.
   */
  unregister(role: AgentRole): void {
    const agent = this.agents.get(role);
    if (agent) {
      agent.stop();
      this.agents.delete(role);
    }
  }

  /**
   * Get a registered agent by role.
   */
  get(role: AgentRole): BaseAgent | undefined {
    return this.agents.get(role);
  }

  /**
   * Start all registered agents.
   */
  startAll(): void {
    for (const agent of this.agents.values()) {
      agent.start();
    }
  }

  /**
   * Stop all registered agents.
   */
  stopAll(): void {
    for (const agent of this.agents.values()) {
      agent.stop();
    }
  }

  /**
   * Get the shared message bus.
   */
  getBus(): MessageBus {
    return this.bus;
  }

  /**
   * List all registered agents and their capabilities.
   */
  listAgents(): Array<{
    role: AgentRole;
    capabilities: AgentCapability[];
    status: AgentStatus;
  }> {
    return Array.from(this.agents.entries()).map(([role, agent]) => ({
      role,
      capabilities: agent.getCapabilities(),
      status: agent.getStatus(),
    }));
  }

  /**
   * Find agents that have a specific capability.
   */
  findByCapability(capabilityName: string): BaseAgent[] {
    return Array.from(this.agents.values()).filter((agent) =>
      agent.getCapabilities().some((c) => c.name === capabilityName),
    );
  }

  /**
   * Get status of all agents.
   */
  getSystemStatus(): Record<AgentRole, AgentStatus> {
    const status: Partial<Record<AgentRole, AgentStatus>> = {};
    for (const [role, agent] of this.agents) {
      status[role] = agent.getStatus();
    }
    return status as Record<AgentRole, AgentStatus>;
  }
}
