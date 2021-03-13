import { assertEquals } from "https://deno.land/std@0.88.0/testing/asserts.ts";
import { html } from "../html.ts";

function foo() {}
function bar() {}
function foobar() {}

Deno.test("[html] value is false", function (): void {
  const anchorHref = null;
  const content = false;
  const actual = html
    `<a @id="aId click=${foo} mouseover=${bar}" href="${anchorHref}">${content}</a>`;
  const expected = {
    htmlString: '<a  id="aId" ></a>',
    selectorAndKindAndEvents: [
      {
        eventsAndListeners: [
          [
            "click",
            foo,
          ],
          ["mouseover", bar],
        ],
        kind: "id",
        selector: "aId",
      },
    ],
  };
  assertEquals(actual, expected);
});

Deno.test("[html] attribute value is null", function (): void {
  const anchorHref = null;
  const content = "CONTENT";
  const actual = html
    `<a @id="aId click=${foo} mouseover=${bar}" href="${anchorHref}">${content}</a>`;
  const expected = {
    htmlString: '<a  id="aId" >CONTENT</a>',
    selectorAndKindAndEvents: [
      {
        eventsAndListeners: [
          [
            "click",
            foo,
          ],
          ["mouseover", bar],
        ],
        kind: "id",
        selector: "aId",
      },
    ],
  };
  assertEquals(actual, expected);
});

Deno.test("[html] several listeners", function (): void {
  const anchorHref = "/about";
  const content = "CONTENT";
  const actual = html
    `<a href="${anchorHref}" @id="aId click=${foo} mouseover=${bar}" z-index="2">${content}</a>`;
  const expected = {
    htmlString: '<a href="/about"  id="aId" z-index="2">CONTENT</a>',
    selectorAndKindAndEvents: [
      {
        eventsAndListeners: [
          [
            "click",
            foo,
          ],
          [
            "mouseover",
            bar,
          ],
        ],
        kind: "id",
        selector: "aId",
      },
    ],
  };
  assertEquals(actual, expected);
});

Deno.test("[html] multible lines", function (): void {
  const anchorHref = null;
  const content = "CONTENT";
  const actual = html`<a 
   href="${anchorHref}"
   @class="first-class secondClass click=${foo} mouseover=${bar}"
   z-index="2">
  ${content}
</a>`;
  const expected = {
    htmlString:
      '<a \n   \n    class="first-class secondClass"\n   z-index="2">\n  CONTENT\n</a>',
    selectorAndKindAndEvents: [
      {
        eventsAndListeners: [
          [
            "click",
            foo,
          ],
          [
            "mouseover",
            bar,
          ],
        ],
        kind: "class",
        selector: "first-class",
      },
    ],
  };
  assertEquals(actual, expected);
});

Deno.test("[html] embeded html function call", function (): void {
  const anchorHref = null;
  const content = "CONTENT";
  const span = "SPAN";
  const actual = html`<a 
   href="${anchorHref}"
   @class="first-class secondClass click=${foo} mouseover=${bar}"
   z-index="2">
    ${content}${span &&
    html`<span @id="spanId change=${foobar}">${span}</span>`}
</a>`;
  const expected = {
    htmlString:
      '<a \n   \n    class="first-class secondClass"\n   z-index="2">\n    CONTENT<span  id="spanId">SPAN</span>\n</a>',
    selectorAndKindAndEvents: [
      {
        eventsAndListeners: [
          [
            "click",
            foo,
          ],
          [
            "mouseover",
            bar,
          ],
        ],
        kind: "class",
        selector: "first-class",
      },
      {
        eventsAndListeners: [
          [
            "change",
            foobar,
          ],
        ],
        kind: "id",
        selector: "spanId",
      },
    ],
  };
  assertEquals(actual, expected);
});

Deno.test("[html] string array", function (): void {
  const anchorHref = null;
  const content = ["CONTENT", "CONTENT"];
  const actual = html
    `<a @id="aId click=${foo}   change=${foobar}" href="${anchorHref}">${
      content.map((c) => c + "changed")
    }</a>`;
  const expected = {
    htmlString: '<a  id="aId" >CONTENTchangedCONTENTchanged</a>',
    selectorAndKindAndEvents: [
      {
        eventsAndListeners: [
          [
            "click",
            foo,
          ],
          ["change", foobar],
        ],
        kind: "id",
        selector: "aId",
      },
    ],
  };
  assertEquals(actual, expected);
});

Deno.test("[html] empty array", function (): void {
  const anchorHref = null;
  const content: string[] = [];
  const actual = html
    `<a @id="aId click=${foo}" href="${anchorHref}">${content}</a>`;
  const expected = {
    htmlString: '<a  id="aId" ></a>',
    selectorAndKindAndEvents: [
      {
        eventsAndListeners: [
          [
            "click",
            foo,
          ],
        ],
        kind: "id",
        selector: "aId",
      },
    ],
  };
  assertEquals(actual, expected);
});

Deno.test("[html] embedded html array", function (): void {
  const anchorHref = null;
  const content = ["CONTENT", "CONTENT"];
  const actual = html`<ul @id="aId click=${foo}" href="${anchorHref}">${
    content.map((c) => html`<li @class="aLi change=${foobar}">${c}</li>`)
  }</ul>`;
  const expected = {
    htmlString:
      '<ul  id="aId" ><li  class="aLi">CONTENT</li><li  class="aLi">CONTENT</li></ul>',
    selectorAndKindAndEvents: [
      {
        eventsAndListeners: [
          [
            "click",
            foo,
          ],
        ],
        kind: "id",
        selector: "aId",
      },
      {
        eventsAndListeners: [
          [
            "change",
            foobar,
          ],
        ],
        kind: "class",
        selector: "aLi",
      },
    ],
  };
  assertEquals(actual, expected);
});

Deno.test("[html] embedded html array with several listeners", function (): void {
  const anchorHref = null;
  const content = ["CONTENT", "CONTENT"];
  const actual = html`<ul @id="aId click=${foo}" href="${anchorHref}">${
    content.map((c, i) => {
      return i === 1
        ? html
          `<li @class="aLi change=${foobar}" @id="liId mouseover=${bar}">${c}</li>`
        : html`<li @class="aLi change=${foobar}">${c}</li>`;
    })
  }</ul>`;
  const expected = {
    htmlString:
      '<ul  id="aId" ><li  class="aLi">CONTENT</li><li  class="aLi"  id="liId">CONTENT</li></ul>',
    selectorAndKindAndEvents: [
      {
        eventsAndListeners: [
          [
            "click",
            foo,
          ],
        ],
        kind: "id",
        selector: "aId",
      },
      {
        eventsAndListeners: [
          [
            "change",
            foobar,
          ],
        ],
        kind: "class",
        selector: "aLi",
      },
      {
        eventsAndListeners: [
          [
            "mouseover",
            bar,
          ],
        ],
        kind: "id",
        selector: "liId",
      },
    ],
  };
  assertEquals(actual, expected);
});
