import { css, html, Shadow } from "https://deno.land/x/shadow@v1.0.9/mod.js";

export class MyElement extends Shadow {
  colors = ["yellow", "green", "pink", "red", "blue", "orange"];
  initUrl = null;
  h1Content = 0;
  firstContent = null;
  secondContent = null;
  /** @type {string[]} */
  items = [];
  anchorAttributes = {};

  connectedCallback() {
    super.connectedCallback();
    this.declare([
      { property: "h1Content" },
      { property: "secondContent" },
      { property: "anchorAttributes" },
    ]);
  }

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
        ${this.items.map((item) => html`<li @class="myLi">${item}</li>`)}
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

  static observedAttributes = ["init-url", "first-content"];
}

window.customElements.define("my-element", MyElement);
