import htm from "./deps.js";
import { isObject, stringify } from "./util.js";

/**
 * @typedef {| string
 *   | number
 *   | boolean
 *   | null
 *   | undefined
 *   | HReturn
 *   | EventListener
 *   | Record<string, any>
 *   | AllowedExpressions[]} AllowedExpressions
 * @typedef {{ event: string; listener: EventListener }} EventAndListener
 * @typedef {{
 *   element: HTMLElement | SVGElement;
 *   collection: Collection;
 * }} HReturn
 * @typedef {(event: any) => any} EventListener
 * @typedef {{
 *   kind: "id" | "class";
 *   selector: string;
 * }} Query
 * @typedef {{
 *   target: HTMLElement | SVGElement;
 *   queries: Query[];
 *   eventsAndListeners: EventAndListener[];
 * }[]} Collection
 */

const SVG_NS = "http://www.w3.org/2000/svg";
/** @param {any[]} input
 * @returns {boolean}
 */
function isArrayOfListeners(input) {
  return input.every((i) => typeof i === "function");
}
/** @param {string} input
 * @returns {boolean}
 */
function isSpecialKey(input) {
  return input === "id" || input === "class";
}
/** @param {any} input
 * @returns {boolean}
 */
export function isHReturn(input) {
  return isObject(input) && input.element instanceof Element;
}
/** @param {string} type
 * @param {Record<string, any>} props
 * @param {AllowedExpressions[]} children
 * @returns {import("/home/ubustreet/playground/ts-to-jsdoc/input.ts-to-jsdoc").HReturn}
 */
export function h(type, props, ...children) {
  const eventsAndListeners = [];
  const queries = [];
  const collection = [];
  const element = type === "svg"
    ? document.createElementNS(SVG_NS, "svg")
    : document.createElement(type);
  for (const key in props) {
    if (typeof props[key] === "function") {
      eventsAndListeners.push({ event: key, listener: props[key] });
    } else if (Array.isArray(props[key]) && isArrayOfListeners(props[key])) {
      props[key].forEach((listener) =>
        eventsAndListeners.push({ event: key, listener })
      );
    } else if (key[0] === "@") {
      const idOrClass = key.slice(1);
      if (isSpecialKey(idOrClass)) {
        queries.push({
          kind: idOrClass,
          selector: props[key].replace(/ .*/, ""),
        });
        element.setAttribute(idOrClass, props[key]);
      }
    } else if (props[key] === true) {
      element.setAttribute(key, "");
    } else if (typeof props[key] === "object" && props[key] !== null) {
      element.setAttribute(key, JSON.stringify(props[key]));
    } else if (typeof props[key] === "string") {
      element.setAttribute(key, props[key]);
    } else if (
      props[key] === null || props[key] === false || props[key] === undefined
    ) {
      element.removeAttribute(key);
    }
  }
  // TODO: Improve SVG parsing.
  if (type === "svg") {
    element.innerHTML = children.flat(2).reduce((acc, child) => {
      return acc +
        (isHReturn(child) ? child.element.outerHTML : stringify(child));
    }, "");
  } else {
    for (const child of children.flat(2)) {
      if (isHReturn(child)) {
        collection.push(...child.collection);
        element.appendChild(child.element);
      } else {
        const str = stringify(child);
        if (str) {
          element.appendChild(document.createTextNode(str));
        }
      }
    }
  }
  if (queries.length || eventsAndListeners.length) {
    collection.push({ target: element, queries, eventsAndListeners });
  }
  return { element, collection };
}
/**
 * Uses [htm (Hyperscript Tagged Markup)](https://github.com/developit/htm) under
 * the hood and works in all modern browsers. The function 'html' takes a
 * _tagged template_ and processes the 'AllowedExpressions' where _falsy_ values
 * are converted to an empty string and 'number's are _stringified_.
 * The children, who match the 'id' and 'class' selectors marked with an '@' sign,
 * will be added to the object 'this.dom' in the process.
 * It adds 'EventListeners' with 'addEventListener(event, listener.bind(this))',
 * so you don't need to use arrow functions anymore.
 */
export const html = htm.bind(h);
