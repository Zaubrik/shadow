# shadow

Shadow is a simple base class for creating fast, lightweight
[Web Components](https://developer.mozilla.org/en-US/docs/Web/Web_Components)
with [htm](https://github.com/developit/htm).

Written in JavaScript but **strictly typed** with
[JSDoc](https://www.typescriptlang.org/docs/handbook/jsdoc-supported-types.html),
you don't need any transpiler or other tools. Although
[deno](https://deno.land/) would certainly make the development process a
greater joy.

## Quick Start

#### Serve example

```bash
deno task serve
```

#### Type check your custom element

```bash
deno check ./examples/showcase/my_element.js
```

#### Print the documented API

```bash
deno doc https://dev.zaubrik.com/shadow/mod.js
```

## Example

```javascript
import { css, html, Shadow } from "../../mod.js";

export class MyElement extends Shadow {
  colors = ["yellow", "green", "pink", "red", "blue", "orange"];
  jsonUrl = null;
  h1Content = 0;
  firstContent = null;
  secondContent = null;
  anchorAttributes = {};

  static properties = {
    h1Content: {},
    secondContent: {},
    anchorAttributes: {},
  };

  static observedAttributes = ["json-url", "first-content"];

  static styles = css`
    :host {
      display: block;
      margin: 16px;
    }
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
        ${
      /**@type {string[]}*/ (this.jsonData.items).map((item) =>
        html`<li @class="myLi">${item}</li>`
      )
    }
      </ul>
      <p class="text"><a ...${this.anchorAttributes}>Anchor Text</a></p>`;
  }

  updated() {
    this.dom.class["myLi"]?.forEach((li) =>
      setInterval(
        () => (li.style.background =
          this.colors[Math.floor(Math.random() * 6)]),
        500,
      )
    );
  }

  clickHandler() {
    return ++this.h1Content;
  }
}

window.customElements.define("my-element", MyElement);
```

## Attributes and Properties

### Attributes

- You can freely add and set attributes with the type `string | null`.
- Changing an attribute alone does **not** cause a **rerendering** of the custom
  element.
- If you add an attribute to `observedAttributes`, `Shadow` assigns the observed
  attribute's value to the element's property.
  - The property must be defined on the class. Otherwise the property is
    ignored.
  - The property name is the _camel-cased_ attribute name.

### Properties

You can freely define properties on your class. But you can also specify
properties which cause a **rerendering** of the custom element on new asignments
with:

```ts
static properties = { <propertyName> : {
reflect?: boolean,
render?: boolean,
wait?: boolean,
assert?: boolean,
rpc?: string
}}
```

You can pass the following options:

1. Setting 'reflect' to 'true' configures a property so that whenever it
   changes, its value is reflected to its corresponding attribute. Only JSON
   values can be reflected to attributes. (false)
2. Setting 'render' to 'false' stops rerendering on property changes. (true)
3. Wait for an assignment before rendering with the option 'wait'. (false)
4. Assert with the option 'assert' if the input has a _truthy_ value. (false)
5. Sets the RPC method name with `rpc`.

## Discord

Feel free to ask questions and start discussions in our
[discord server](https://discord.gg/6spYphKXAt).

## Contribution

We welcome and appreciate all contributions to shadow.
