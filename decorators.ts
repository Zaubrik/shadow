import { convertCamelToDash, ShadowError } from "./util.ts";

import type { PropertyAndOptions } from "./shadow.ts";

export type Constructor<T> = {
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
    if (typeof clazz === "function") {
      Object.defineProperty(clazz, "is", {
        value: tagName,
      });
      window.customElements.define(tagName, clazz);
      return clazz;
    } else {
      throw new ShadowError(
        "Something went wrong with the decorator 'customElement'.",
      );
    }
  };
}

/**
 * The decorator `property` takes an optional object as argument with four
 * optional properties:
 * 1. Setting `reflect` to false would stop the element's attribute from synchronising.
 * 2. If you don't want the changing of the property to cause a rerendering, then
 *    set `render` to false.
 * 3. If you use properties instead of attributes as data input, setting `wait`
 * to true would reduce the amount of renderings because it waits for the property's
 * assignment (practically, you can just ignore it).
 * 4. The boolean `assert` checks if the input has a truthy value. Otherwise it
 * throws an `ShadowError`.
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
    if (name.length < 3) {
      throw new ShadowError(`The property's name '${name}' is too short.`);
    }
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

    if (!(protoOrDescriptor as any)._propertiesAndOptions) {
      Object.defineProperty(
        protoOrDescriptor,
        "_propertiesAndOptions",
        {
          enumerable: false,
          configurable: true,
          writable: false,
          value: [],
        },
      );
    }

    (protoOrDescriptor as any)._propertiesAndOptions.push({
      property: name,
      reflect,
      render,
      wait,
      assert,
    });
  };
}
