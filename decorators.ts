import { convertCamelToDash, ShadowError } from "./util.ts";

export type PropertyOptions = {
  reflect?: boolean;
  wait?: boolean;
  assert?: boolean;
};

export type Constructor<T> = {
  new (...args: any[]): T;
};

/**
 * The `customElement` decorator takes the tag name of the custom element and 
 * registers the custom element.
 * If no tag name is passed, the class name is used instead through converting 
 * it from CamelCase to dash-case. The same tag name is assigned to the static 
 * `is` property.
 */
export function customElement(
  tagName = "",
): (clazz: Constructor<HTMLElement>) => void {
  return (clazz: Constructor<HTMLElement>) => {
    if (typeof clazz === "function") {
      /*
        * NOTE: the replace method is necessary here because the deno bundler 
        * seems to add numbers occasionally
        */
      tagName = tagName
        ? tagName
        : convertCamelToDash(clazz.name.replace(/\d+$/, ""));
      console.log("bbbbbbbb", clazz, tagName);
      Object.defineProperty(clazz, "is", {
        value: tagName,
      });
      window.customElements.define(tagName, clazz);
      return clazz as any;
    } else {
      throw new ShadowError(
        "Something went wrong with the 'customElement' decorator.",
      );
    }
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
  wait = false,
  assert = false,
}: PropertyOptions = {}): (
  protoOrDescriptor: HTMLElement,
  name: string,
) => void {
  return (protoOrDescriptor: HTMLElement, name: string) => {
    if (!name) {
      throw new ShadowError(
        "the property name must be a non-empty string",
      );
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

    if (!(protoOrDescriptor as any).argsFromPropertyDecorator) {
      Object.defineProperty(
        protoOrDescriptor,
        "argsFromPropertyDecorator",
        {
          enumerable: false,
          configurable: true,
          writable: false,
          value: [],
        },
      );
    }

    (protoOrDescriptor as any).argsFromPropertyDecorator!.push({
      property: name,
      reflect,
      wait,
      assert,
    });
  };
}
