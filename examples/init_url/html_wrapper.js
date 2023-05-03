import { css, html, Shadow } from "../../mod.js";

export class HtmlWrapper extends Shadow {
  initUrl = null;
  /** @type {string} */
  data = "";

  static properties = {};

  static observedAttributes = ["init-url"];

  static styles = css`
    :host {
      display: block;
    }
     
    
  `;

  render() {
    return html`${this.data}`;
  }
}

window.customElements.define("html-wrapper", HtmlWrapper);
