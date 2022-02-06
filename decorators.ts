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
 * 2. If you don't want the changing of the property to cause a rerendering, then
 *    set `render` to `false`.
 * 3. If you use properties instead of attributes as data input, setting `wait`
 * to `true` reduces the amount of renderings because it waits for the property's
 * assignment (practically, you can just ignore it).
 * 4. The boolean `assert` checks if the input has a *truthy* value. Otherwise it
 * throws an `ShadowError`.
 * It also adds an array containing the names of the attributes you want to observe
 * with the [lifecycle callback](https://developer.mozilla.org/en-US/docs/Web/Web_Components/Using_custom_elements)
 * `attributeChangedCallback`.
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
    if (!(protoOrDescriptor.constructor as any).observedAttributes) {
      (protoOrDescriptor.constructor as any).observedAttributes = [];
    }
    if (reflect === true) {
      (protoOrDescriptor.constructor as any).observedAttributes.push(
        convertCamelToDash(name),
      );
    }
    if (!(protoOrDescriptor as any).__propertiesAndOptions) {
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
