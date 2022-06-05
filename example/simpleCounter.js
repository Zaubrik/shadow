import { css, html, Shadow } from "../mod.js";

export class SimpleCounter extends Shadow {
  h1Content = 0;
  content = "";

  connectedCallback() {
    super.connectedCallback();
    this.init([
      { property: "h1Content" },
    ]);
  }

  static styles = css`
    h1 {
      color: red;
    }
  `;

  render() {
    return html`<h1 @id="heading">${this.h1Content}</h1>
      <div><button id="myButton" class="link" click=${this.clickHandler}>${this.content}</button></div>`;
  }

  clickHandler(_e) {
    return ++this.h1Content;
  }

  static observedAttributes = ["content"];
}

window.customElements.define("simple-counter", SimpleCounter);
