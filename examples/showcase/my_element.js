import { css, html, Shadow } from "../../mod.js";

export class MyElement extends Shadow {
  colors = ["yellow", "green", "pink", "red", "blue", "orange"];
  jsonUrl = null;
  h1Content = 0;
  firstContent = null;
  secondContent = null;
  anchorAttributes = {};

  static properties = {
    h1Content: {},
    secondContent: {},
    anchorAttributes: {},
  };

  static observedAttributes = ["json-url", "first-content"];

  static styles = css`
    :host {
      display: block;
      margin: 16px;
    }
    h1 {
      color: blue;
    }
    #myButton {
      border-radius: 30px;
    }
    .text {
      margin: 50px;
      color: brown;
    }
    a {
      color: blue;
    }
    .myLi {
      width: 200px;
      background-color: pink;
    }
  `;

  render() {
    return html`<h1>${this.h1Content}</h1>
      <button id="myButton" click=${this.clickHandler}>Count</button>
      <p class="text">You can change values through...</p>
      <p class="text">${this.firstContent}</p>
      <p class="text">${this.secondContent}</p>
      <ul>
        ${
      this.jsonData.items.map((item) => html`<li @class="myLi">${item}</li>`)
    }
      </ul>
      <p class="text"><a ...${this.anchorAttributes}>Anchor Text</a></p>`;
  }

  updated() {
    this.dom.class["myLi"]?.forEach((li) =>
      setInterval(
        () => (li.style.background =
          this.colors[Math.floor(Math.random() * 6)]),
        500,
      )
    );
  }

  clickHandler() {
    return ++this.h1Content;
  }
}

window.customElements.define("my-element", MyElement);
