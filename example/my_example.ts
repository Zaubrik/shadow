import {
  Attribute,
  css,
  customElement,
  html,
  property,
  Shadow,
} from "../mod.ts";

@customElement()
export class MyExample extends Shadow {
  @property()
  h1Content = 0;
  @property()
  firstContent: Attribute = "";
  @property()
  secondContent: Attribute = "";
  @property({ reflect: false, wait: true })
  items: string[] = [];

  static styles = css`
    h1 {
      color: blue;
    }
    #myButton {
      border-radius: 30px;
    }
    .text {
      margin:50px;
      color: brown;
    }
    .myLi {
      width: 200px;
    }
  `;

  render() {
    return html` <h1>${this.h1Content}</h1>
      <button @id="myButton click=${this.clickHandler}">Count</button>
      <p class="text">You can change values through...</p>
      <p class="text">${this.firstContent}</p>
      <p class="text">${this.secondContent}</p>
      <ul>
        ${this.items.map((item) => `<li @class="myLi">${item}</li>`)}
      </ul>`;
  }

  updated() {
    let delay = 0;
    const colors = ["yellow", "green", "pink"];
    this.dom.class["myLi"].forEach((li, i) =>
      setTimeout(() => (li.style.background = colors[i]), (delay += 500))
    );
  }

  clickHandler(e: MouseEvent) {
    return this.h1Content++;
  }
}