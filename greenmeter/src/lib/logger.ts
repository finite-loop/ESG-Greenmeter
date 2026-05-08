import { AsyncLocalStorage } from "node:async_hooks";

export interface LogContext {
  correlationId: string;
  tenantId?: string;
  userId?: string;
}

interface LogEntry {
  timestamp: string;
  level: "info" | "warn" | "error";
  message: string;
  correlationId?: string;
  tenantId?: string;
  userId?: string;
  [key: string]: unknown;
}

const RESERVED_KEYS = new Set([
  "timestamp",
  "level",
  "message",
  "correlationId",
  "tenantId",
  "userId",
]);

const contextStorage = new AsyncLocalStorage<LogContext>();

function buildEntry(
  level: LogEntry["level"],
  message: string,
  extra?: Record<string, unknown>
): LogEntry {
  const ctx = contextStorage.getStore();

  // Filter out reserved keys from extra to prevent overwriting structural fields
  let safeExtra: Record<string, unknown> | undefined;
  if (extra) {
    safeExtra = {};
    for (const [key, value] of Object.entries(extra)) {
      if (!RESERVED_KEYS.has(key)) {
        safeExtra[key] = value;
      }
    }
  }

  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...(ctx?.correlationId && { correlationId: ctx.correlationId }),
    ...(ctx?.tenantId && { tenantId: ctx.tenantId }),
    ...(ctx?.userId && { userId: ctx.userId }),
    ...safeExtra,
  };
  return entry;
}

function safeStringify(entry: LogEntry): string {
  try {
    return JSON.stringify(entry);
  } catch {
    // Fallback for circular references or other stringify failures
    return JSON.stringify({
      timestamp: entry.timestamp,
      level: entry.level,
      message: entry.message,
      correlationId: entry.correlationId,
      tenantId: entry.tenantId,
      userId: entry.userId,
      serializationError: "Failed to serialize log entry extras",
    });
  }
}

function formatEntry(entry: LogEntry): string {
  if (process.env.NODE_ENV === "development") {
    const { timestamp, level, message, correlationId, ...rest } = entry;
    const extra = Object.keys(rest).length > 0 ? ` ${JSON.stringify(rest)}` : "";
    return `[${timestamp}] ${level.toUpperCase()} ${message}${correlationId ? ` (${correlationId})` : ""}${extra}`;
  }
  return safeStringify(entry);
}

export const logger = {
  info(message: string, extra?: Record<string, unknown>): void {
    const entry = buildEntry("info", message, extra);
    // eslint-disable-next-line no-console
    console.log(formatEntry(entry));
  },

  warn(message: string, extra?: Record<string, unknown>): void {
    const entry = buildEntry("warn", message, extra);
    // eslint-disable-next-line no-console
    console.warn(formatEntry(entry));
  },

  error(message: string, extra?: Record<string, unknown>): void {
    const entry = buildEntry("error", message, extra);
    // eslint-disable-next-line no-console
    console.error(formatEntry(entry));
  },
};

/**
 * Run a function within a logging context. All logger calls inside `fn`
 * will automatically include the correlationId, tenantId, and userId.
 */
export function runWithContext<T>(ctx: LogContext, fn: () => T): T {
  return contextStorage.run(ctx, fn);
}

/**
 * Returns the underlying AsyncLocalStorage instance for advanced use cases
 * (e.g., wrapping async request handlers in middleware).
 */
export function getContextStore(): AsyncLocalStorage<LogContext> {
  return contextStorage;
}
