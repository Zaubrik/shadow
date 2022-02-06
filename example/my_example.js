// deno-fmt-ignore-file
// deno-lint-ignore-file
// This code was bundled using `deno bundle` and it's not recommended to edit it manually

function convertDashToCamel(str) {
    return str.replace(/-([a-z0-9])/g, (g)=>g[1].toUpperCase()
    );
}
function convertCamelToDash(str) {
    return str.replace(/([a-zA-Z0-9])(?=[A-Z])/g, "$1-").toLowerCase();
}
function createTemplate(html1) {
    const template = document.createElement("template");
    template.innerHTML = html1;
    return template;
}
function stringify(input) {
    return typeof input === "string" ? input : typeof input === "number" ? input.toString() : "";
}
function isNull(input) {
    return input === null;
}
function __default(n1) {
    for(var l, e, s = arguments, t = 1, r = "", u = "", a = [
        0
    ], c = function(n) {
        1 === t && (n || (r = r.replace(/^\s*\n\s*|\s*\n\s*$/g, ""))) ? a.push(n ? s[n] : r) : 3 === t && (n || r) ? (a[1] = n ? s[n] : r, t = 2) : 2 === t && "..." === r && n ? a[2] = Object.assign(a[2] || {}, s[n]) : 2 === t && r && !n ? (a[2] = a[2] || {})[r] = !0 : t >= 5 && (5 === t ? ((a[2] = a[2] || {})[e] = n ? r ? r + s[n] : s[n] : r, t = 6) : (n || r) && (a[2][e] += n ? r + s[n] : r)), r = "";
    }, h1 = 0; h1 < n1.length; h1++){
        h1 && (1 === t && c(), c(h1));
        for(var i = 0; i < n1[h1].length; i++)l = n1[h1][i], 1 === t ? "<" === l ? (c(), a = [
            a,
            "",
            null
        ], t = 3) : r += l : 4 === t ? "--" === r && ">" === l ? (t = 1, r = "") : r = l + r[0] : u ? l === u ? u = "" : r += l : '"' === l || "'" === l ? u = l : ">" === l ? (c(), t = 1) : t && ("=" === l ? (t = 5, e = r, r = "") : "/" === l && (t < 5 || ">" === n1[h1][i + 1]) ? (c(), 3 === t && (a = a[0]), t = a, (a = a[0]).push(this.apply(null, t.slice(1))), t = 0) : " " === l || "\t" === l || "\n" === l || "\r" === l ? (c(), t = 2) : r += l), 3 === t && "!--" === r && (t = 4, a = a[0]);
    }
    return c(), a.length > 2 ? a.slice(1) : a[1];
}
const SVG_NS = "http://www.w3.org/2000/svg";
function isArrayOfListeners(input) {
    return input.every((i)=>typeof i === "function"
    );
}
function isSpecialKey(input) {
    return input === "id" || input === "class";
}
function isHReturn(input) {
    return typeof input === "object" && input !== null && (input.element instanceof HTMLElement || input.element instanceof SVGElement);
}
function h(type, props, ...children) {
    const eventsAndListeners = [];
    const queries = [];
    const collection = [];
    const element = type === "svg" ? document.createElementNS(SVG_NS, "svg") : document.createElement(type);
    for(const key in props){
        if (typeof props[key] === "function") {
            eventsAndListeners.push({
                event: key,
                listener: props[key]
            });
        } else if (Array.isArray(props[key]) && isArrayOfListeners(props[key])) {
            props[key].forEach((listener)=>eventsAndListeners.push({
                    event: key,
                    listener
                })
            );
        } else if (key[0] === "@") {
            const idOrClass = key.slice(1);
            if (isSpecialKey(idOrClass)) {
                queries.push({
                    kind: idOrClass,
                    selector: props[key].replace(/ .*/, "")
                });
                element.setAttribute(idOrClass, props[key]);
            }
        } else if (props[key] === true) {
            element.setAttribute(key, "");
        } else if (typeof props[key] === "object" && props[key] !== null) {
            element.setAttribute(key, JSON.stringify(props[key]));
        } else if (typeof props[key] === "string") {
            element.setAttribute(key, props[key]);
        } else if (props[key] === null || props[key] === false || props[key] === undefined) {
            element.removeAttribute(key);
        }
    }
    if (type === "svg") {
        element.innerHTML = children.flat(2).reduce((acc, child)=>{
            return acc + (isHReturn(child) ? child.element.outerHTML : stringify(child));
        }, "");
    } else {
        for (const child of children.flat(2)){
            if (isHReturn(child)) {
                collection.push(...child.collection);
                element.appendChild(child.element);
            } else {
                const str = stringify(child);
                if (str) element.appendChild(document.createTextNode(str));
            }
        }
    }
    if (queries.length || eventsAndListeners.length) {
        collection.push({
            target: element,
            queries,
            eventsAndListeners
        });
    }
    return {
        element,
        collection
    };
}
const html = __default.bind(h);
class ShadowError extends Error {
    constructor(message){
        super(message);
        this.message = message;
        this.name = this.constructor.name;
    }
}
class Shadow extends HTMLElement {
    _renderingCount = 0;
    _waitingList = new Set();
    _accessorsStore = new Map();
    _propertiesAndOptions;
    _updateCustomEvent = new CustomEvent("_updated");
    _dynamicCssStore = [];
    _connected = false;
    root;
    dom = {
        id: {},
        class: {}
    };
    initUrl = null;
    constructor(options = {
        mode: "open"
    }){
        super();
        this.root = this.attachShadow(options);
        this._propertiesAndOptions = this.__propertiesAndOptions || [];
        if (this.firstUpdated) {
            this.addEventListener("_updated", (event)=>this.firstUpdated(event)
            , {
                once: true
            });
        }
        if (this.updated) {
            this.addEventListener("_updated", (event)=>this.updated(event)
            );
        }
    }
    connectedCallback() {
        this.init(this._propertiesAndOptions);
    }
    attributeChangedCallback(name, oldValue, newValue) {
        if (newValue === oldValue) {
            return undefined;
        } else if (name === "init-url" && newValue) {
            this._update(name, newValue);
            return fetch(new URL(newValue, location.href).href, {
                headers: {
                    "content-type": "application/json"
                }
            }).then((res)=>{
                if (res.ok) {
                    return res.json();
                } else {
                    throw new ShadowError(`Received status code ${res.status} instead of 200-299 range`);
                }
            }).then((data)=>Object.entries(data).forEach(([property1, value])=>this[property1] = value
                )
            ).catch((err)=>{
                throw new ShadowError(err.message);
            });
        } else {
            return this._update(name, newValue);
        }
    }
    _updateAttribute(attributeName, value) {
        if (value === null) return this.removeAttribute(attributeName);
        else {
            return typeof value === "string" ? this.setAttribute(attributeName, value) : this.setAttribute(attributeName, JSON.stringify(value));
        }
    }
    init(propertiesAndOptions) {
        console.log("ein", this);
        [
            ...propertiesAndOptions,
            {
                property: "initUrl",
                render: false
            }
        ].forEach((propertyAndOptions)=>this._makePropertyAccessible(propertyAndOptions)
        );
        if (this._waitingList.size === 0) {
            if (!this._connected) this._connected = true;
            this._actuallyRender();
        }
    }
    _makePropertyAccessible({ property: property2 , reflect =true , render =true , wait =false , assert =false  }) {
        if (wait && !this._connected) {
            this._waitingList.add(property2);
        } else if (assert && !this[property2]) {
            throw new ShadowError(`The property ${property2} must have a truthy value.`);
        }
        console.log("this", this);
        this._accessorsStore.set(property2, this[property2]);
        if (reflect && isNull(this.getAttribute(property2))) {
            this._updateAttribute(convertCamelToDash(property2), this[property2]);
        }
        Object.defineProperty(this, property2, {
            get: ()=>this._accessorsStore.get(property2)
            ,
            set: (value)=>{
                if (assert && !value) {
                    throw new ShadowError(`The property '${property2}' must have a truthy value.`);
                }
                const attributeName = convertCamelToDash(property2);
                const attributeValue = this.getAttribute(attributeName);
                this._accessorsStore.set(property2, value);
                if (wait) {
                    this._waitingList.delete(property2);
                    if (this._waitingList.size === 0) {
                        if (!this._connected) this._connected = true;
                    }
                }
                if (reflect && attributeValue !== value && attributeValue !== JSON.stringify(value)) {
                    this._updateAttribute(attributeName, value);
                }
                if (this._connected && render) {
                    this._actuallyRender();
                }
            }
        });
    }
    _update(name, newValue) {
        const property3 = convertDashToCamel(name);
        if (property3 in this) {
            if (this[property3] !== newValue && JSON.stringify(this[property3]) !== newValue) {
                try {
                    this[property3] = isNull(newValue) ? newValue : JSON.parse(newValue);
                } catch  {
                    this[property3] = newValue;
                }
            }
        } else {
            throw new ShadowError(`The property '${property3}' doen't exist on '${this.constructor.name}'.`);
        }
    }
    addCss(ruleSet, render = false) {
        this._dynamicCssStore.push(createTemplate(`<style>${ruleSet}</style>`));
        if (render && this._connected) this._actuallyRender();
    }
    _createFragment(...input) {
        const documentFragment = document.createDocumentFragment();
        input.flat(2).forEach((data)=>{
            if (isHReturn(data)) {
                const { element , collection  } = data;
                documentFragment.appendChild(element);
                collection.forEach(({ target , queries , eventsAndListeners  })=>{
                    queries.forEach(({ kind , selector  })=>kind === "id" ? this.dom.id[selector] = target : this.dom.class[selector] ? this.dom.class[selector].push(target) : this.dom.class[selector] = [
                            target
                        ]
                    );
                    eventsAndListeners.forEach(({ event , listener  })=>target.addEventListener(event, listener.bind(this))
                    );
                });
            } else {
                documentFragment.appendChild(document.createTextNode(stringify(data)));
            }
        });
        return documentFragment;
    }
    _actuallyRender() {
        if (this._renderingCount > 0) {
            this.dom.id = {};
            this.dom.class = {};
        }
        const documentFragment = this._createFragment(this.render());
        while(this.root.firstChild){
            this.root.removeChild(this.root.firstChild);
        }
        this.constructor.styles.forEach((template)=>this.root.append(template.content.cloneNode(true))
        );
        if (this._dynamicCssStore.length > 0) {
            this._dynamicCssStore.forEach((styleTemplate)=>this.root.append(styleTemplate.content.cloneNode(true))
            );
        }
        this.root.prepend(documentFragment);
        this.dispatchEvent(this._updateCustomEvent);
        this._renderingCount++;
    }
    static styles = [];
    static is;
}
function css(strings, ...values) {
    const cssTemplates = [];
    cssTemplates.push(createTemplate(`<style>${values.reduce((acc, value, i)=>{
        if (value instanceof HTMLTemplateElement) {
            cssTemplates.push(value);
            return acc + strings[i + 1];
        } else {
            return acc + value + strings[i + 1];
        }
    }, strings[0])}</style>`));
    return cssTemplates;
}
function customElement(tagName) {
    return (clazz)=>{
        Object.defineProperty(clazz, "is", {
            value: tagName
        });
        window.customElements.define(tagName, clazz);
        return clazz;
    };
}
function property({ reflect =true , render =true , wait =false , assert =false  } = {}) {
    return (protoOrDescriptor, name)=>{
        if (protoOrDescriptor.constructor.observedAttributes === undefined) {
            protoOrDescriptor.constructor.observedAttributes = [];
        }
        if (reflect === true) {
            protoOrDescriptor.constructor.observedAttributes.push(convertCamelToDash(name));
        }
        if (!protoOrDescriptor.__propertiesAndOptions) {
            Object.defineProperty(protoOrDescriptor, "__propertiesAndOptions", {
                enumerable: false,
                configurable: true,
                writable: false,
                value: []
            });
        }
        protoOrDescriptor.__propertiesAndOptions.push({
            property: name,
            reflect,
            render,
            wait,
            assert
        });
    };
}
function _applyDecoratedDescriptor(target, property4, decorators, descriptor, context) {
    var desc1 = {};
    Object.keys(descriptor).forEach(function(key) {
        desc1[key] = descriptor[key];
    });
    desc1.enumerable = !!desc1.enumerable;
    desc1.configurable = !!desc1.configurable;
    if ("value" in desc1 || desc1.initializer) {
        desc1.writable = true;
    }
    desc1 = decorators.slice().reverse().reduce(function(desc, decorator) {
        return decorator ? decorator(target, property4, desc) || desc : desc;
    }, desc1);
    if (context && desc1.initializer !== void 0) {
        desc1.value = desc1.initializer ? desc1.initializer.call(context) : void 0;
        desc1.initializer = undefined;
    }
    var own = Object.getOwnPropertyDescriptor(target, property4);
    if (own && (own.get || own.set)) {
        delete desc1.writable;
        delete desc1.initializer;
    }
    if (desc1.initializer === void 0) {
        Object.defineProperty(target, property4, desc1);
        desc1 = null;
    }
    return desc1;
}
function _initializerDefineProperty(target, property5, descriptor, context) {
    if (!descriptor) return;
    Object.defineProperty(target, property5, {
        enumerable: descriptor.enumerable,
        configurable: descriptor.configurable,
        writable: descriptor.writable,
        value: descriptor.initializer ? descriptor.initializer.call(context) : void 0
    });
}
var _class, _descriptor, _dec, _descriptor1, _dec1, _descriptor2, _dec2, _descriptor3, _dec3, _descriptor4, _dec4;
var _dec5 = customElement("my-example");
let MyExample = _class = _dec5(((_class = class MyExample extends Shadow {
    colors = [
        "yellow",
        "green",
        "pink",
        "red",
        "blue",
        "orange"
    ];
    constructor(){
        super();
        _initializerDefineProperty(this, "h1Content", _descriptor, this);
        _initializerDefineProperty(this, "firstContent", _descriptor1, this);
        _initializerDefineProperty(this, "secondContent", _descriptor2, this);
        _initializerDefineProperty(this, "items", _descriptor3, this);
        _initializerDefineProperty(this, "anchorAttributes", _descriptor4, this);
    }
    static styles = css`
    h1 {
      color: blue;
    }
    #myButton {
      border-radius: 30px;
    }
    .text {
      margin: 50px;
      color: brown;
    }
    a {
      color: blue;
    }
    .myLi {
      width: 200px;
      background-color: pink;
    }
  `;
    render() {
        return html`<h1>${this.h1Content}</h1>
      <button id="myButton" click=${this.clickHandler}>Count</button>
      <p class="text">You can change values through...</p>
      <p class="text">${this.firstContent}</p>
      <p class="text">${this.secondContent}</p>
      <ul>
        ${this.items.map((item)=>html`<li @class="myLi">${item}</li>`
        )}
      </ul>
      <p class="text"><a ...${this.anchorAttributes}>Anchor Text</a></p>`;
    }
    updated() {
        this.dom.class["myLi"].forEach((li, i)=>setInterval(()=>li.style.background = this.colors[Math.floor(Math.random() * 6)]
            , 500)
        );
    }
    clickHandler(e) {
        return this.h1Content++;
    }
    static observedAttributes = [
        "init-url"
    ];
}) || _class, _dec = property(), _dec1 = property(), _dec2 = property(), _dec3 = property({
    reflect: false,
    wait: true
}), _dec4 = property({
    reflect: false
}), _descriptor = _applyDecoratedDescriptor(_class.prototype, "h1Content", [
    _dec
], {
    configurable: true,
    enumerable: true,
    writable: true,
    initializer: function() {
        return 0;
    }
}), _descriptor1 = _applyDecoratedDescriptor(_class.prototype, "firstContent", [
    _dec1
], {
    configurable: true,
    enumerable: true,
    writable: true,
    initializer: function() {
        return null;
    }
}), _descriptor2 = _applyDecoratedDescriptor(_class.prototype, "secondContent", [
    _dec2
], {
    configurable: true,
    enumerable: true,
    writable: true,
    initializer: function() {
        return null;
    }
}), _descriptor3 = _applyDecoratedDescriptor(_class.prototype, "items", [
    _dec3
], {
    configurable: true,
    enumerable: true,
    writable: true,
    initializer: function() {
        return [];
    }
}), _descriptor4 = _applyDecoratedDescriptor(_class.prototype, "anchorAttributes", [
    _dec4
], {
    configurable: true,
    enumerable: true,
    writable: true,
    initializer: function() {
        return {};
    }
}), _class)) || _class;
export { MyExample as MyExample };

