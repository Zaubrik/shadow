// deno-lint-ignore-file no-explicit-any
import {
  convertCamelToDash,
  convertDashToCamel,
  createTemplate,
  isNull,
  isObject,
  isString,
  isTrue,
  stringify,
} from "./util.ts";

import type { AllowedExpressions, HReturn } from "./html.ts";

/**
 * The type of HTML attributes.
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
  private _renderCounter = 0;
  private _waitingList = new Set<string>();
  private _accessorsStore = new Map<string, unknown>();
  private _updateCustomEvent = new CustomEvent("_updated");
  private _propertiesAndOptions: PropertyAndOptions[];
  /**
   * Stores the CSS which has been added by the method `addCss`.
   */
  private _dynamicCssStore: HTMLTemplateElement[] = [];
  /**
   * This boolean will be `true` when the native method `connectedCallback` has
   * been called and the properties have been *made accessible*.
   */
  private _isConnected = false;
  /**
   * The initial rendering is delayed until the properties of the fetched JSON
   * object have been assigned to the custom element's properties.
   */
  private _isPaused = false;
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
   * When you assign a url or a path to `initUrl` then `Shadow` will fetch a JSON
   * object and assign its properties to the custom element automatically.
   */
  initUrl: Attribute = null;
  /**
   * Indicates if the custom element is ready for the first rendering.
   */
  private get _isReady(): boolean {
    return this._isConnected === true && this._isPaused === false &&
      this._waitingList.size === 0;
  }
  /**
   * The constructor of `Shadow` takes the optional object `ShadowRootInit` which
   * will be passed to the native method `attachShadow`.
   */
  constructor(options: ShadowRootInit = { mode: "open" }) {
    super();
    this.root = this.attachShadow(options);
    // NOTE: `__propertiesAndOptions` is defined by the decorator `property`.
    this._propertiesAndOptions = (this as any).__propertiesAndOptions || [];
    if (this.firstUpdated) {
      this.addEventListener("_updated", this.firstUpdated as any, {
        once: true,
      });
    }
    if (this.updated) {
      this.addEventListener("_updated", this.updated as any);
    }
  }

  /**
   * A native custom elements' lifecycle callback. When you use this callback,
   * you probably want to call `super.connectedCallback()` inside of it.
   */
  connectedCallback() {
    this.init(this._propertiesAndOptions);
  }
  /**
   * Call this method inside of 'connectedCallback' if you want to avoid using
   * the decorator `property`. The property's options are explained next to the
   * decorator `property`.
   */
  init(propertiesAndOptions: PropertyAndOptions[]): void {
    propertiesAndOptions.push({ property: "initUrl", render: false });
    propertiesAndOptions.forEach(this._makePropertyAccessible);
    this._isConnected = true;
    if (isTrue(this._isReady)) {
      this._actuallyRender();
    }
  }

  /**
   * It assigns the accessors to the element's property and starts rendering.
   */
  private _makePropertyAccessible = ({
    property,
    reflect = true,
    render = true,
    wait = false,
    assert = false,
  }: PropertyAndOptions): void => {
    if (isTrue(wait)) {
      this._waitingList.add(property);
    } else if (isTrue(assert) && !(this as any)[property]) {
      throw new ShadowError(
        `The property ${property} must have a truthy value.`,
      );
    }

    this._accessorsStore.set(property, (this as any)[property]);

    if (isTrue(reflect)) {
      this._updateAttribute(property, (this as any)[property]);
    }

    Object.defineProperty(this, property, {
      get: () => this._accessorsStore.get(property),
      set: (value: unknown) => {
        if (isTrue(assert) && !value) {
          throw new ShadowError(
            `The property '${property}' must have a truthy value.`,
          );
        }
        this._accessorsStore.set(property, value);
        if (isTrue(wait)) {
          this._waitingList.delete(property);
        }
        if (isTrue(reflect)) {
          this._updateAttribute(property, value);
        }
        if (isTrue(render) && isTrue(this._isReady)) {
          this._actuallyRender();
        }
      },
    });
  };

  /**
   * Sets and removes attributes.
   */
  private _updateAttribute(property: string, value: unknown): void {
    const attributeName = convertCamelToDash(property);
    const attributeValue = this.getAttribute(attributeName);
    if (attributeValue !== value) {
      if (isNull(value)) return this.removeAttribute(attributeName);
      else {
        if (isString(value)) {
          this.setAttribute(attributeName, value);
        } else {
          // NOTE: TypeScript uses an incorrect return type for `JSON.stringify`.
          const jsonValue = JSON.stringify(value);
          if (jsonValue === undefined) {
            throw new ShadowError(
              `Only JSON values can be reflected in attributes but received ` +
                `the value '${value}' for '${property}'.`,
            );
          }
          if (attributeValue !== jsonValue) {
            this.setAttribute(attributeName, jsonValue);
          }
        }
      }
    }
  }

  /**
   * A native custom elements' lifecycle callback. Here, it manages the reflecting
   * of properties to attributes. If the attribute `init-url` has been set to a
   * url or path it *fetches* a JSON object and assigns its properties to the
   * custom element.
   */
  attributeChangedCallback(
    name: string,
    oldValue: Attribute,
    newValue: Attribute,
  ): void {
    if (newValue === oldValue) {
      return undefined;
    } else if (name === "init-url" && isString(newValue)) {
      this._isPaused = true;
      this.update(name, newValue);
      this._fetchJsonAndUpdate(newValue)
        .then(() => {
          this._isPaused = false;
          if (isTrue(this._isReady)) {
            this._actuallyRender();
          }
        });
    } else {
      return this.update(name, newValue);
    }
  }

  private _fetchJsonAndUpdate(urlOrPath: string): Promise<void> {
    return fetch(new URL(urlOrPath, location.href).href).then((res) => {
      if (isTrue(res.ok)) {
        return res.json().then((data) =>
          Object.entries(data).forEach(([property, value]) =>
            (this as any)[property] = value
          )
        );
      } else {
        throw new ShadowError(
          `Received status code ${res.status} instead of 200-299 range.`,
        );
      }
    })
      .catch((err) => {
        throw new ShadowError(err.message);
      });
  }

  /**
   * Compares and reflects properties to attributes.
   */
  update(name: string, value: Attribute): void {
    const property = convertDashToCamel(name);
    if (property in this) {
      if (
        (this as any)[property] !== value &&
        JSON.stringify((this as any)[property]) !== value
      ) {
        try {
          (this as any)[property] = isNull(value) ? value : JSON.parse(value);
        } catch {
          (this as any)[property] = value;
        }
      }
    } else {
      throw new ShadowError(
        `The property '${property}' does not exist on '${this.constructor.name}'.`,
      );
    }
  }

  /**
   * Adds CSS to the `shadowRoot` dynamically. Pass `false` as second argument if
   * you don't want this method to cause the custom element being rerendered.
   */
  addCss(ruleSet: string, render = true): void {
    this._dynamicCssStore.push(createTemplate(`<style>${ruleSet}</style>`));
    if (isTrue(render) && isTrue(this._isReady)) this._actuallyRender();
  }

  private _createFragment(
    ...inputArray: AllowedExpressions[]
  ): DocumentFragment {
    const documentFragment = document.createDocumentFragment();
    inputArray.flat(2).forEach((input) => {
      if (isObject(input) && input.element instanceof Element) {
        const { element, collection } = input as HReturn;
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
      } else if (isString(input)) {
        // NOTE: Allows pure HTML strings without the usage of `htm`.
        documentFragment.appendChild(
          createTemplate(input).content.cloneNode(true),
        );
      } else {
        documentFragment.appendChild(
          document.createTextNode(stringify(input)),
        );
      }
    });
    return documentFragment;
  }

  /**
   * Calls the method `this.render`, processes the return value and dispatches
   * the event `_updated`.
   */
  private _actuallyRender(): void {
    if (this._renderCounter > 0) {
      this.dom.id = {};
      this.dom.class = {};
    }
    while (this.root.firstChild) {
      this.root.removeChild(this.root.firstChild);
    }
    (this.constructor as typeof Shadow).styles.forEach((template) =>
      this.root.append(template.content.cloneNode(true))
    );
    const fragment = this._createFragment(this.render());
    if (this._dynamicCssStore.length > 0) {
      this._dynamicCssStore.forEach((styleTemplate) =>
        this.root.append(styleTemplate.content.cloneNode(true))
      );
    }
    this.root.prepend(fragment);
    this.dispatchEvent(this._updateCustomEvent);
    this._renderCounter++;
    // console.log((this.constructor as typeof Shadow).is, this._renderCounter);
  }

  /**
   * Is called by the method `_actuallyRender` which renders the custom element.
   * It must return the return type of the function `html` which is
   * `AllowedExpressions`.
   */
  render(): AllowedExpressions {
    return "";
  }

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
   * Contains the return value of the function `css`, which is an array of
   * HTMLTemplateElements containing `style` elements.
   */
  static styles: HTMLTemplateElement[] = [];

  /**
   * The decorator `customElement` sets this static property to the
   * custom element's tag name automatically.
   */
  static is?: string;
}
