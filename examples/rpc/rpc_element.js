import { css, html, Shadow } from "../../mod.js";

/**
 * @typedef {string | null } Attribute
 */

export class RpcElement extends Shadow {
  /** @type {Attribute} text */
  text = "";
  /** @type {Attribute} name */
  name = "";

  static properties = {
    text: { rpc: "animalsMakeNoise" },
    name: { rpc: "makeName" },
  };

  static styles = css`
    :host {
      display: block;
    }`;

  render() {
    return html`<p>${this.rpcData.animalsMakeNoise}</p><p>${this.rpcData.makeName}</p>`;
  }
}

window.customElements.define("rpc-element", RpcElement);
