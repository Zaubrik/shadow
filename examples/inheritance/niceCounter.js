import { SimpleCounter } from "./simpleCounter.js";
import { css, html } from "../../mod.js";

export class NiceCounter extends SimpleCounter {
  h2Content = "h2";

  static properties = { h2Content: {}, ...SimpleCounter.properties };

  static styles = css`
  /** external styles */
    @import url("https://cdn.jsdelivr.net/gh/timonson/salad@latest/web/css/link.css");
  /** parent styles */
    ${SimpleCounter.styles}
  /** own styles */
    #myButton {
      border-radius: 30px;
      background-color: orange;
      cursor: pointer;
    }
  `;

  subtract() {
    return this.h1Content -= 2;
  }

  render() {
    return html`<h1 @id="heading">${this.h1Content}</h1>
      <div>
        <button @id="myButton" class="link" click=${[this.add, this.subtract]}>
          ${this.content}
        </button>
      </div>`;
  }
}

window.customElements.define("nice-counter", NiceCounter);
