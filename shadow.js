import {
  convertCamelToDash,
  convertDashToCamel,
  createTemplate,
  getJwt,
  goHome,
  isHtmlElement,
  isNotNull,
  isNull,
  isObject,
  isString,
  isTrue,
  removeJwt,
  stringify,
} from "./util.js";
import { makeRpcCall } from "./deps.js";

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
 * rpc?: string;
 * }} PropertyOptions
 * @typedef {string | number | boolean | null} JsonPrimitive
 * @typedef {JsonPrimitive | JsonObject | JsonArray} JsonValue
 * @typedef {JsonValue[]} JsonArray
 * @typedef {{ [member: string]: JsonValue }} JsonObject
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

  /** @type{HTMLTemplateElement} */
  htmlData = createTemplate("");

  /** @type{JsonValue} */
  jsonData = null;

  /** @type{Record<string, JsonObject>} */
  rpcData = {};

  /**
   * The key name where the jwt is stored in the local storage.
   * @private
   */
  _jwtKeyName = "jwt";

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
   * The initial rendering is delayed until the fetched data object has been
   * assigned to the custom element's properties.
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
   * element is appended into a *document-connected* element. Bear in mind that
   * the elements are not rendered yet. Overwriting this method
   * requires invoking `super.connectedCallback()` inside of it.
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
      { reflect = false, render = true, wait = false, assert = false, rpc },
    ],
  ) => {
    if (isString(rpc)) {
      if (!(/**@type {any}*/ property in this)) {
        throw new ShadowError(
          "The necessary property required as rpc argument is not a class member.",
        );
      }
      this._waitingList.add(property);
    } else if (isTrue(wait)) {
      this._waitingList.add(property);
    } else if (
      isTrue(assert) && /**@type {any}*/ (this)[property] === undefined
    ) {
      throw new ShadowError(
        `The property '${property}' must have a truthy value.`,
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
        if (isString(rpc)) {
          this._waitingList.delete(property);
          this._makeRpcCallAndRender(rpc, property);
        }
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
   * Gets the url and the jwt from the special url or path.
   * @private
   * @param {string} urlOrPath
   * @returns {[string, string | null ]}
   */
  _getUrlAndJwt(urlOrPath) {
    const hasJwtEnabled = urlOrPath.startsWith("@jwt:");
    const jwtOrNull = hasJwtEnabled ? getJwt("jwt") : null;
    const realUrlOrPath = hasJwtEnabled ? urlOrPath.slice(5) : urlOrPath;
    const url = new URL(realUrlOrPath, location.href).href;
    if (hasJwtEnabled && isNull(jwtOrNull)) {
      console.error(`No jwt has been stored.`);
      goHome();
    }
    return [url, jwtOrNull];
  }

  /**
   * Fetches an object and assigns the data to the element.
   * @private
   * @param {"json-url" | "html-url" | "init-url" } name
   * @param {string} urlOrPath
   */
  async _fetchAndUpdate(name, urlOrPath) {
    try {
      const [url, jwt] = this._getUrlAndJwt(urlOrPath);
      const request = new Request(url);
      if (jwt) {
        request.headers.set("Authorization", `Bearer ${jwt}`);
      }
      const response = await fetch(request);
      if (isTrue(response.ok)) {
        if (name === "json-url" || name === "init-url") {
          const jsonResult = /**@type {JsonObject}*/ (await response.json());
          if (name === "init-url" && !isObject(jsonResult)) {
            throw new Error("The json data is not an object.");
          } else {
            name === "json-url"
              ? this.jsonData = jsonResult
              : Object.entries(jsonResult).forEach(([property, value]) =>
                /**@type {any}*/ (this)[property] = value
              );
            return jsonResult;
          }
        } else {
          return this.htmlData = createTemplate(await response.text());
        }
      } else if (response.status === 401 && isNotNull(jwt)) {
        console.error(`Received status code ${response.status}.`);
        removeJwt(this._jwtKeyName);
        goHome();
      } else {
        throw new Error(
          `Received status code ${response.status} instead of 200-299 range.`,
        );
      }
    } catch (error) {
      throw new ShadowError(error.message);
    }
  }

  /**
   * Assigns the accessors to the declared properties, updates attributes and
   * invokes rendering.
   * @private
   * @param {string} method
   * @param {string} property
   * @returns {Promise<void>}
   */
  async _makeRpcCallAndRender(method, property) {
    const urlOrPath = this.getAttribute("rpc-url");
    if (isString(urlOrPath)) {
      const [url, jwt] = this._getUrlAndJwt(urlOrPath);
      try {
        const result = await makeRpcCall(url)(
          { method, params: /**@type {any}*/ (this)[property] },
          isNull(jwt) ? undefined : { jwt },
        );
        if (isObject(result)) {
          this.rpcData[method] = /**@type {JsonObject}*/ (result);
        } else {
          throw new Error("The rpc result is not an object.");
        }
      } catch (error) {
        if (isString(jwt)) {
          console.error(`Received rpc error code ${error?.code}.`);
          removeJwt(this._jwtKeyName);
          goHome();
        } else {
          throw new ShadowError(error.message);
        }
      }
      this._actuallyRender();
    } else {
      throw new ShadowError("The element requires an 'rpc-url' attribute.");
    }
  }

  /**
   * Reflects a property's value to its attribute. If reflect ´true´ only JSON
   * values can be reflected to attributes. This means the property needs
   * to be declared.
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
          if (!(property in this)) {
            throw new ShadowError(
              `The property '${property}' is not defined on the class.`,
            );
          }
          // NOTE: TypeScript uses an incorrect return type for `JSON.stringify`.
          const jsonValue = JSON.stringify(value);
          if (jsonValue === undefined) {
            throw new ShadowError(
              `The property '${property}' is not defined on the class.`,
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
   * If one of the special attributes 'json-url', 'html-url' or 'init-url' has
   * been set to a url or path, the data will be fetched and assigned
   * accordingly.
   * @param {string} name
   * @param {Attribute} oldValue
   * @param {Attribute} newValue
   * @returns {void}
   */
  attributeChangedCallback(name, oldValue, newValue) {
    if (newValue === oldValue) {
      return undefined;
    } else if (
      (name === "json-url" || name === "html-url" || name === "init-url") &&
      isString(newValue)
    ) {
      this._isPaused = true;
      this._updateFromAttribute(name, newValue);
      this._fetchAndUpdate(name, newValue)
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
   * Sets the value of the *camel-cased* property to the attribute's value with
   * 'JSON.parse'. If the property exists only observed attributes
   * (`observedAttributes`) will update properties.
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
   * You can pass the following options. The specified properties are rerendered
   * on new asignments:
   * 1. Setting 'reflect' to 'true' configures a property so that whenever it
   * changes, its value is reflected to its corresponding attribute. Only JSON
   * values can be reflected to attributes. (false)
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
