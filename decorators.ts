// deno-lint-ignore-file no-explicit-any
import { convertCamelToDash } from "./util.ts";

import type { PropertyAndOptions } from "./shadow.ts";

type Constructor<T> = {
  new (...args: any[]): T;
};

/**
 * The decorator `customElement` takes the tag name of the custom element and
 * registers the custom element. The same tag name is assigned to the static
 * `is` property.
 */
export function customElement(
  tagName: string,
): (clazz: Constructor<HTMLElement>) => void {
  return (clazz: Constructor<HTMLElement>) => {
    Object.defineProperty(clazz, "is", {
      value: tagName,
    });
    window.customElements.define(tagName, clazz);
    return clazz;
  };
}

/**
 * The decorator `property` takes an optional object as argument with four
 * optional properties:
 * 1. Setting `reflect` to `false` would stop the element's attribute from synchronising.
 * 2. Stop rerendering on property change by setting `render` to `false`.
 * 3. Wait for property assignment before rendering with the option `wait`.
 * 4. Check with `assert` if the input has a *truthy* value. Otherwise throw error.
 * It also adds an array containing the names of the attributes you want to observe
 * with the native lifecycle callback `attributeChangedCallback`.
 */
export function property({
  reflect = true,
  render = true,
  wait = false,
  assert = false,
}: Omit<PropertyAndOptions, "property"> = {}): (
  protoOrDescriptor: HTMLElement,
  name: string,
) => void {
  return (protoOrDescriptor: HTMLElement, name: string) => {
    if (
      (protoOrDescriptor.constructor as any).observedAttributes === undefined
    ) {
      (protoOrDescriptor.constructor as any).observedAttributes = [];
    }
    if (reflect === true) {
      (protoOrDescriptor.constructor as any).observedAttributes.push(
        convertCamelToDash(name),
      );
    }
    if ((protoOrDescriptor as any).__propertiesAndOptions === undefined) {
      Object.defineProperty(
        protoOrDescriptor,
        "__propertiesAndOptions",
        {
          enumerable: false,
          configurable: true,
          writable: false,
          value: [],
        },
      );
    }

    (protoOrDescriptor as any).__propertiesAndOptions.push({
      property: name,
      reflect,
      render,
      wait,
      assert,
    });
  };
}
