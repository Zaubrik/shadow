import {
  convertCamelToDash,
  convertDashToCamel,
  createTemplate,
  isHtmlElement,
  isNull,
  isObject,
  isString,
  isTrue,
  stringify,
} from "./util.js";

/**
 * @typedef {import('./html.js').AllowedExpressions} AllowedExpressions
 * @typedef {import('./html.js').HReturn} HReturn
 * @typedef {import('./html.js').Collection} Collection
 * @typedef {string | null} Attribute
 * @typedef {{
 * id: Record<string, HTMLElement>;
 * class: Record<string, HTMLElement[]>;
 * }} Dom
 * @typedef {{
 * reflect?: boolean;
 * render?: boolean;
 * wait?: boolean;
 * assert?: boolean;
 * }} PropertyOptions
 */

/** @extends Error */
class ShadowError extends Error {
  /** @param {string} message */
  constructor(message) {
    super(message);
    this.name = this.constructor.name;
  }
}
/** @extends HTMLElement */
export class Shadow extends HTMLElement {
  /** @private */
  _renderCounter = 0;

  /** @private */
  _waitingList = new Set();

  /** @private */
  _accessorsStore = new Map();

  /**
   * Stores the CSS which has been added by the method 'addCss'.
   * @private
   * @type {HTMLTemplateElement[]}
   */
  _dynamicCssStore = [];

  /**
   * This boolean will be 'true' when the native method 'connectedCallback' has
   * been called and the properties have been *made accessible*.
   * @private
   */
  _isConnected = false;

  /**
   * The initial rendering is delayed until the properties of the fetched JSON
   * object have been assigned to the custom element's properties.
   * @private
   */
  _isPaused = false;

  /**
   * Indicates if the custom element is ready for the first rendering.
   * @private
   */
  get _isReady() {
    return this._isConnected === true && this._isPaused === false &&
      this._waitingList.size === 0;
  }

  /**
   * Access the 'shadowRoot' through the property 'root'.
   * @type {ShadowRoot}
   */
  root;

  /**
   * In 'this.dom' are the child elements stored which match the id and class
   * selectors marked with the special sign '@'.
   * @type {Dom}
   */
  dom = { id: {}, class: {} };

  /**
   * The constructor of 'Shadow' takes the optional object 'ShadowRootInit' which
   * will be passed to the native method 'attachShadow'.
   * @param {ShadowRootInit} options
   */
  constructor(options = { mode: "open" }) {
    super();
    this.root = this.attachShadow(options);
  }

  /**
   * A native custom elements' lifecycle callback. It fires each time a custom
   * element is appended into a *document-connected* element.
   * @returns {void}
   */
  connectedCallback() {
    this._init();
  }

  /**
   * Manages your declared properties and their corresponding attributes and
   * begins to render.
   * @private
   * @returns {void}
   */
  _init() {
    Object.entries(/**@type {typeof Shadow}*/ (this.constructor).properties)
      .forEach(this._makePropertyAccessible);
    this._isConnected = true;
    if (isTrue(this._isReady)) {
      this._actuallyRender();
    }
  }

  /**
   * Assigns the accessors to the declared properties, updates attributes and
   * invokes rendering.
   * @private
   * @param {[string, PropertyOptions ]} propertyAndOptions
   * @returns {void}
   */
  _makePropertyAccessible = (
    [
      property,
      { reflect = false, render = true, wait = false, assert = false },
    ],
  ) => {
    if (isTrue(wait)) {
      this._waitingList.add(property);
    } else if (isTrue(assert) && !/**@type {any}*/ (this)[property]) {
      throw new ShadowError(
        `The property ${property} must have a truthy value.`,
      );
    }

    this._accessorsStore.set(property, /**@type {any}*/ (this)[property]);

    if (isTrue(reflect)) {
      this._reflectToAttribute(property, /**@type {any}*/ (this)[property]);
    }

    Object.defineProperty(this, property, {
      get: () => this._accessorsStore.get(property),
      set: (value) => {
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
          this._reflectToAttribute(property, value);
        }
        if (isTrue(render) && isTrue(this._isReady)) {
          this._actuallyRender();
        }
      },
    });
  };

  /**
   * Reflects a property's value to its attribute.
   * @private
   * @param {string} property
   * @param {unknown} value
   * @returns {void}
   */
  _reflectToAttribute(property, value) {
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
              `Only JSON values can be reflected to attributes but received ` +
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
   * Whenever an attribute change fires this native lifecycle callback, 'Shadow'
   * sets the property value from the observed attribute. The name of the
   * attribute is the *dash-cased* property name.
   * If the special attribute 'init-url' has been set to a url or path, a JSON
   * object will be *fetched* and assigned to the custom element's properties.
   * @param {string} name
   * @param {Attribute} oldValue
   * @param {Attribute} newValue
   * @returns {void}
   */
  attributeChangedCallback(name, oldValue, newValue) {
    if (newValue === oldValue) {
      return undefined;
    } else if (name === "init-url" && isString(newValue)) {
      this._isPaused = true;
      this._updateFromAttribute(name, newValue);
      this._fetchJsonAndUpdate(newValue)
        .then(() => {
          this._isPaused = false;
          if (isTrue(this._isReady)) {
            this._actuallyRender();
          }
        });
    } else {
      return this._updateFromAttribute(name, newValue);
    }
  }

  /**
   * Fetches a JSON object and assigns the object's properties to the element.
   * @private
   * @param {string | URL} urlOrPath
   * @returns {Promise<void>}
   */
  _fetchJsonAndUpdate(urlOrPath) {
    return fetch(new URL(urlOrPath, location.href).href).then((res) => {
      if (isTrue(res.ok)) {
        return res.json().then((data) => {
          if (isObject(data)) {
            return Object.entries(data).forEach(([property, value]) =>
              /**@type {any}*/ (this)[property] = value
            );
          } else {
            throw new Error(`The fetched data is not a JSON object.`);
          }
        });
      } else {
        throw new Error(
          `Received status code ${res.status} instead of 200-299 range.`,
        );
      }
    })
      .catch((err) => {
        throw new ShadowError(err.message);
      });
  }

  /**
   * Sets the value of the *camel-cased* property to the attribute's value with
   * 'JSON.parse'.
   * @private
   * @param {string} name
   * @param {Attribute} value
   * @returns {void}
   */
  _updateFromAttribute(name, value) {
    const property = convertDashToCamel(name);
    if (property in this) {
      if (
        /**@type {any}*/ (this)[property] !== value &&
          JSON.stringify(/**@type {any}*/ (this)[property]) !== value
      ) {
        try {
          /**@type {any}*/ (this)[property] = isNull(value)
            ? value
            : JSON.parse(value);
        } catch {
          /**@type {any}*/ (this)[property] = value;
        }
      }
    }
  }

  /**
   * Adds CSS to the 'shadowRoot' dynamically. Pass 'false' as second argument if
   * you don't want this method to cause the custom element being rerendered.
   * @param {string} ruleSet
   * @returns {void}
   */
  addCss(ruleSet, render = true) {
    this._dynamicCssStore.push(createTemplate(`<style>${ruleSet}</style>`));
    if (isTrue(render) && isTrue(this._isReady)) this._actuallyRender();
  }

  /**
   * @private
   * @param {AllowedExpressions[]} inputArray
   * @returns {DocumentFragment}
   */
  _createFragment(...inputArray) {
    const documentFragment = document.createDocumentFragment();
    inputArray.flat(2).forEach((input) => {
      if (isObject(input) && input.element instanceof Element) {
        const { element, collection } = /**@type {HReturn}*/ (input);
        documentFragment.appendChild(element);
        collection.forEach(this._processCollection);
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
   * Assign tagged 'HTMLElements' to the 'dom' property and add event listeners.
   * @private
   * @param {Collection[number]} collectionItem
   * @returns {void}
   */
  _processCollection = ({ target, queries, eventsAndListeners }) => {
    if (isHtmlElement(target)) {
      queries.forEach(({ kind, selector }) =>
        kind === "id"
          ? this.dom.id[selector] = target
          : this.dom.class[selector]
          ? this.dom.class[selector].push(target)
          : this.dom.class[selector] = [target]
      );
    }
    eventsAndListeners.forEach(({ event, listener }) =>
      target.addEventListener(event, listener.bind(this))
    );
  };

  /**
   * Calls the method 'this.render', processes the return value and invokes the
   * methods 'updated' and 'firstUpdated'.
   * @private
   * @returns {void}
   */
  _actuallyRender() {
    if (this._renderCounter > 0) {
      this.dom.id = {};
      this.dom.class = {};
    }
    while (this.root.firstChild) {
      this.root.removeChild(this.root.firstChild);
    }
    /**@type {typeof Shadow}*/ (this.constructor).styles.forEach((template) =>
      this.root.append(template.content.cloneNode(true))
    );
    const fragment = this._createFragment(this.render());
    if (this._dynamicCssStore.length > 0) {
      this._dynamicCssStore.forEach((styleTemplate) =>
        this.root.append(styleTemplate.content.cloneNode(true))
      );
    }
    this.root.prepend(fragment);
    this._renderCounter++;
    if (this._renderCounter === 1) this.firstUpdated();
    this.updated();
    // console.log(this.tagName, this._renderCounter);
  }

  /**
   * Is called by the method '_actuallyRender' which renders the custom element.
   * It must return the return type of the function 'html' which is
   * 'AllowedExpressions'.
   * @returns {AllowedExpressions}
   */
  render() {
    return "";
  }

  /**
   * A modifiable lifecycle callback which is called after the first update which
   * includes rendering.
   * @returns {void}
   */
  firstUpdated() {}
  /**
   * A modifiable lifecycle callback which is called after each update which
   * includes rendering.
   * @returns {void}
   */
  updated() {}

  /**
   * You can pass the following options together with the properties:
   * 1. Setting 'reflect' to 'true' configures a property so that whenever it
   * changes, its value is reflected to its corresponding attribute. (false)
   * 2. Setting 'render' to 'false' stops rerendering on property changes. (true)
   * 3. Wait for an assignment before rendering with the option 'wait'. (false)
   * 4. Assert with the option 'assert' if the input has a *truthy* value. (false)
   * @static
   * @type {Record<string, PropertyOptions>}
   */
  static properties = {};

  /**
   * Contains the return value of the function 'css', which is an array of
   * HTMLTemplateElements containing 'style' elements.
   * @static
   * @type {HTMLTemplateElement[]}
   */
  static styles = [];
}
