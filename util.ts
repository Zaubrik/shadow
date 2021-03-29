export function convertDashToCamel(str: string) {
  return str.replace(/-([a-z0-9])/g, (g: string) => g[1].toUpperCase());
}

export function convertCamelToDash(str: string) {
  return str.replace(/([a-zA-Z0-9])(?=[A-Z])/g, "$1-").toLowerCase();
}

/**
 * Throws an error if the passed expression is falsey.
 */
export function assertTruthy(expr: unknown, msg = ""): asserts expr {
  if (!expr) {
    throw new ShadowError(msg);
  }
}

export function assertString(input: unknown): string {
  return typeof input === "string"
    ? input
    : typeof input === "number"
    ? input.toString()
    : "";
}

export class ShadowError extends Error {
  constructor(message: string) {
    super(message);
    this.message = message;
    this.name = this.constructor.name;
  }
}
