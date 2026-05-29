/**
 * Structured logger with levels and contextual metadata.
 */

type LogLevel = "debug" | "info" | "warn" | "error";

const LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};
const LEVEL_COLORS: Record<LogLevel, string> = {
  debug: "\x1b[36m",
  info: "\x1b[32m",
  warn: "\x1b[33m",
  error: "\x1b[31m",
};
const RESET = "\x1b[0m";

export class Logger {
  private level: LogLevel;
  private context: string;

  constructor(context: string, level: LogLevel = "info") {
    this.context = context;
    this.level = level;
  }

  private shouldLog(level: LogLevel): boolean {
    return LEVEL_PRIORITY[level] >= LEVEL_PRIORITY[this.level];
  }

  private format(
    level: LogLevel,
    message: string,
    meta?: Record<string, unknown>,
  ): string {
    const timestamp = new Date().toISOString();
    const color = LEVEL_COLORS[level];
    const metaStr = meta ? ` ${JSON.stringify(meta)}` : "";
    return `${color}[${timestamp}] [${level.toUpperCase()}] [${this.context}]${RESET} ${message}${metaStr}`;
  }

  debug(message: string, meta?: Record<string, unknown>): void {
    if (this.shouldLog("debug"))
      console.debug(this.format("debug", message, meta));
  }

  info(message: string, meta?: Record<string, unknown>): void {
    if (this.shouldLog("info"))
      console.info(this.format("info", message, meta));
  }

  warn(message: string, meta?: Record<string, unknown>): void {
    if (this.shouldLog("warn"))
      console.warn(this.format("warn", message, meta));
  }

  error(message: string, meta?: Record<string, unknown>): void {
    if (this.shouldLog("error"))
      console.error(this.format("error", message, meta));
  }

  child(childContext: string): Logger {
    return new Logger(`${this.context}:${childContext}`, this.level);
  }

  setLevel(level: LogLevel): void {
    this.level = level;
  }
}

/** Global logger instance */
export const logger = new Logger("atomiq-ai");
