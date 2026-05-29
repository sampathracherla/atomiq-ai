/**
 * Atomiq AI — Message Bus
 *
 * Event-driven communication layer between agents.
 * Supports publish/subscribe, direct messaging, and request/reply patterns.
 */

import type { AgentMessage, AgentRole, MessageType } from "./types";

type MessageHandler = (message: AgentMessage) => void | Promise<void>;

export class MessageBus {
  private subscribers: Map<string, MessageHandler[]> = new Map();
  private messageLog: AgentMessage[] = [];
  private static idCounter = 0;

  /**
   * Subscribe to messages for a specific agent role.
   */
  subscribe(
    role: AgentRole | "broadcast",
    handler: MessageHandler,
  ): () => void {
    const existing = this.subscribers.get(role) || [];
    existing.push(handler);
    this.subscribers.set(role, existing);

    // Return unsubscribe function
    return () => {
      const handlers = this.subscribers.get(role) || [];
      const idx = handlers.indexOf(handler);
      if (idx >= 0) handlers.splice(idx, 1);
    };
  }

  /**
   * Publish a message to a specific agent or broadcast.
   */
  async publish(message: AgentMessage): Promise<void> {
    this.messageLog.push(message);

    // Deliver to target
    const targetHandlers = this.subscribers.get(message.to) || [];
    for (const handler of targetHandlers) {
      await handler(message);
    }

    // Also deliver to broadcast subscribers if not already broadcast
    if (message.to !== "broadcast") {
      const broadcastHandlers = this.subscribers.get("broadcast") || [];
      for (const handler of broadcastHandlers) {
        await handler(message);
      }
    }
  }

  /**
   * Send a task message and wait for a result response.
   */
  async request(
    from: AgentRole,
    to: AgentRole,
    payload: unknown,
    timeout = 60000,
  ): Promise<AgentMessage> {
    const correlationId = this.generateId();

    const message: AgentMessage = {
      id: this.generateId(),
      type: "task",
      from,
      to,
      payload,
      timestamp: Date.now(),
      correlationId,
    };

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        unsubscribe();
        reject(new Error(`Request timeout: ${from} → ${to} (${timeout}ms)`));
      }, timeout);

      const unsubscribe = this.subscribe(from, (response) => {
        if (
          response.correlationId === correlationId &&
          response.type === "result"
        ) {
          clearTimeout(timer);
          unsubscribe();
          resolve(response);
        }
      });

      this.publish(message);
    });
  }

  /**
   * Create a standard message.
   */
  createMessage(
    type: MessageType,
    from: AgentRole,
    to: AgentRole | "broadcast",
    payload: unknown,
    correlationId?: string,
  ): AgentMessage {
    return {
      id: this.generateId(),
      type,
      from,
      to,
      payload,
      timestamp: Date.now(),
      correlationId,
    };
  }

  /**
   * Get message history (for debugging/reporting).
   */
  getHistory(limit?: number): AgentMessage[] {
    return limit ? this.messageLog.slice(-limit) : [...this.messageLog];
  }

  /**
   * Clear message history.
   */
  clearHistory(): void {
    this.messageLog = [];
  }

  private generateId(): string {
    return `msg_${Date.now()}_${++MessageBus.idCounter}`;
  }
}
