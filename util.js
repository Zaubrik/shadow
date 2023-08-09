/**
 * @param {string} str
 * @returns {string}
 */
export function convertDashToCamel(str) {
  return str.replace(/-([a-z0-9])/g, (g) => g[1].toUpperCase());
}

/**
 * @param {string} str
 * @returns {string}
 */
export function convertCamelToDash(str) {
  return str.replace(/([a-zA-Z0-9])(?=[A-Z])/g, "$1-").toLowerCase();
}

/**
 * @param {string} html
 * @returns {HTMLTemplateElement}
 */
export function createTemplate(html) {
  const template = document.createElement("template");
  template.innerHTML = html;
  return template;
}

/**
 * @param {unknown} input
 * @returns {string}
 */
export function stringify(input) {
  return typeof input === "string"
    ? input
    : typeof input === "number"
    ? input.toString()
    : "";
}

/**
 * @param {unknown} input
 * @returns {input is string}
 */
export function isString(input) {
  return typeof input === "string";
}

/**
 * @param {unknown} input
 * @returns {input is null}
 */
export function isNull(input) {
  return input === null;
}

/**
 * @param {unknown} input
 * @returns {boolean}
 */
export function isNotNull(input) {
  return input !== null;
}

/**
 * @param {unknown} input
 * @returns {input is true}
 */
export function isTrue(input) {
  return input === true;
}

/**
 * @param {unknown} input
 * @returns {input is false}
 */
export function isFalse(input) {
  return input === false;
}

/**
 * @param {unknown} obj
 * @returns {obj is Record<string, unknown>}
 */
export function isObject(obj) {
  return (obj !== null && typeof obj === "object" &&
    Array.isArray(obj) === false);
}

/**
 * @param {unknown} input
 * @returns {input is HTMLElement}
 */
export function isHtmlElement(input) {
  return input instanceof HTMLElement;
}

/**
 * isTemplate.
 * @param {unknown} input
 * @returns {input is HTMLTemplateElement}
 */
export function isTemplate(input) {
  return input instanceof HTMLTemplateElement;
}

/**
 * removeJwt.
 *
 * @param {string} keyName
 */
export function removeJwt(keyName) {
  window.localStorage.removeItem(keyName);
}

/**
 * getJwt.
 *
 * @param {string} keyName
 */
export function getJwt(keyName) {
  return window.localStorage.getItem(keyName);
}

/**
 * goHome.
 */
export function goHome() {
  window.location.href = window.location.origin;
}
