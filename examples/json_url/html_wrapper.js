import { css, html, Shadow } from "../../mod.js";

export class HtmlWrapper extends Shadow {
  static observedAttributes = ["json-url"];

  static styles = css`
    :host {
      display: block;
    }
  `;

  render() {
    return html`<ul>
      ${this.jsonData.map((data) => html`<li>${data}</li>`)}
    </ul>`;
  }
}

window.customElements.define("html-wrapper", HtmlWrapper);
