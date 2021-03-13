/*
 * Generates the README.md. Not my proudest work.
 */

import { ansiRegex } from "https://deno.land/x/tty@0.1.2/mod.ts";

const decoder = new TextDecoder();
const propsAndMethods = [
  "constructor",
  "readonly",
  "connected: boolean",
  "shadowRoot",
  "dom: Dom",
  "static",
  "connectedCallback",
  "attributeChangedCallback",
  "init",
  "update",
  "dispatchCustomEvent",
  "isInEventPath",
  "changeCss",
  "getSlotElements",
  "render",
  "firstUpdated",
  "updated",
];
const regExp = /^function|^class|^type/;
const proc = Deno.run({
  cmd: ["deno", "doc", "mod.ts"],
  stdout: "piped",
  stderr: "piped",
});
const [out, errOut] = await Promise.all([proc.output(), proc.stderrOutput()]);
const status = await proc.status();
proc.close();
if (!status.success) {
  throw new Error(decoder.decode(errOut));
}

const api = decoder.decode(out)
  .split("\n")
  .map((e) => e.replace(ansiRegex(), ""))
  .map((line) => line.trim())
  .map((line) => line.match(regExp) ? `\n### ${line}\n\n` : `${line}\n`)
  .map((line) =>
    propsAndMethods.some((pOrM) => line.startsWith(pOrM))
      ? `\n#### ${line}\n`
      : line
  )
  .map((line) => line.replace(/.*Defined in file:.*/, ""))
  .join("")
  .replace(/\n\s*\n\s*\n/g, "\n\n");

const readme = Deno.readTextFileSync("./README.md");
Deno.writeTextFileSync(
  "./README.md",
  readme.replace(/## API.*/s, `## API${api}`),
);
