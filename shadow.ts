import {
  assertString,
  assertTruthy,
  convertCamelToDash,
  convertDashToCamel,
} from "./util.ts";
import { AllowedExpressions, isHReturn } from "./html.ts";

/**
 * Represents the type of HTML attributes.
 */
export type Attribute = string | null;

export type PropertyAndOptions = {
  property: string;
  reflect?: boolean;
  render?: boolean;
  wait?: boolean;
  assert?: boolean;
};

type Dom = {
  id: Record<string, HTMLElement>;
  class: Record<string, HTMLElement[]>;
};

/**
 * Returns true if the passed value is null. Otherwise it returns false.
 */
function isNull(input: unknown): input is null {
  return input === null;
}

/**
 * This class is the reason why you are here. 
 */
export class Shadow extends HTMLElement {
  private renderingCount = 0;
  private waitingList = new Set<string>();
  private accessorsStore = new Map<string, unknown>();
  private propertiesAndOptions?: Required<PropertyAndOptions[]>;
  /**
   * This boolean will be `true` when `connectedCallback` has been called and all
   * explicitly awaited properties have been set (the `waitingList` is empty).
 */
  connected: boolean = false;
  shadowRoot: ShadowRoot = this.attachShadow({ mode: "open" });
  /**
   * The child elements, which match the id and class selectors marked with the
   * `@` sign, are stored in the `dom` object.
 */
  dom: Dom = { id: {}, class: {} };
  constructor() {
    super();
    if (this.firstUpdated) {
      this.addEventListener(
        "_update",
        (event: Event) => this.firstUpdated!(event),
        { once: true },
      );
    }
    if (this.updated) {
      this.addEventListener("_update", (event: Event) => this.updated!(event));
    }
  }

  /**
   * A native custom elements' [lifecycle callback](https://developer.mozilla.org/en-US/docs/Web/Web_Components/Using_custom_elements).
   * When you use this callback, you probably want to call `super.connectedCallback()`
   * inside of it.
 */
  connectedCallback() {
    this.init(this.propertiesAndOptions || []);
  }

  /**
   * A native custom elements' lifecycle callback. Here, it manages the reflecting
   * of properties to attributes.
 */
  attributeChangedCallback(
    name: string,
    oldValue: Attribute,
    newValue: Attribute,
  ) {
    if (newValue === oldValue) return;
    else return this.update(name, newValue);
  }

  /**
 * Sets or removes attributes.
 */
  private updateAttribute(attributeName: string, value: unknown): void {
    if (value === null) return this.removeAttribute(attributeName);
    else {
      return typeof value === "string"
        ? this.setAttribute(attributeName, value)
        : this.setAttribute(attributeName, JSON.stringify(value));
    }
  }

  /**
   * Call this method in 'connectedCallback' if you want to avoid using the
   * 'property' decorator. It assigns the accessors to the element's properties
   * and starts rendering. The arguments are explained next to the `property` 
   * decorator.
   */
  init(propertiesAndOptions: PropertyAndOptions[]): void {
    propertiesAndOptions.forEach((
      {
        property,
        reflect = true,
        render = true,
        wait = false,
        assert = false,
      }: PropertyAndOptions,
    ) => {
      if (wait && !this.connected) {
        this.waitingList.add(property);
      } else if (assert) {
        assertTruthy(
          (this as any)[property],
          `The property ${property} must have a truthy value.`,
        );
      }

      this.accessorsStore.set(property, (this as any)[property]);

      if (reflect && isNull(this.getAttribute(property))) {
        this.updateAttribute(
          convertCamelToDash(property),
          (this as any)[property],
        );
      }

      Object.defineProperty(this, property, {
        get: () => this.accessorsStore.get(property),
        set: (value: unknown) => {
          const attributeName = convertCamelToDash(property);
          const attributeValue = this.getAttribute(attributeName);
          this.accessorsStore.set(property, value);
          if (wait) {
            this.waitingList.delete(property);
            if (assert) {
              assertTruthy(
                (this as any)[property],
                `The property ${property} must have a truthy value.`,
              );
            }
            if (this.waitingList.size === 0) {
              if (!this.connected) this.connected = true;
            }
          }
          if (
            reflect &&
            attributeValue !== value &&
            attributeValue !== JSON.stringify(value)
          ) {
            this.updateAttribute(attributeName, value);
          }
          if (this.connected && render) {
            this.actuallyRender();
          }
        },
      });
    });
    if (this.waitingList.size === 0) {
      if (!this.connected) this.connected = true;
      this.actuallyRender();
    }
  }

  /**
 * Compares and reflects properties to attributes.
 */
  update(name: string, newValue: Attribute): void {
    const property = convertDashToCamel(name);
    assertTruthy(property in this, `The property '${property}' doen't exist.`);
    if (
      (this as any)[property] !== newValue &&
      JSON.stringify((this as any)[property]) !== newValue
    ) {
      try {
        (this as any)[property] = isNull(newValue)
          ? newValue
          : JSON.parse(newValue);
      } catch {
        (this as any)[property] = newValue;
      }
    }
  }

  private createFragment(...input: AllowedExpressions[]): DocumentFragment {
    const documentFragment = document.createDocumentFragment();
    input.flat(2).forEach((data) => {
      if (isHReturn(data)) {
        const { element, collection } = data;
        documentFragment.appendChild(element);
        collection.forEach(({ target, queries, eventsAndListeners }) => {
          queries.forEach(({ kind, selector }) =>
            kind === "id"
              ? this.dom.id[selector] = target as HTMLElement
              : this.dom.class[selector]
              ? this.dom.class[selector].push(target as HTMLElement)
              : this.dom.class[selector] = [target as HTMLElement]
          );
          eventsAndListeners.forEach(({ event, listener }) =>
            target.addEventListener(event, listener.bind(this))
          );
        });
      } else {
        documentFragment.appendChild(
          document.createTextNode(assertString(data)),
        );
      }
    });
    return documentFragment;
  }
  /**
 * Calls the this.render() function, processes its return value and dispatches 
 * the event `_update`.
 */

  private actuallyRender(): void {
    if (this.renderingCount > 0) this.dom = { id: {}, class: {} };
    const documentFragment = this.createFragment(this.render!());
    while (this.shadowRoot.firstChild) {
      this.shadowRoot.removeChild(this.shadowRoot.firstChild);
    }
    this.shadowRoot.appendChild(documentFragment);
    (this.constructor as typeof Shadow).styles.forEach((template) =>
      this.shadowRoot.append(template.content.cloneNode(true))
    );
    this.dispatchEvent(new CustomEvent("_update"));
    this.renderingCount++;
  }

  /**
   * Is called by the method `actuallyRender` which renders the custom element.
   * It must return the return type of the function `html` which is
   * `AllowedExpressions`.
 */
  render?(): AllowedExpressions;

  /**
   * A modifiable lifecycle callback which is called after the first update which
   * includes rendering.
 */
  firstUpdated?(event: Event): void;

  /**
   * A modifiable lifecycle callback which is called after each update which
   * includes rendering.
 */
  updated?(event: Event): void;

  /**
   * The return type of the function `css`, which is an array of HTMLTemplateElements
   * containing a script element, is assigned to this static property.
  */
  static styles: HTMLTemplateElement[] = [];

  /**
   * The decorator `customElement` - if used - sets this static property to the 
   * custom element's tag name automatically.
 */
  static is?: string;
}
