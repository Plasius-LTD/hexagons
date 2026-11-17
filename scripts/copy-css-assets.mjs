import { copyFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";

export function copyCssAssets(root, output) {
  if (output !== "dist" && output !== "dist-cjs") {
    throw new Error("Expected dist or dist-cjs output");
  }

  const asset = "styles/game.module.css";
  const target = join(root, output, asset);
  mkdirSync(dirname(target), { recursive: true });
  copyFileSync(join(root, "src", asset), target);
}

if (import.meta.main) copyCssAssets(process.cwd(), process.argv[2]);
