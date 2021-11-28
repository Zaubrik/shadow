import {
  convertCamelToDash,
  convertDashToCamel,
  ShadowError,
  stringify,
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
 * The class `Shadow` is the reason why you are here.
 */
export class Shadow extends HTMLElement {
  private renderingCount = 0;
  private waitingList = new Set<string>();
  private accessorsStore = new Map<string, unknown>();
  private propertiesAndOptions: PropertyAndOptions[];
  private _updateCustomEvent = new CustomEvent("_update");
  /**
   * When properties had been assigned before the custom element was defined, the
   * values are stored in `presetProperties` and processed accordingly.
   */
  private presetProperties = new Map<string, unknown>();
  /**
   * Stores the CSS which has been added by the function `addCss`.
   */
  private dynamicCssStore: HTMLStyleElement[] = [];
  /**
   * This boolean will be `true` when `connectedCallback` has been called and all
   * explicitly awaited properties have been set (the `waitingList` is empty).
   */
  _connected: boolean = false;
  root: ShadowRoot;
  /**
   * In `this.dom` are the child elements stored which match the id and class
   * selectors marked with the special `@` sign.
   */
  dom: Dom = { id: {}, class: {} };
  constructor(init: ShadowRootInit = { mode: "open" }) {
    super();
    this.root = this.attachShadow(init);
    // NOTE: `_propertiesAndOptions` is defined by the `property` decorator.
    this.propertiesAndOptions = (this as any)._propertiesAndOptions || [];
    this.propertiesAndOptions.forEach((
      { property }: PropertyAndOptions,
    ) =>
      (this as any)[property] !== undefined &&
      this.presetProperties.set(property, (this as any)[property])
    );
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
    this.init(this.propertiesAndOptions);
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
      if (wait && !this._connected) {
        this.waitingList.add(property);
      } else if (assert && !(this as any)[property]) {
        throw new ShadowError(
          `The property '${property}' must have a truthy value.`,
        );
      }

      if (this.presetProperties.has(property)) {
        this.accessorsStore.set(property, this.presetProperties.get(property));
      } else {
        this.accessorsStore.set(property, (this as any)[property]);
      }

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
            if (assert && !(this as any)[property]) {
              throw new ShadowError(
                `The property '${property}' must have a truthy value.`,
              );
            }
            if (this.waitingList.size === 0) {
              if (!this._connected) this._connected = true;
            }
          }
          if (
            reflect &&
            attributeValue !== value &&
            attributeValue !== JSON.stringify(value)
          ) {
            this.updateAttribute(attributeName, value);
          }
          if (this._connected && render) {
            this.actuallyRender();
          }
        },
      });
    });
    if (this.waitingList.size === 0) {
      if (!this._connected) this._connected = true;
      this.actuallyRender();
    }
  }

  /**
   * Compares and reflects properties to attributes.
   */
  update(name: string, newValue: Attribute): void {
    const property = convertDashToCamel(name);
    if (property in this) {
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
    } else {
      throw new ShadowError(
        `The property '${property}' doen't exist on '${this.constructor.name}'.`,
      );
    }
  }

  /**
   * Adds CSS to the shadowRoot dynamically. Pass `true` as second argument if
   * you want the element to be rerendered, e.g. when you call this function
   * after the first render.
   */
  addCss(ruleSet: string, render = false) {
    const style = document.createElement("style");
    style.innerHTML = ruleSet;
    this.dynamicCssStore.push(style);
    if (render && this._connected) this.actuallyRender();
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
          document.createTextNode(stringify(data)),
        );
      }
    });
    return documentFragment;
  }

  /**
   * Calls the function `this.render()`, processes the return value and dispatches
   * the event `_update`.
   */
  private actuallyRender(): void {
    if (this.renderingCount > 0) this.dom = { id: {}, class: {} };
    const documentFragment = this.createFragment(this.render!());
    while (this.root.firstChild) {
      this.root.removeChild(this.root.firstChild);
    }
    (this.constructor as typeof Shadow).styles.forEach((template) =>
      this.root.append(template.content.cloneNode(true))
    );
    if (this.dynamicCssStore.length > 0) {
      this.dynamicCssStore.forEach((styleElement) =>
        this.root.append(styleElement.cloneNode(true))
      );
    }
    this.root.prepend(documentFragment);
    this.dispatchEvent(this._updateCustomEvent);
    this.renderingCount++;
    // console.log((this.constructor as typeof Shadow).is, this.renderingCount);
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
