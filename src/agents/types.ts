/**
 * Atomiq AI — Agent Types
 *
 * Type definitions for the agentic orchestration layer.
 */

export type AgentRole =
  | "supervisor"
  | "planner"
  | "web"
  | "api"
  | "mobile"
  | "sap"
  | "healer"
  | "report";

export type TaskStatus =
  | "pending"
  | "in-progress"
  | "completed"
  | "failed"
  | "cancelled";

export type MessageType = "task" | "result" | "event" | "query" | "command";

export interface AgentMessage {
  id: string;
  type: MessageType;
  from: AgentRole;
  to: AgentRole | "broadcast";
  payload: unknown;
  timestamp: number;
  correlationId?: string;
}

export interface Task {
  id: string;
  type: string;
  description: string;
  assignedTo?: AgentRole;
  status: TaskStatus;
  input: Record<string, unknown>;
  output?: TaskResult;
  createdAt: number;
  completedAt?: number;
  parentTaskId?: string;
  subtasks?: string[];
}

export interface TaskResult {
  success: boolean;
  data?: unknown;
  error?: string;
  metrics?: TaskMetrics;
}

export interface TaskMetrics {
  duration: number;
  testsRun?: number;
  testsPassed?: number;
  testsFailed?: number;
  healingAttempts?: number;
  healingSuccesses?: number;
}

export interface AgentCapability {
  name: string;
  description: string;
  inputSchema?: Record<string, string>;
}

export interface AgentStatus {
  role: AgentRole;
  state: "idle" | "busy" | "error";
  currentTask?: string;
  completedTasks: number;
  failedTasks: number;
  lastActivity: number;
}
