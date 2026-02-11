import { describe, expect, it } from "vitest";
import { TerrainBiome } from "@plasius/gpu-world-generator";
import {
  axialToPixel,
  buildHexMapTiles,
  computeMapBounds,
  hexPolygonPoints,
  resolveTileColor,
} from "../src/worldMap.js";

describe("worldMap helpers", () => {
  it("projects axial coordinates to pointy-top pixel coordinates", () => {
    const center = axialToPixel(0, 0, 10);
    const offset = axialToPixel(1, -1, 10);

    expect(center).toEqual({ x: 0, y: 0 });
    expect(offset.x).toBeCloseTo(15);
    expect(offset.y).toBeCloseTo(-8.66025, 4);
  });

  it("generates a six-vertex polygon string", () => {
    const points = hexPolygonPoints(0, 0, 12).split(" ");
    expect(points).toHaveLength(6);
  });

  it("creates map tiles and map bounds", () => {
    const tiles = buildHexMapTiles(
      [
        { q: 0, r: 0, level: 0 },
        { q: 1, r: 0, level: 0 },
      ],
      [
        { height: 0.2, heat: 0.5, moisture: 0.4, biome: TerrainBiome.Plains },
        { height: 0.8, heat: 0.6, moisture: 0.5, biome: TerrainBiome.MixedForest },
      ],
      10
    );

    expect(tiles).toHaveLength(2);
    expect(tiles[0].points.split(" ")).toHaveLength(6);
    expect(tiles[0].color).not.toEqual(tiles[1].color);

    const bounds = computeMapBounds(tiles, 10);
    expect(bounds.maxX).toBeGreaterThan(bounds.minX);
    expect(bounds.maxY).toBeGreaterThan(bounds.minY);
  });

  it("returns deterministic tile colors", () => {
    const first = resolveTileColor({
      height: 0.3,
      heat: 0.4,
      moisture: 0.4,
      biome: TerrainBiome.Plains,
    });
    const second = resolveTileColor({
      height: 0.3,
      heat: 0.4,
      moisture: 0.4,
      biome: TerrainBiome.Plains,
    });
    expect(first).toEqual(second);
  });
});
