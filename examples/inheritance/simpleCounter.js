import { css, Shadow } from "../../mod.js";

export class SimpleCounter extends Shadow {
  h1Content = 0;
  content = "";

  static properties = {
    h1Content: {},
    content: { reflect: true },
  };

  add() {
    return ++this.h1Content;
  }

  static styles = css`
    h1 {
      color: red;
    }
  `;

  static observedAttributes = ["content"];
}
