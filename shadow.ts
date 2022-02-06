import {
  convertCamelToDash,
  convertDashToCamel,
  createTemplate,
  isNull,
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

class ShadowError extends Error {
  constructor(message: string) {
    super(message);
    this.message = message;
    this.name = this.constructor.name;
  }
}

export class Shadow extends HTMLElement {
  private _renderingCount = 0;
  private _waitingList = new Set<string>();
  private _accessorsStore = new Map<string, unknown>();
  private _propertiesAndOptions: PropertyAndOptions[];
  private _updateCustomEvent = new CustomEvent("_updated");
  /**
   * Stores the CSS which has been added by the function `addCss`.
   */
  private _dynamicCssStore: HTMLTemplateElement[] = [];
  /**
   * This boolean will be `true` when `connectedCallback` has been called and all
   * explicitly awaited properties have been set (i.e. the `_waitingList` is empty).
   */
  private _connected: boolean = false;
  /**
   * Access the `shadowRoot` through the property `root`.
   */
  root: ShadowRoot;
  /**
   * In `this.dom` are the child elements stored which match the id and class
   * selectors marked with the special sign `@`.
   */
  dom: Dom = { id: {}, class: {} };
  /**
   * The constructor of `Shadow` takes the optional object `ShadowRootInit` which
   * will be passed to the native method `attachShadow`.
   */
  constructor(init: ShadowRootInit = { mode: "open" }) {
    super();
    this.root = this.attachShadow(init);
    // NOTE: `__propertiesAndOptions` is defined by the `property` decorator.
    this._propertiesAndOptions = (this as any).__propertiesAndOptions || [];
    if (this.firstUpdated) {
      this.addEventListener(
        "_updated",
        (event: any) => this.firstUpdated!(event),
        { once: true },
      );
    }
    if (this.updated) {
      this.addEventListener("_updated", (event: any) => this.updated!(event));
    }
  }

  /**
   * A native custom elements' [lifecycle callback](https://developer.mozilla.org/en-US/docs/Web/Web_Components/Using_custom_elements).
   * When you use this callback, you probably want to call `super.connectedCallback()`
   * inside of it.
   */
  connectedCallback() {
    this.init(this._propertiesAndOptions);
  }

  /**
   * A native custom elements' lifecycle callback. Here, it manages the reflecting
   * of properties to attributes. It also fetches JSON objects and assigns its
   * properties to the custom element if the attribute `init-url` has been set with
   * a url or path.
   */
  attributeChangedCallback(
    name: string,
    oldValue: Attribute,
    newValue: Attribute,
  ) {
    if (newValue === oldValue) {
      return undefined;
    } else if (name === "init-url" && newValue) {
      return fetch(new URL(newValue, location.origin).href).then((res) =>
        res.json()
      )
        .then((data) =>
          Object.entries(data).forEach((
            [property, value],
          ) => ((this as any)[property] = value))
        );
    } else {
      return this._update(name, newValue);
    }
  }

  /**
   * Sets or removes attributes.
   */
  private _updateAttribute(attributeName: string, value: unknown): void {
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
   * and starts rendering. The arguments are explained next to the decorator
   * `property`.
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
        this._waitingList.add(property);
      } else if (assert && !(this as any)[property]) {
        throw new ShadowError(
          `The property ${property} must have a truthy value.`,
        );
      }

      this._accessorsStore.set(property, (this as any)[property]);

      if (reflect && isNull(this.getAttribute(property))) {
        this._updateAttribute(
          convertCamelToDash(property),
          (this as any)[property],
        );
      }

      Object.defineProperty(this, property, {
        get: () => this._accessorsStore.get(property),
        set: (value: unknown) => {
          if (assert && !value) {
            throw new ShadowError(
              `The property '${property}' must have a truthy value.`,
            );
          }
          const attributeName = convertCamelToDash(property);
          const attributeValue = this.getAttribute(attributeName);
          this._accessorsStore.set(property, value);
          if (wait) {
            this._waitingList.delete(property);
            if (this._waitingList.size === 0) {
              if (!this._connected) this._connected = true;
            }
          }
          if (
            reflect &&
            attributeValue !== value &&
            attributeValue !== JSON.stringify(value)
          ) {
            this._updateAttribute(attributeName, value);
          }
          if (this._connected && render) {
            this._actuallyRender();
          }
        },
      });
    });

    if (this._waitingList.size === 0) {
      if (!this._connected) this._connected = true;
      this._actuallyRender();
    }
  }

  /**
   * Compares and reflects properties to attributes.
   */
  private _update(name: string, newValue: Attribute): void {
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
    this._dynamicCssStore.push(createTemplate(`<style>${ruleSet}</style>`));
    if (render && this._connected) this._actuallyRender();
  }

  private _createFragment(...input: AllowedExpressions[]): DocumentFragment {
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
   * the event `_updated`.
   */
  private _actuallyRender(): void {
    if (this._renderingCount > 0) {
      this.dom.id = {};
      this.dom.class = {};
    }
    const documentFragment = this._createFragment(this.render!());
    while (this.root.firstChild) {
      this.root.removeChild(this.root.firstChild);
    }
    (this.constructor as typeof Shadow).styles.forEach((template) =>
      this.root.append(template.content.cloneNode(true))
    );
    if (this._dynamicCssStore.length > 0) {
      this._dynamicCssStore.forEach((styleTemplate) =>
        this.root.append(styleTemplate.content.cloneNode(true))
      );
    }
    this.root.prepend(documentFragment);
    this.dispatchEvent(this._updateCustomEvent);
    this._renderingCount++;
  }

  /**
   * Is called by the method `_actuallyRender` which renders the custom element.
   * It must return the return type of the function `html` which is
   * `AllowedExpressions`.
   */
  render?(): AllowedExpressions;

  /**
   * A modifiable lifecycle callback which is called after the first update which
   * includes rendering.
   */
  firstUpdated?(event: CustomEvent): void;

  /**
   * A modifiable lifecycle callback which is called after each update which
   * includes rendering.
   */
  updated?(event: CustomEvent): void;

  /**
   * The return type of the function `css`, which is an array of HTMLTemplateElements
   * containing a script element, is assigned to this static property.
   */
  static styles: HTMLTemplateElement[] = [];

  /**
   * The decorator `customElement` sets this static property to the
   * custom element's tag name automatically.
   */
  static is?: string;
}
