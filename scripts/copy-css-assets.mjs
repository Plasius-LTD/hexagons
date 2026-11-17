import { copyFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { argv, cwd } from "node:process";

const output = argv[2];
if (output !== "dist" && output !== "dist-cjs") {
  throw new Error("Expected dist or dist-cjs output");
}

const root = cwd();
const asset = "styles/game.module.css";
const target = join(root, output, asset);
mkdirSync(dirname(target), { recursive: true });
copyFileSync(join(root, "src", asset), target);
