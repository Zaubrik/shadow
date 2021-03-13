export function convertDashToCamel(str: string) {
  return str.replace(/-([a-z0-9])/g, (g: string) => g[1].toUpperCase());
}

export function convertCamelToDash(str: string) {
  return str.replace(/([a-zA-Z0-9])(?=[A-Z])/g, "$1-").toLowerCase();
}

/**
 * Returns an `HTMLTemplateElement` created with the passed html string. 
 */
export function createHtmlTemplate(html: string): HTMLTemplateElement {
  const template = document.createElement("template");
  template.innerHTML = html.trim();
  return template;
}

export class ShadowError extends Error {
  constructor(message: string) {
    super(message);
    this.message = message;
    this.name = this.constructor.name;
  }
}
