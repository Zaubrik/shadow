import { css, html, Shadow } from "../../mod.js";

export class HtmlWrapper extends Shadow {
  static observedAttributes = ["html-url"];

  static styles = css`
    :host {
      display: block;
    }`;

  render() {
    return html`<slot>${this.htmlData}</slot>`;
  }
}

window.customElements.define("html-wrapper", HtmlWrapper);
