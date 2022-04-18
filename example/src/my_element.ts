import {
  Attribute,
  css,
  customElement,
  html,
  property,
  Shadow,
} from "../../mod.ts";

@customElement("my-element")
export class MyElement extends Shadow {
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
    this.dom.class["myLi"].forEach((li) =>
      setInterval(
        () => (li.style.background =
          this.colors[Math.floor(Math.random() * 6)]),
        500,
      )
    );
  }

  clickHandler(_e: MouseEvent) {
    return ++this.h1Content;
  }

  static observedAttributes = ["init-url"];
}
