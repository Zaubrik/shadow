# shadow

Shadow is a base class inheriting from HTMLElement for Web Components and Custom
Elements.

## Quick Start

Compile `example/my_example.ts`:

```bash
deno bundle --config example/tsconfig.json example/my_example.ts > example/my_example.js
```

Serve the `index.html` file:

```bash
deno run --allow-net --allow-read https://deno.land/std/http/file_server.ts example/
```

Print the documented API:

```bash
deno doc mod.ts
```

## Example

```typescript
import {
  Attribute,
  css,
  customElement,
  html,
  property,
  Shadow,
} from "https://deno.land/x/shadow/mod.ts"

@customElement("my-example")
export class MyExample extends Shadow {
  colors = ["yellow", "green", "pink", "red", "blue", "orange"]
  @property()
  h1Content = 0
  @property()
  firstContent: Attribute = null
  @property()
  secondContent: Attribute = null
  @property({ reflect: false, wait: true })
  items: string[] = []

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
    .myLi {
      width: 200px;
      background-color: pink;
    }
  `

  render() {
    return html`<h1>${this.h1Content}</h1>
      <button id="myButton" click=${this.clickHandler}>Count</button>
      <p class="text">You can change values through...</p>
      <p class="text">${this.firstContent}</p>
      <p class="text">${this.secondContent}</p>
      <ul>
        ${this.items.map((item) => html`<li @class="myLi">${item}</li>`)}
      </ul>`
  }

  updated() {
    this.dom.class["myLi"].forEach((li, i) =>
      setInterval(
        () =>
          (li.style.background = this.colors[
            Math.floor(Math.random() * (5 - 0 + 1)) + 0
          ]),
        500
      )
    )
  }

  clickHandler(e: MouseEvent) {
    return this.h1Content++
  }
}
```

## API

### class Shadow extends HTMLElement

This class is the reason why you are here.

#### constructor()

#### connected: boolean

This boolean will be `true` when `connectedCallback` has been called and all
explicitly awaited properties have been set (the `waitingList` is empty).

#### shadowRoot: ShadowRoot

#### dom: Dom

The child elements, which match the id and class selectors marked with the `@`
sign, are stored in the `dom` object.

#### static styles: HTMLTemplateElement[]

The return type of the function `css`, which is an array of HTMLTemplateElements
containing a script element, is assigned to this static property.

#### static is?: string

The decorator `customElement` - if used - sets this static property to the
custom element's tag name automatically.

#### connectedCallback()

A native custom elements'
[lifecycle callback](https://developer.mozilla.org/en-US/docs/Web/Web_Components/Using_custom_elements).
When you use this callback, you probably want to call
`super.connectedCallback()` inside of it.

#### attributeChangedCallback(name: string, oldValue: Attribute, newValue: Attribute)

A native custom elements' lifecycle callback. Here, it manages the reflecting of
properties to attributes.

#### init(propertiesAndOptions: PropertyAndOptions[]): void

Call this method in 'connectedCallback' if you want to avoid using the
'property' decorator. It assigns the accessors to the element's properties and
starts rendering.

#### update(name: string, newValue: Attribute): void

Reflects properties to attributes.

#### render?(): AllowedExpressions

Is called by the method `actuallyRender` which renders the custom element. It
must return the return type of the function `html` which is
`AllowedExpressions`.

#### firstUpdated?(event: Event): void

A modifiable lifecycle callback which is called after the first update which
includes rendering.

#### updated?(event: Event): void

A modifiable lifecycle callback which is called after each update which includes
rendering.

### function html(strings: TemplateStringsArray, ...values: AllowedExpressions[]) => AllowedExpressions

Uses [htm (Hyperscript Tagged Markup)](https://github.com/developit/htm) under
the hood which uses standard JavaScript Tagged Templates and works in all modern
browsers. The function `html` takes a _tagged template_ and processes the
`AllowedExpressions` where `false` and `null` are converted to an empty string
and the `numbers` are _stringified_. The elements matching the id and class
selectors marked with an `@` sign will later be added to the `this.dom` object.
We add the `EventListeners` with `addEventListener(event, listener.bind(this))`
so that you don't need to use arrow functions anymore. It parses SVG elements as
well.

### function css(strings: TemplateStringsArray, ...values: (string | HTMLTemplateElement)[]): HTMLTemplateElement[]

The `css` tag function parses css strings which can contain expressions with the
type string or HTMLTemplateElements (containing a script element).

### function customElement(tagName: string): (clazz: Constructor<HTMLElement>) => void

The `customElement` decorator takes the tag name of the custom element and
registers the custom element. The same tag name is assigned to the static `is`
property.

### function property({reflect, render, wait, assert}: Omit<PropertyAndOptions, "property">)

The `property` decorator takes an optional object as argument with four optional
properties:

1.  Setting `reflect` to false would stop the element's attribute from
    synchronising.
2.  If you don't want the changing of the property to cause a rerendering, then
    set `render` to false.
3.  If you plan to use properties instead of attributes as data input, setting
    `wait` to true would reduce the amount of renderings from 2 to 1 (you can
    just ignore it).
4.  The `assert` boolean checks if the input has a truthy value.
