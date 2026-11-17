import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, beforeEach, expect, it } from "vitest";
import { copyCssAssets } from "../scripts/copy-css-assets.mjs";

const asset = "styles/game.module.css";
const css = Buffer.from(".tile { display: grid; }\n");
let root: string;

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "hexagons-css-"));
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

it.each(["dist", "dist-cjs"])("copies the CSS bytes to %s", (output) => {
  const source = join(root, "src", asset);
  mkdirSync(dirname(source), { recursive: true });
  writeFileSync(source, css);

  copyCssAssets(root, output);

  expect(readFileSync(join(root, output, asset))).toEqual(css);
});

it.each(["dist", "dist-cjs"])("rejects missing source even when %s has a stale copy", (output) => {
  const stale = join(root, output, asset);
  mkdirSync(dirname(stale), { recursive: true });
  writeFileSync(stale, css);

  expect(() => copyCssAssets(root, output)).toThrow(/ENOENT/);
});

it.each(["dist", "dist-cjs"])("rejects a destination collision in %s", (output) => {
  const source = join(root, "src", asset);
  mkdirSync(dirname(source), { recursive: true });
  writeFileSync(source, css);
  mkdirSync(join(root, output, asset), { recursive: true });

  expect(() => copyCssAssets(root, output)).toThrow();
});

it("rejects output outside the two package trees", () => {
  expect(() => copyCssAssets(root, "../other")).toThrow(/Expected dist or dist-cjs output/);
});
