// @ts-check
import { createTemplate } from "./util.js";

/**
 * The 'css' tag function parses template literals which can contain expressions
 * of the type 'string' or 'HTMLTemplateElement'.
 * @param {TemplateStringsArray} strings
 * @param {(string | HTMLTemplateElement | HTMLTemplateElement[])[]} values
 * @returns {HTMLTemplateElement[]}
 */
export function css(strings, ...values) {
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
