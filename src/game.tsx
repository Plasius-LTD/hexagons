import { useMemo, useState } from "react";
import { ErrorBoundary } from "@plasius/error";
import {
  MacroBiomeLabel,
  MicroFeatureLabel,
  SurfaceCoverLabel,
  TerrainBiomeLabel,
  generateTemperateMixedForest,
} from "@plasius/gpu-world-generator";
import { xrSessionModes } from "@plasius/gpu-xr";
import {
  buildHexMapTiles,
  computeMapBounds,
} from "./worldMap.js";
import styles from "./styles/game.module.css";

const HEX_SIZE = 18;

function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function formatNumber(value: number): string {
  return Number.isFinite(value) ? value.toFixed(2) : "n/a";
}

export function Game() {
  const [seed, setSeed] = useState(1337);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const world = useMemo(
    () => generateTemperateMixedForest({ seed, radius: 9 }),
    [seed]
  );

  const tiles = useMemo(
    () => buildHexMapTiles(world.cells, world.terrain, HEX_SIZE),
    [world]
  );

  const bounds = useMemo(
    () => computeMapBounds(tiles, HEX_SIZE),
    [tiles]
  );

  const safeSelectedIndex =
    selectedIndex >= 0 && selectedIndex < tiles.length ? selectedIndex : 0;
  const selected = tiles[safeSelectedIndex];

  const viewBox = `${bounds.minX} ${bounds.minY} ${
    bounds.maxX - bounds.minX
  } ${bounds.maxY - bounds.minY}`;

  const handleRegenerate = () => {
    setSeed((current) => ((current * 1664525 + 1013904223) >>> 0) % 2147483647);
    setSelectedIndex(0);
  };

  return (
    <ErrorBoundary name="Game">
      <div className={styles.game}>
        <header className={styles.header}>
          <div>
            <h1 className={styles.title}>GPU World Cell Explorer</h1>
            <p className={styles.subtitle}>
              Hex terrain generated through <code>@plasius/gpu-world-generator</code>{" "}
              and configured alongside lighting/particle/XR package profiles.
            </p>
          </div>
          <div className={styles.controls}>
            <span className={styles.seed}>Seed {seed}</span>
            <button className={styles.button} onClick={handleRegenerate}>
              Regenerate
            </button>
          </div>
        </header>

        <div className={styles.layout}>
          <section className={styles.mapCard}>
            <svg className={styles.map} viewBox={viewBox} role="img" aria-label="Hex terrain map">
              {tiles.map((tile, index) => (
                <polygon
                  key={`${tile.q}:${tile.r}`}
                  className={`${styles.tile} ${
                    index === safeSelectedIndex ? styles.tileActive : ""
                  }`}
                  points={tile.points}
                  fill={tile.color}
                  onPointerEnter={() => setSelectedIndex(index)}
                  onClick={() => setSelectedIndex(index)}
                />
              ))}
            </svg>
          </section>

          <aside className={styles.panel}>
            <h2 className={styles.panelTitle}>Selected Tile</h2>
            <dl className={styles.stats}>
              <div className={styles.row}>
                <dt className={styles.label}>Axial</dt>
                <dd className={styles.value}>
                  q {selected?.q ?? 0}, r {selected?.r ?? 0}
                </dd>
              </div>
              <div className={styles.row}>
                <dt className={styles.label}>Biome</dt>
                <dd className={styles.value}>
                  {selected
                    ? TerrainBiomeLabel[selected.terrain.biome]
                    : "Unknown"}
                </dd>
              </div>
              <div className={styles.row}>
                <dt className={styles.label}>Macro Biome</dt>
                <dd className={styles.value}>
                  {selected?.terrain.macroBiome === undefined
                    ? "n/a"
                    : MacroBiomeLabel[selected.terrain.macroBiome]}
                </dd>
              </div>
              <div className={styles.row}>
                <dt className={styles.label}>Surface</dt>
                <dd className={styles.value}>
                  {selected?.terrain.surface === undefined
                    ? "n/a"
                    : SurfaceCoverLabel[selected.terrain.surface]}
                </dd>
              </div>
              <div className={styles.row}>
                <dt className={styles.label}>Feature</dt>
                <dd className={styles.value}>
                  {selected?.terrain.feature === undefined
                    ? "none"
                    : MicroFeatureLabel[selected.terrain.feature]}
                </dd>
              </div>
              <div className={styles.row}>
                <dt className={styles.label}>Height</dt>
                <dd className={styles.value}>
                  {selected ? formatNumber(selected.terrain.height) : "n/a"}
                </dd>
              </div>
              <div className={styles.row}>
                <dt className={styles.label}>Heat</dt>
                <dd className={styles.value}>
                  {selected ? formatPercent(selected.terrain.heat) : "n/a"}
                </dd>
              </div>
              <div className={styles.row}>
                <dt className={styles.label}>Moisture</dt>
                <dd className={styles.value}>
                  {selected ? formatPercent(selected.terrain.moisture) : "n/a"}
                </dd>
              </div>
            </dl>

            <h2 className={styles.panelTitle}>GPU Stack</h2>
            <div className={styles.chipRow}>
              <span className={styles.chip}>worldgen: mixed-forest</span>
              <span className={styles.chip}>tiles: {tiles.length}</span>
              <span className={styles.chip}>
                xr modes: {xrSessionModes.filter((mode) => mode !== "inline").length}
              </span>
            </div>

            <dl className={styles.stats}>
              <div className={styles.row}>
                <dt className={styles.label}>World Generator</dt>
                <dd className={styles.value}>@plasius/gpu-world-generator</dd>
              </div>
              <div className={styles.row}>
                <dt className={styles.label}>XR Runtime</dt>
                <dd className={styles.value}>@plasius/gpu-xr</dd>
              </div>
              <div className={styles.row}>
                <dt className={styles.label}>XR Session Modes</dt>
                <dd className={styles.value}>
                  {xrSessionModes.filter((mode) => mode !== "inline").join(", ")}
                </dd>
              </div>
            </dl>
          </aside>
        </div>
      </div>
    </ErrorBoundary>
  );
}
