import { createTemplate } from "./util.ts";

/**
 * The `css` tag function parses template literals which can contain expressions
 * of the type `string` or `HTMLTemplateElement`.
 */
export function css(
  strings: TemplateStringsArray,
  ...values: (string | HTMLTemplateElement | HTMLTemplateElement[])[]
): HTMLTemplateElement[] {
  const cssTemplates = [];
  cssTemplates.push(
    createTemplate(`<style>${
      values.reduce(
        (acc, value, i) => {
          if (value instanceof HTMLTemplateElement) {
            cssTemplates.push(value);
            return acc + strings[i + 1];
          } else if (
            Array.isArray(value)
          ) {
            value.forEach((el) => cssTemplates.push(el));
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
