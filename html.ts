import htm from "./deps.ts";
import { isObject, stringify } from "./util.ts";

export type AllowedExpressions =
  | string
  | number
  | boolean
  | null
  | undefined
  | HReturn
  | EventListener
  | Record<string, any>
  | AllowedExpressions[];
export type EventAndListener = { event: string; listener: EventListener };
export type HReturn = {
  element: HTMLElement | SVGElement;
  collection: Collection;
};
type EventListener = (event: any) => any;
type Query = {
  kind: "id" | "class";
  selector: string;
};
type Collection = {
  target: HTMLElement | SVGElement;
  queries: Query[];
  eventsAndListeners: EventAndListener[];
}[];

const SVG_NS = "http://www.w3.org/2000/svg";

function isArrayOfListeners(input: any[]): input is EventListener[] {
  return input.every((i) => typeof i === "function");
}

function isSpecialKey(input: string): input is "id" | "class" {
  return input === "id" || input === "class";
}

export function isHReturn(input: any): input is HReturn {
  return isObject(input) && input.element instanceof Element;
}

export function h(
  type: string,
  props: Record<string, any>,
  ...children: AllowedExpressions[]
): HReturn {
  const eventsAndListeners: EventAndListener[] = [];
  const queries: Query[] = [];
  const collection: Collection = [];
  const element = type === "svg"
    ? document.createElementNS(SVG_NS, "svg")
    : document.createElement(type);
  for (const key in props) {
    if (typeof props[key] === "function") {
      eventsAndListeners.push({ event: key, listener: props[key] });
    } else if (Array.isArray(props[key]) && isArrayOfListeners(props[key])) {
      props[key].forEach((listener: EventListener) =>
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
    element.innerHTML = children.flat(2).reduce<string>(
      (acc, child) => {
        return acc +
          (isHReturn(child) ? child.element.outerHTML : stringify(child));
      },
      "",
    );
  } else {
    for (const child of children.flat(2)) {
      if (isHReturn(child)) {
        collection.push(...child.collection);
        element.appendChild(child.element);
      } else {
        const str = stringify(child);
        if (str) element.appendChild(document.createTextNode(str));
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
 * the hood and works in all modern browsers. The function `html` takes a
 * _tagged template_ and processes the `AllowedExpressions` where _falsy_ values
 * are converted to an empty string and `number`s are _stringified_.
 * The children, who match the `id` and `class` selectors marked with an `@` sign,
 * will be added to the object `this.dom` in the process.
 * It adds `EventListeners` with `addEventListener(event, listener.bind(this))`,
 * so you don't need to use arrow functions anymore.
 */
export const html: (
  strings: TemplateStringsArray,
  ...values: AllowedExpressions[]
) => AllowedExpressions = htm.bind(h);
