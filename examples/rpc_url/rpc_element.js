import { css, html, Shadow } from "../../mod.js";

export class RpcElement extends Shadow {
  /**@type {string[]}*/
  animalsMakeNoise;
  /**@type {Record<string,string>}*/
  makeName;

  static properties = {
    animalsMakeNoise: { rpc: "animalsMakeNoise", assert: true },
    makeName: { rpc: "makeName", assert: true },
  };

  static styles = css`
    :host {
      display: block;
    }
  `;

  render() {
    return html`<p>${this.rpcData.animalsMakeNoise}</p>
      <p>${this.rpcData.makeName}</p>`;
  }
}

window.customElements.define("rpc-element", RpcElement);
