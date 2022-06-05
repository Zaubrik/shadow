// @ts-check
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
 * property: string;
 * reflect?: boolean;
 * render?: boolean;
 * wait?: boolean;
 * assert?: boolean;
 * }} PropertyAndOptions
 */

/** @extends Error */
class ShadowError extends Error {
  /** @param {string} message */
  constructor(message) {
    super(message);
    this.message = message;
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
  /** @private */
  _updateCustomEvent = new CustomEvent("_updated");
  /** @private
   * @type {PropertyAndOptions[]}
   */
  _propertiesAndOptions = [];
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
   * When you assign a url or a path to 'initUrl' then 'Shadow' will fetch a JSON
   * object and assign its properties to the custom element automatically.
   * @type {Attribute}
   */
  initUrl = null;
  /**
   * Indicates if the custom element is ready for the first rendering.
   * @private
   */
  get _isReady() {
    return this._isConnected === true && this._isPaused === false &&
      this._waitingList.size === 0;
  }
  /**
   * The constructor of 'Shadow' takes the optional object 'ShadowRootInit' which
   * will be passed to the native method 'attachShadow'.
   */
  constructor(options = { mode: /** @type {const} */ ("open") }) {
    super();
    this.root = this.attachShadow(options);
    this.addEventListener("_updated", /**@type {any}*/ (this.firstUpdated), {
      once: true,
    });
    this.addEventListener("_updated", /**@type {any}*/ (this.updated));
  }
  /**
   * A native custom elements' lifecycle callback. When you use this callback,
   * you probably want to call 'super.connectedCallback()' inside of it.
   * @returns {void}
   */
  connectedCallback() {
    this.init(this._propertiesAndOptions);
  }
  /**
   * Call this method inside of 'connectedCallback' if you want to avoid using
   * the decorator 'property'. The property's options are explained next to the
   * decorator 'property'.
   * @param {PropertyAndOptions[]} propertiesAndOptions
   * @returns {void}
   */
  init(propertiesAndOptions) {
    propertiesAndOptions.forEach(this._makePropertyAccessible);
    this._isConnected = true;
    if (isTrue(this._isReady)) {
      this._actuallyRender();
    }
  }

  /**
   * It assigns the accessors to the element's property and starts rendering.
   * @private
   * @param {PropertyAndOptions} propertyAndOptions
   * @returns {void}
   */
  _makePropertyAccessible = (
    { property, reflect = true, render = true, wait = false, assert = false },
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
      this._updateAttribute(property, /**@type {any}*/ (this)[property]);
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
   * @private
   * @param {string} property
   * @param {unknown} value
   * @returns {void}
   */
  _updateAttribute(property, value) {
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
   * of properties to attributes. If the attribute 'init-url' has been set to a
   * url or path it *fetches* a JSON object and assigns its properties to the
   * custom element.
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

  /** @private
   * @param {string | URL} urlOrPath
   * @returns {Promise<void>}
   */
  _fetchJsonAndUpdate(urlOrPath) {
    return fetch(new URL(urlOrPath, location.href).href).then((res) => {
      if (isTrue(res.ok)) {
        return res.json().then((data) =>
          Object.entries(data).forEach(([property, value]) =>
            /**@type {any}*/ (this)[property] = value
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
   * @param {string} name
   * @param {Attribute} value
   * @returns {void}
   */
  update(name, value) {
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
    } else {
      throw new ShadowError(
        `The property '${property}' does not exist on '${this.constructor.name}'.`,
      );
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

  /** @private
   * @param {AllowedExpressions[]} inputArray
   * @returns {DocumentFragment}
   */
  _createFragment(...inputArray) {
    const documentFragment = document.createDocumentFragment();
    inputArray.flat(2).forEach((input) => {
      if (isObject(input) && input.element instanceof Element) {
        const { element, collection } = /**@type {HReturn}*/ (input);
        documentFragment.appendChild(element);
        collection.forEach(this._processCollection.bind(this));
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

  /** @private
   * @param {Collection[number]} collectionItem
   * @returns {void}
   */
  _processCollection({ target, queries, eventsAndListeners }) {
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
  }

  /**
   * Calls the method 'this.render', processes the return value and dispatches
   * the event '_updated'.
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
    this.dispatchEvent(this._updateCustomEvent);
    this._renderCounter++;
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
   * @param {CustomEvent} _event
   * @return {void}
   */
  firstUpdated(_event) {}
  /**
   * @param {CustomEvent} _event
   * @return {void}
   */
  updated(_event) {}

  /**
   * Contains the return value of the function 'css', which is an array of
   * HTMLTemplateElements containing 'style' elements.
   * @static
   * @type {HTMLTemplateElement[]}
   */
  static styles = [];
  /**
   * The decorator 'customElement' sets this static property to the
   * custom element's tag name automatically.
   * @static
   */
  static is = undefined;
}
