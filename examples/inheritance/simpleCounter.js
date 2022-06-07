// @ts-check
import { css, Shadow } from "../../mod.js";

export class SimpleCounter extends Shadow {
  h1Content = 0;
  content = "";

  connectedCallback() {
    this.declareWithoutRendering([
      { property: "h1Content" },
      { property: "content", reflect: true },
    ]);
  }

  /**
   * Renaming 'declare' avoids an additional rendering here.
   * @typedef {import('../../shadow.js').PropertyAndOptions} PropertyAndOptions
   * @param {PropertyAndOptions[]} propertiesAndOptions
   */
  declareWithoutRendering(propertiesAndOptions) {
    //@ts-ignore private method
    propertiesAndOptions.forEach(this._makePropertyAccessible);
  }

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
