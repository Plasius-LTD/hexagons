import {
  SurfaceCover,
  TerrainBiome,
  type HexCell,
  type TerrainCell,
} from "@plasius/gpu-world-generator";

export interface HexMapTile {
  q: number;
  r: number;
  x: number;
  y: number;
  points: string;
  color: string;
  terrain: TerrainCell;
}

const SQRT3 = Math.sqrt(3);

const SURFACE_COLORS: Record<number, string> = {
  [SurfaceCover.Grass]: "#5bb768",
  [SurfaceCover.Dirt]: "#86604a",
  [SurfaceCover.Sand]: "#d7b273",
  [SurfaceCover.Rock]: "#7c879a",
  [SurfaceCover.Gravel]: "#91a0b2",
  [SurfaceCover.Snowpack]: "#d7ecff",
  [SurfaceCover.Ice]: "#99e0ff",
  [SurfaceCover.Mud]: "#69503c",
  [SurfaceCover.Ash]: "#6f6476",
  [SurfaceCover.Cobble]: "#9ba7b8",
  [SurfaceCover.Road]: "#6f6a60",
  [SurfaceCover.Water]: "#3f83d2",
  [SurfaceCover.Basalt]: "#4f5a70",
  [SurfaceCover.Crystal]: "#75ffd8",
  [SurfaceCover.Sludge]: "#5d7948",
};

const BIOME_COLORS: Record<number, string> = {
  [TerrainBiome.Plains]: "#89bf67",
  [TerrainBiome.Tundra]: "#a5b8ce",
  [TerrainBiome.Savanna]: "#c8b470",
  [TerrainBiome.River]: "#498dd6",
  [TerrainBiome.City]: "#9da9b8",
  [TerrainBiome.Village]: "#b1906d",
  [TerrainBiome.Ice]: "#b7f0ff",
  [TerrainBiome.Snow]: "#e2f4ff",
  [TerrainBiome.Mountainous]: "#7a8596",
  [TerrainBiome.Volcanic]: "#8d6c69",
  [TerrainBiome.Road]: "#7a7469",
  [TerrainBiome.Town]: "#958774",
  [TerrainBiome.Castle]: "#9aa7bb",
  [TerrainBiome.MixedForest]: "#4f9464",
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function withLightness(hex: string, amount: number): string {
  const safe = hex.replace("#", "");
  const channels = safe.length === 3
    ? safe.split("").map((c) => parseInt(c + c, 16))
    : [0, 2, 4].map((offset) => parseInt(safe.slice(offset, offset + 2), 16));
  const factor = clamp(1 + amount, 0.3, 1.8);
  const next = channels
    .map((channel) => clamp(Math.round(channel * factor), 0, 255))
    .map((channel) => channel.toString(16).padStart(2, "0"))
    .join("");
  return `#${next}`;
}

function defaultBiomeColor(terrain: TerrainCell): string {
  if (terrain.biome in BIOME_COLORS) {
    return BIOME_COLORS[terrain.biome];
  }
  return "#8b9eb6";
}

export function resolveTileColor(terrain: TerrainCell): string {
  const base =
    typeof terrain.surface === "number" && terrain.surface in SURFACE_COLORS
      ? SURFACE_COLORS[terrain.surface]
      : defaultBiomeColor(terrain);

  const elevationBoost = clamp(terrain.height * 0.28, -0.2, 0.22);
  return withLightness(base, elevationBoost);
}

export function axialToPixel(q: number, r: number, size: number): { x: number; y: number } {
  return {
    x: size * 1.5 * q,
    y: size * SQRT3 * (r + q / 2),
  };
}

export function hexPolygonPoints(x: number, y: number, size: number): string {
  const points: string[] = [];
  for (let i = 0; i < 6; i += 1) {
    const angle = (Math.PI / 180) * (60 * i + 30);
    const px = x + size * Math.cos(angle);
    const py = y + size * Math.sin(angle);
    points.push(`${px.toFixed(2)},${py.toFixed(2)}`);
  }
  return points.join(" ");
}

export function buildHexMapTiles(
  cells: HexCell[],
  terrain: TerrainCell[],
  size: number
): HexMapTile[] {
  return cells.map((cell, index) => {
    const terrainCell = terrain[index] ?? {
      height: 0,
      heat: 0,
      moisture: 0,
      biome: TerrainBiome.Plains,
    };
    const { x, y } = axialToPixel(cell.q, cell.r, size);
    return {
      q: cell.q,
      r: cell.r,
      x,
      y,
      points: hexPolygonPoints(x, y, size),
      color: resolveTileColor(terrainCell),
      terrain: terrainCell,
    };
  });
}

export function computeMapBounds(
  tiles: HexMapTile[],
  size: number
): { minX: number; maxX: number; minY: number; maxY: number } {
  if (tiles.length === 0) {
    return {
      minX: -size,
      maxX: size,
      minY: -size,
      maxY: size,
    };
  }

  let minX = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;

  for (const tile of tiles) {
    minX = Math.min(minX, tile.x - size);
    maxX = Math.max(maxX, tile.x + size);
    minY = Math.min(minY, tile.y - size);
    maxY = Math.max(maxY, tile.y + size);
  }

  return { minX, maxX, minY, maxY };
}
