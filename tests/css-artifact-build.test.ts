import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

const asset = "styles/game.module.css";
const css = Buffer.from(".tile { display: grid; }\n");
const cli = vi.hoisted(() => ({ root: "", output: "" }));

vi.mock("node:process", () => ({
  get argv() {
    return ["node", "copy-css-assets.mjs", cli.output];
  },
  cwd: () => cli.root,
}));

function runCopy(output: string) {
  cli.output = output;
  vi.resetModules();
  return import("../scripts/copy-css-assets.mjs");
}

beforeEach(() => {
  cli.root = mkdtempSync(join(tmpdir(), "hexagons-css-"));
});

afterEach(() => {
  rmSync(cli.root, { recursive: true, force: true });
});

it.each(["dist", "dist-cjs"])("copies the CSS bytes to %s", async (output) => {
  const source = join(cli.root, "src", asset);
  mkdirSync(dirname(source), { recursive: true });
  writeFileSync(source, css);

  await runCopy(output);

  expect(readFileSync(join(cli.root, output, asset))).toEqual(css);
});

it.each(["dist", "dist-cjs"])("rejects missing source even when %s has a stale copy", async (output) => {
  const stale = join(cli.root, output, asset);
  mkdirSync(dirname(stale), { recursive: true });
  writeFileSync(stale, css);

  await expect(runCopy(output)).rejects.toThrow(/ENOENT/);
});

it.each(["dist", "dist-cjs"])("rejects a destination collision in %s", async (output) => {
  const source = join(cli.root, "src", asset);
  mkdirSync(dirname(source), { recursive: true });
  writeFileSync(source, css);
  mkdirSync(join(cli.root, output, asset), { recursive: true });

  await expect(runCopy(output)).rejects.toThrow(/EISDIR|EEXIST/);
});

it("rejects output outside the two package trees", async () => {
  await expect(runCopy("../other")).rejects.toThrow(/Expected dist or dist-cjs output/);
});
