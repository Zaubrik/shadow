import { convertCamelToDash, convertDashToCamel, ShadowError } from "./util.ts";

import type { EventsAndListeners, Html } from "./html.ts";
import type { PropertyOptions } from "./decorators.ts";

/**
 * Represents the type of HTML attributes.
 */
export type Attribute = string | null;
type PropertyAndPropertyOptions = {
  property: string;
} & PropertyOptions;
type Dom = {
  id: Record<string, HTMLElement>;
  class: Record<string, HTMLElement[]>;
};

/**
 * Throws an error if the passed expression is falsey.
 */
function assertTruthy(expr: unknown, msg = ""): asserts expr {
  if (!expr) {
    throw new ShadowError(msg);
  }
}

/**
 * Returns true if the passed value is an HTMLTemplateElement. Otherwise it 
 * returns false.
 */
function isHTMLElement(element: unknown): element is HTMLElement {
  return element instanceof HTMLElement;
}

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
  private waitingList = new Set<string>();
  private accessorsStore = new Map<string, unknown>();
  readonly argsFromPropertyDecorator?: Required<PropertyAndPropertyOptions[]>;
  /**
   * This boolean will be `true` when `connectedCallback` has been called and all
   * explicitly awaited properties have been set (the `waitingList` is empty).
 */
  connected: boolean = false;
  shadowRoot!: ShadowRoot;
  /**
 * In the dom object are the child elements stored which match the selectors you 
 * marked with the `@` sign in the html string.
 */
  dom: Dom = { id: {}, class: {} };

  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    if (this.firstUpdated) {
      this.addEventListener("_update", () => {
        this.firstUpdated!();
      }, { once: true });
    }
    if (this.updated) {
      this.addEventListener("_update", () => {
        this.updated!();
      });
    }
  }

  /**
   * A native custom elements' [lifecycle callback](https://developer.mozilla.org/en-US/docs/Web/Web_Components/Using_custom_elements).
   * If you want to modify this callback you must call `super.connectedCallback()`
   * inside of it.
 */
  connectedCallback() {
    if (this.argsFromPropertyDecorator) {
      this.init(this.argsFromPropertyDecorator);
    }
    if (this.waitingList.size === 0) {
      this.connected = true;
      this.actuallyRender();
    }
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
    else {
      return this.connected
        ? this.update(name, newValue, true)
        : this.update(name, newValue, false);
    }
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
   * Assigns the accessors to the element's properties and initializes the
   * lifecycle while considering the conditions coming from the `property` decorator.
   * You will never need to use this method if you use the `property` decorator.
  */
  init(properties: PropertyAndPropertyOptions[]): void {
    return properties.forEach((
      {
        property,
        reflect,
        wait,
        assert,
      }: PropertyAndPropertyOptions,
    ) => {
      if (wait) {
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
              this.connected = true;
            }
          }
          if (this.connected && !reflect) {
            this.actuallyRender();
          } else if (
            reflect &&
            attributeValue !== value &&
            attributeValue !== JSON.stringify(value)
          ) {
            this.updateAttribute(attributeName, value);
          }
        },
      });
    });
  }

  /**
 * Reflects properties to attributes and calls `actuallyRender` if the optional 
 * boolean `isRendering` is true (default: true).
 */
  update(name: string, newValue: Attribute, isRendering = true): void {
    const property = convertDashToCamel(name);
    assertTruthy(
      property in this,
      `The property '${property}' does not exist.`,
    );
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
    if (isRendering) {
      assertTruthy(this.connected, "The method 'update' was called too early.");
      this.actuallyRender();
    }
  }

  /**
 * Calls the this.render() function, processes its return value and dispatches 
 * the event `_update`.
 */
  private actuallyRender(): void {
    const {
      htmlString,
      selectorAndKindAndEvents,
    } = this.render();
    this.shadowRoot.innerHTML = htmlString;
    (this.constructor as typeof Shadow).styles.forEach((template) =>
      this.shadowRoot.append(template.content.cloneNode(true))
    );
    selectorAndKindAndEvents.forEach(
      ({ kind, selector, eventsAndListeners }) => {
        this.addEventListeners(
          kind === "id"
            ? this.processIdSelectors(selector)
            : this.processClassSelectors(selector),
          eventsAndListeners,
        );
      },
    );
    this.dispatchEvent(new CustomEvent("_update"));
  }

  /**
 * Adds the shadowRoot's child elements which match the id selector to the 
 * this.dom.id object.
 */
  private processIdSelectors(selector: string): HTMLElement[] {
    const element = this.shadowRoot.getElementById(selector);
    if (isHTMLElement(element)) {
      return [this.dom.id[selector] = element];
    } else {
      throw new ShadowError(
        `No HTMLElement with id selector '${selector}'.`,
      );
    }
  }

  /**
 * Adds the shadowRoot's child elements which match the class selector to the 
 * this.dom.class object.
 */
  private processClassSelectors(selector: string): HTMLElement[] {
    const nodeList = this.shadowRoot.querySelectorAll("." + selector);
    const collection = [
      ...nodeList,
    ].filter(isHTMLElement);
    if (collection.length === 0 || nodeList.length !== collection.length) {
      throw new ShadowError(
        `No HTMLElement with class selector '${selector}'.`,
      );
    } else {
      return this.dom.class[selector] = collection;
    }
  }

  /**
 * Adds to all passed elements the list of the passed events and listeners.
 */
  private addEventListeners(
    elements: HTMLElement[],
    eventsAndListeners: EventsAndListeners,
  ): void {
    eventsAndListeners.map(([event, listener]) =>
      elements.map((element) =>
        element.addEventListener(event, listener.bind(this))
      )
    );
  }

  /**
 * Returns an array of the slot elements of the custom element.
 */
  getSlotElements(): HTMLElement[] {
    return [...this.children] as HTMLElement[];
  }

  /**
   * Is called by the method `actuallyRender` which renders the custom element.
   * It must return the return type of the function `html`.
 */
  render(): Html {
    throw new ShadowError("The render method must be defined.");
  }

  /**
   * A modifiable lifecycle callback which is called after the first update which
   * includes rendering.
 */
  firstUpdated?(): void;

  /**
   * A modifiable lifecycle callback which is called after each update which
   * includes rendering.
 */
  updated?(): void;

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
