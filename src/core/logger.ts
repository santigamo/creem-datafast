import type { LoggerLike } from "./types.js";

const noop = () => undefined;

export const noopLogger: LoggerLike = {
  debug: noop,
  info: noop,
  warn: noop,
  error: noop
};

export function resolveLogger(logger?: LoggerLike): LoggerLike {
  return logger ?? noopLogger;
}
