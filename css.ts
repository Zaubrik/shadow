import { createHtmlTemplate } from "./util.ts";

/**
 * The `css` tag function parses css strings which can contain expressions with
 * the type string or HTMLTemplateElements (containing a script element).
 */
export function css(
  strings: TemplateStringsArray,
  ...values: (string | HTMLTemplateElement)[]
): HTMLTemplateElement[] {
  const cssTemplates = [];
  cssTemplates.push(
    createHtmlTemplate(`<style>${
      values.reduce(
        (acc, value, i) => {
          if (value instanceof HTMLTemplateElement) {
            cssTemplates.push(value);
            return acc + strings[i + 1];
          } else {
            return acc + value + strings[i + 1];
          }
        },
        strings[0],
      )
    }</style>`),
  );
  return cssTemplates;
}
