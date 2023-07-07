import { css, html, Shadow } from "../../mod.js";

export class RpcElement extends Shadow {
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
