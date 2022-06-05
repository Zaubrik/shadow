import { SimpleCounter } from "./simpleCounter.js";
import { css } from "../mod.js";

export class NiceCounter extends SimpleCounter {
  h2Content = "h2";
  connectedCallback() {
    super.connectedCallback();
    this.init([{ property: "h2Content" }]);
  }

  static styles = css`
  @import url("https://cdn.jsdelivr.net/gh/timonson/salad@latest/web/css/link.css");
  ${SimpleCounter.styles}
    #myButton {
      border-radius: 30px;
      background-color:orange;
    }
  `;
}

window.customElements.define("nice-counter", NiceCounter);
