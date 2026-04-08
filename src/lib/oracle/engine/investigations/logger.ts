import type {
  InvestigationLogEntry,
  InvestigationLogLevel,
} from "../types";

/**
 * Investigation logger.
 *
 * The orchestrator and agents push entries here as the investigation
 * progresses. The collected log is attached to the final Investigation
 * object so the UI can render the activity timeline and the audit trail
 * is preserved.
 */
export class InvestigationLogger {
  private entries: InvestigationLogEntry[] = [];

  log(
    source: string,
    level: InvestigationLogLevel,
    message: string,
    data?: Record<string, unknown>,
  ): void {
    this.entries.push({
      at: new Date().toISOString(),
      level,
      source,
      message,
      data,
    });
  }

  info(source: string, message: string, data?: Record<string, unknown>) {
    this.log(source, "info", message, data);
  }

  warn(source: string, message: string, data?: Record<string, unknown>) {
    this.log(source, "warn", message, data);
  }

  error(source: string, message: string, data?: Record<string, unknown>) {
    this.log(source, "error", message, data);
  }

  debug(source: string, message: string, data?: Record<string, unknown>) {
    this.log(source, "debug", message, data);
  }

  flush(): InvestigationLogEntry[] {
    return [...this.entries];
  }
}
