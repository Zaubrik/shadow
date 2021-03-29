// @deno-types="https://raw.githubusercontent.com/developit/htm/master/src/index.d.ts"
import htm from "https://unpkg.com/htm@3.0.4/dist/htm.module.js?module";
import { assertString } from "./util.ts";

export type AllowedExpressions =
  | string
  | number
  | false
  | null
  | HReturn
  | EventListener
  | AllowedExpressions[];
export type EventAndListener = { event: string; listener: EventListener };
type EventListener = (event: any) => any;
type Query = {
  kind: "id" | "class";
  selector: string;
};
type Collection = {
  target: HTMLElement;
  queries: Query[];
  eventsAndListeners: EventAndListener[];
}[];
type HReturn = { element: HTMLElement; collection: Collection };

function isArrayOfListeners(input: any[]): input is EventListener[] {
  return input.every((i) => typeof i === "function");
}

export function isHReturn(input: any): input is HReturn {
  return input?.element instanceof HTMLElement;
}

export function h(
  type: string,
  props: Record<string, any>,
  ...children: AllowedExpressions[]
): HReturn {
  const eventsAndListeners: EventAndListener[] = [];
  const queries: Query[] = [];
  const collection: Collection = [];
  const element = document.createElement(type);
  for (const key in props) {
    if (typeof props[key] === "function") {
      eventsAndListeners.push({ event: key, listener: props[key] });
    } else if (Array.isArray(props[key]) && isArrayOfListeners(props[key])) {
      props[key].forEach((listener: EventListener) =>
        eventsAndListeners.push({ event: key, listener: props[key] })
      );
    } else if (key === "@id" || key === "@class") {
      const idOrClass = key.slice(1) as "id" | "class";
      queries.push({
        kind: idOrClass,
        selector: props[key],
      });
      element.setAttribute(idOrClass, props[key]);
    } else if (props[key] === true) {
      element.setAttribute(key, "");
    } else if (props[key] !== null) {
      element.setAttribute(key, props[key]);
    }
  }
  for (const child of children.flat(2)) {
    if (isHReturn(child)) {
      collection.push(...child.collection);
      element.appendChild(child.element);
    } else {
      element.appendChild(document.createTextNode(assertString(child)));
    }
  }
  collection.push({ target: element, queries, eventsAndListeners });
  return { element, collection };
}

/**
 * Uses [htm (Hyperscript Tagged Markup)](https://github.com/developit/htm) under
 * the hood which uses standard JavaScript Tagged Templates and works in all modern
 * browsers. The function `html` takes a _tagged template_ and processes the
 * `AllowedExpressions` where `false` and `null` are converted to an empty string
 * and the `numbers` are _stringified_.
 * The elements matching the id and class selectors marked with an `@` sign will
 * later be added to the `this.dom` object.
 * We add the `EventListeners` with `addEventListener(event, listener.bind(this))`
 * so that you don't need to use arrow functions anymore.
 */
export const html: (
  strings: TemplateStringsArray,
  ...values: AllowedExpressions[]
) => AllowedExpressions = htm.bind(h);
