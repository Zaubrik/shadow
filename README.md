# shadow

Shadow is a dependency-free base class inheriting from HTMLElement - makes
native Custom Elements simple and fun.

## Quick Start

Compile `example/my_example.ts`:

```bash
deno bundle --no-check example/my_example.ts > example/my_example.js
# Add a tsconfig.json with DOM types to enable type checking:
# deno bundle --config tsconfig.json example/my_example.ts > example/my_example.js
```

Serve the `index.html` file:

```bash
deno run --allow-net --allow-read https://deno.land/std/http/file_server.ts example/
```

Print the commented API:

```bash
deno doc mod.ts
```

## Example

```typescript
import {
  css,
  customElement,
  html,
  property,
  Shadow,
} from "https://deno.land/x/shadow/mod.ts"

@customElement()
export class MyExample extends Shadow {
  @property()
  h1Content = 0
  @property()
  pContent = "some text"

  clickHandler(e: MouseEvent) {
    return this.h1Content++
  }

  static styles = css`
    h1 {
      color: blue;
    }
    #myButton {
      color: green;
    }
  `

  render() {
    return html`
      <h1>${this.h1Content}</h1>
      <p>${this.pContent}</p>
      <button @id="myButton click=${this.clickHandler}">Count</button>
    `
  }
}
```

## API

### function html(strings: TemplateStringsArray, ...expressions: AllowedExpressions[]): Html

The `html` tag function parses html strings containing the special marker `@`
and various `AllowedExpressions`. Putting an `@` before `id` or `class` in your
html code has two effects:

1. The element(s) matching the selector will be queried and added to the
   this.dom object. All matching class elements or one id element. E.g. to the
   button element of `<div><button @id="myButton"></button></div>` can be
   referred with `this.dom.id["myButton"]`.
2. This allows you to add EventListeners, e.g. click=\${this.clickHandler},
   which will be added with the native addEventListener method under the hood.
   You don't need arrow functions because we use `bind(this)`.

### function css(strings: TemplateStringsArray, ...values: (string | HTMLTemplateElement)[])

The `css` tag function parses css strings which can contain expressions with the
type string or HTMLTemplateElements (containing a script element).

### function customElement(tagName)

The `customElement` decorator takes the tag name of the custom element and
registers the custom element. If no tag name is passed, the class name is used
instead through converting it from CamelCase to dash-case. The same tag name is
assigned to the static `is` property.

### function property({reflect, wait, assert}: PropertyOptions)

The `property` decorator takes an optional object as argument with three
optional properties:

- Setting `reflect` to false would stop the element's attribute from
  synchronising.
- If you plan to use properties instead of attributes as data input, setting
  `wait` to true would reduce the amount of renderings from 2 to 1 (you can just
  ignore it).
- The `assert` boolean checks if the input has a truthy value.

### class Shadow extends HTMLElement

This class is the reason why you are here.

#### constructor(init: ShadowRootInit)

#### readonly argsFromPropertyDecorator?: Required<PropertyAndPropertyOptions[]>

#### connected: boolean

This boolean will be `true` when `connectedCallback` has been called and all
explicitly awaited properties have been set (the `waitingList` is empty).

#### shadowRoot: ShadowRoot

#### dom: Dom

In the dom object are the child elements stored which match the selectors you
marked with the `@` sign in the html string.

#### static styles: HTMLTemplateElement[]

The return type of the function `css`, which is an array of HTMLTemplateElements
containing a script element, is assigned to this static property.

#### static is?: string

The decorator `customElement` - if used - sets this static property to the
custom element's tag name automatically.

#### connectedCallback()

A native custom elements'
[lifecycle callback](https://developer.mozilla.org/en-US/docs/Web/Web_Components/Using_custom_elements).
If you want to modify this callback you must call `super.connectedCallback()`
inside of it.

#### attributeChangedCallback(name: string, oldValue: Attribute, newValue: Attribute)

A native custom elements' lifecycle callback. Here, it manages the reflecting of
properties to attributes.

#### init(properties: PropertyAndPropertyOptions[]): void

Assigns the accessors to the element's properties and initializes the lifecycle
while considering the conditions coming from the `property` decorator. You will
never need to use this method if you use the `property` decorator.

#### update(name: string, newValue: Attribute, isRendering): void

Reflects properties to attributes and calls `actuallyRender` if the optional
boolean `isRendering` is true (default: true).

#### getSlotElements(): HTMLElement[]

Returns an array of the slot elements of the custom element.

#### render(): Html

Is called by the method `actuallyRender` which renders the custom element. It
must return the return type of the function `html`.

#### firstUpdated()?: void

A modifiable lifecycle callback which is called after the first update which
includes rendering.

#### updated()?: void

A modifiable lifecycle callback which is called after each update which includes
rendering.
