export interface LogContext {
  [key: string]: unknown;
}

function error(err: unknown, context?: LogContext): void {
  if (context) {
    console.error(err, context);
  } else {
    console.error(err);
  }
}

function warn(message: string, context?: LogContext): void {
  if (!__DEV__) {
    return;
  }
  if (context) {
    console.warn(message, context);
  } else {
    console.warn(message);
  }
}

function info(message: string, context?: LogContext): void {
  if (!__DEV__) {
    return;
  }
  if (context) {
    console.info(message, context);
  } else {
    console.info(message);
  }
}

export const logger = { error, warn, info };
