# shadow

Shadow is a base class inheriting from HTMLElement for Web Components and Custom
Elements.

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

Print the documented API:

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

@customElement("my-example")
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
      <h1 id="heading">${this.h1Content}</h1>
      <p>${this.pContent}</p>
      <button @id="myButton" click=${this.clickHandler}>Count</button>
    `
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

#### update(name: string, newValue: Attribute, isRendering): void

Reflects properties to attributes and calls `actuallyRender` if the optional
boolean `isRendering` is true (default: true).

#### getSlotElements(): HTMLElement[]

Returns an array of the slot elements of the custom element.

#### render(): AllowedExpressions

Is called by the method `actuallyRender` which renders the custom element. It
must return the return type of the function `html`.

#### firstUpdated?(): void

A modifiable lifecycle callback which is called after the first update which
includes rendering.

#### updated?(): void

A modifiable lifecycle callback which is called after each update which includes
rendering.

### function html( strings: TemplateStringsArray, ...values: AllowedExpressions[]) => AllowedExpressions

Uses [htm (Hyperscript Tagged Markup)](https://github.com/developit/htm) under
the hood which uses standard JavaScript Tagged Templates and works in all modern
browsers. The function `html` takes a _tagged template_ and processes the
`AllowedExpressions` where `false` and `null` are converted to an empty string
and the `numbers` are _stringified_. The elements matching the id and class
selectors marked with an `@` sign will later be added to the `this.dom` object.
We add the `EventListeners` with `addEventListener(event, listener.bind(this))`
so that you don't need to use arrow functions anymore.

### function css(strings: TemplateStringsArray, ...values: (string | HTMLTemplateElement)[])

The `css` tag function parses css strings which can contain expressions with the
type string or HTMLTemplateElements (containing a script element).

### function customElement(tagName): (clazz: Constructor<HTMLElement>) => void

The decorator `customElement` takes the tag name of the custom element and
registers the custom element. If no tag name is passed, the class name is used
instead through converting it from CamelCase to dash-case. The same tag name is
assigned to the static `is` property.

### function property({reflect, wait, assert}: Omit<PropertyAndOptions, "property">)

The decorator `property` takes an optional object as argument with three
optional properties:

- Setting `reflect` to false would stop the element's attribute from
  synchronising.
- If you plan to use properties instead of attributes as data input, setting
  `wait` to true would reduce the amount of renderings from 2 to 1 (you can just
  ignore it).
- The `assert` boolean checks if the input has a truthy value.
