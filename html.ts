export type AllowedExpressions =
  | string
  | string[]
  | number
  | false
  | null
  | Html
  | Html[]
  | EventListener;
export type EventListener = (event: any) => any;
export type EventsAndListeners = [event: string, listener: EventListener][];
export type SelectorAndKindAndEvents = {
  selector: string;
  kind: string;
  eventsAndListeners: EventsAndListeners;
};

function assertString(input: unknown): string {
  return typeof input === "string"
    ? input
    : typeof input === "number"
    ? input.toString()
    : "";
}

function isPresent<T>(t: T | undefined | null | void): t is T {
  return t !== undefined && t !== null;
}

function isArrayOfHtmls(
  arr: unknown[],
): arr is Html[] {
  return arr.every((el) => el instanceof Html);
}

function replaceCharAt(str: string, index: number, replace: string) {
  return str.substring(0, index) + replace + str.substring(index + 1);
}

function getUniqueList(
  arr: SelectorAndKindAndEvents[],
  key: string,
): SelectorAndKindAndEvents[] {
  return [...new Map(arr.map((item: any) => [item[key], item])).values()];
}

/*
 * Removes Attributes if their value expression is `null`, parses embedded `Html`
 * objects, stringifies expressions and separates and sorts the htmlString,
 * eventListeners, events and id and class selectors.
 */
function sortExpressionsOut(
  strings: TemplateStringsArray,
  values: AllowedExpressions[],
): [string, EventListener[], SelectorAndKindAndEvents[]] {
  return values.reduce<[string, EventListener[], SelectorAndKindAndEvents[]]>(
    (acc, value, i) => {
      if (value instanceof Html) {
        acc[2] = [...acc[2], ...value.selectorAndKindAndEvents];
        acc[0] += value.htmlString + strings[i + 1];
        return acc;
      } else {
        if (
          (value === null) &&
          (strings[i + 1][0] === "'" || strings[i + 1][0] === '"') &&
          ['="', "='"].includes(strings[i].slice(-2))
        ) {
          acc[0] = acc[0].slice(
            0,
            acc[0].lastIndexOf(
              strings[i].slice(strings[i].lastIndexOf(" ") + 1),
            ),
          );
          acc[0] += strings[i + 1].slice(1);
          return acc;
        } else if (typeof value === "function") {
          acc[1].push(value as EventListener);
          acc[0] += strings[i + 1];
          return acc;
        } else {
          if (Array.isArray(value)) {
            if (value.length && isArrayOfHtmls(value)) {
              value.map(({ htmlString, selectorAndKindAndEvents }) => {
                acc[0] += htmlString;
                acc[2] = [...acc[2], ...selectorAndKindAndEvents];
              });
            } else {
              acc[0] += value.map(assertString).join("");
            }
          } else {
            acc[0] += assertString(value);
          }
          acc[0] += strings[i + 1];
          return acc;
        }
      }
    },
    [strings[0], [], []],
  );
}

const specialIdOrClassRegexp = /(@id=|@class=)[",',`](.*?)[",',`]/g;
const specialIdOrClassRegexpExact = /@(id|class)/;
const specialEventRegexp = /([a-z]*)=/g;
const specialIdOrClassAndOptionalEventRegexp =
  /@(?:id|class)="[^"]+?(\s[a-z]*=[^"]*)?"/g;

function parse(
  str: string,
  eventListeners: EventListener[],
): SelectorAndKindAndEvents[] {
  return [...str.matchAll(specialIdOrClassRegexp)]
    .map((input) => {
      const [, kind] = input[1].match(specialIdOrClassRegexpExact) ?? [null];
      const [selector, ...eventStrings] = input[2]
        .split(/ (.+)/)
        .filter((s) => s !== "");
      if (!kind || !selector) {
        throw TypeError("Invalid html syntax next to the special marker '@'.");
      }
      const eventsAndListeners = eventStrings.map((el) => {
        return [...el.matchAll(specialEventRegexp)].map<
          [string, EventListener]
        >((
          event,
        ) => {
          return [event[1], eventListeners.shift()!];
        });
      }).flat();
      return {
        selector,
        kind,
        eventsAndListeners,
      };
    });
}

function cleanUpString(str: string) {
  const input = [...str.matchAll(specialIdOrClassAndOptionalEventRegexp)];
  return input
    .map((e) => e[1])
    .filter(isPresent)
    .reduce(
      (acc, s) => acc.replace(s, ""),
      input.reduce(
        (acc, input) =>
          typeof input.index === "number"
            ? replaceCharAt(acc, input.index, " ")
            : acc,
        str,
      ),
    ).trim();
}

/**
 * The `html` tag function parses html strings containing the special marker `@`
 * and various `AllowedExpressions`.
 * Putting an `@` before `id` or `class` in your html code has two effects:
 * 1. The element(s) matching the selector will be queried and added to the 
 * this.dom object. All matching class elements or one id element. E.g. to the
 * button element of `<div><button @id="myButton"></button></div>` can be referred
 * with `this.dom.id["myButton"]`.
 * 2. This allows you to add EventListeners, e.g. `click=${this.clickHandler}`,
 * which will be added with the native addEventListener method under the hood.
 * You don't need arrow functions because because we use `bind(this)`.
 */
export function html(
  strings: TemplateStringsArray,
  ...expressions: AllowedExpressions[]
): Html {
  const [unfinishedHtmlString, eventListeners, embeddedTemplateAndExpressions] =
    sortExpressionsOut(
      strings,
      expressions,
    );
  return new Html(
    cleanUpString(unfinishedHtmlString),
    getUniqueList([
      ...parse(unfinishedHtmlString, eventListeners),
      ...embeddedTemplateAndExpressions,
    ], "selector"),
  );
}

export class Html {
  constructor(
    readonly htmlString: string,
    readonly selectorAndKindAndEvents: SelectorAndKindAndEvents[],
  ) {}
}
