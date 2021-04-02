import { assertTruthy, convertCamelToDash, ShadowError } from "./util.ts";

import type { PropertyAndOptions } from "./shadow.ts";

export type Constructor<T> = {
  new (...args: any[]): T;
};

/**
 * The `customElement` decorator takes the tag name of the custom element and 
 * registers the custom element.
 * The same tag name is assigned to the static `is` property.
 */
export function customElement(
  tagName: string,
): (clazz: Constructor<HTMLElement>) => void {
  return (clazz: Constructor<HTMLElement>) => {
    assertTruthy(
      typeof clazz === "function",
      "Something went wrong with the 'customElement' decorator.",
    );
    Object.defineProperty(clazz, "is", {
      value: tagName,
    });
    window.customElements.define(tagName, clazz);
    return clazz;
  };
}

/**
 * The `property` decorator takes an optional object as argument with three
 * optional properties:
 * - Setting `reflect` to false would stop the element's attribute from synchronising.
 * - If you plan to use properties instead of attributes as data input, setting `wait`
 *   to true would reduce the amount of renderings from 2 to 1 (you can just ignore it).
 * - The `assert` boolean checks if the input has a truthy value.
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
    assertTruthy(name, "The property name must be a non-empty string");

    if (reflect === true) {
      const observedAttributesArray =
        (protoOrDescriptor.constructor as any).observedAttributes || [];
      observedAttributesArray.push(
        convertCamelToDash(name),
      );

      Object.defineProperty(
        protoOrDescriptor.constructor as any,
        "observedAttributes",
        {
          enumerable: true,
          configurable: true,
          get() {
            return observedAttributesArray;
          },
        },
      );
    }

    if (!(protoOrDescriptor as any).propertiesAndOptions) {
      Object.defineProperty(
        protoOrDescriptor,
        "propertiesAndOptions",
        {
          enumerable: false,
          configurable: true,
          writable: false,
          value: [],
        },
      );
    }

    (protoOrDescriptor as any).propertiesAndOptions!.push({
      property: name,
      reflect,
      render,
      wait,
      assert,
    });
  };
}
