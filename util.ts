export function convertDashToCamel(str: string) {
  return str.replace(/-([a-z0-9])/g, (g: string) => g[1].toUpperCase());
}

export function convertCamelToDash(str: string) {
  return str.replace(/([a-zA-Z0-9])(?=[A-Z])/g, "$1-").toLowerCase();
}

export function stringify(input: unknown): string {
  return typeof input === "string"
    ? input
    : typeof input === "number"
    ? input.toString()
    : "";
}

export function isNull(input: unknown): input is null {
  return input === null;
}
