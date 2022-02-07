# shadow

Shadow is simple base class for creating fast, lightweight Web Components with
[htm](https://github.com/developit/htm).\
Do it all with `deno bundle`: No transpiler or other tools are required.

## Quick Start

#### Compile `example/my_example.ts`

```bash
deno bundle --config example/tsconfig.json example/my_example.ts > example/my_example.js
```

#### Serve `index.html`

```bash
deno run --allow-net --allow-read https://deno.land/std/http/file_server.ts example/
```

#### Print the documented API

```bash
deno doc https://deno.land/x/shadow/mod.ts
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
} from "https://deno.land/x/shadow/mod.ts";

@customElement("my-example")
export class MyExample extends Shadow {
  colors = ["yellow", "green", "pink", "red", "blue", "orange"];
  @property()
  h1Content = 0;
  @property()
  firstContent: Attribute = null;
  @property()
  secondContent: Attribute = null;
  @property({ reflect: false })
  items: string[] = [];
  @property({ reflect: false })
  anchorAttributes: { href?: string; ping?: string; target?: string } = {};

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
        ${this.items.map((item) => html`<li @class="myLi">${item}</li>`)}
      </ul>
      <p class="text"><a ...${this.anchorAttributes}>Anchor Text</a></p>`;
  }

  updated() {
    this.dom.class["myLi"].forEach((li, i) =>
      setInterval(
        () => (li.style.background =
          this.colors[Math.floor(Math.random() * 6)]),
        500,
      )
    );
  }

  clickHandler(e: MouseEvent) {
    return ++this.h1Content;
  }

  static observedAttributes = ["init-url"];
}
```
