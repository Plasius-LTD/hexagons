import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
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
  type HexMapTile,
} from "./worldMap.js";
import styles from "./styles/game.module.css";

const HEX_SIZE = 18;
const HEIGHT_SCALE = 26;
const HUMAN_EYE_HEIGHT = 1.72;
const WALK_SPEED = 20;
const FLY_SPEED = 32;
const VERTICAL_FLY_SPEED = 22;
const LOOK_SENSITIVITY = 0.0032;
const NEAR_PLANE = 0.5;
const FAR_PLANE = 1100;
const FOV_RAD = Math.PI / 3;
const CAMERA_UPDATE_MS = 100;

type ExplorerMode = "walk" | "fly";

type CameraPose = {
  x: number;
  y: number;
  z: number;
  yaw: number;
  pitch: number;
};

type CameraHud = CameraPose & {
  ground: number;
};

function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function formatNumber(value: number): string {
  return Number.isFinite(value) ? value.toFixed(2) : "n/a";
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function wrapAngle(value: number): number {
  const full = Math.PI * 2;
  const wrapped = ((value % full) + full) % full;
  return wrapped > Math.PI ? wrapped - full : wrapped;
}

function hexCorners(centerX: number, centerZ: number, size: number): Array<{ x: number; z: number }> {
  const points: Array<{ x: number; z: number }> = [];
  for (let i = 0; i < 6; i += 1) {
    const angle = (Math.PI / 180) * (60 * i + 30);
    points.push({
      x: centerX + size * Math.cos(angle),
      z: centerZ + size * Math.sin(angle),
    });
  }
  return points;
}

function tintHex(hex: string, amount: number): string {
  const safe = hex.replace("#", "");
  const channels = safe.length === 3
    ? safe.split("").map((c) => parseInt(c + c, 16))
    : [0, 2, 4].map((offset) => parseInt(safe.slice(offset, offset + 2), 16));
  const factor = clamp(1 + amount, 0.2, 1.9);
  const next = channels
    .map((channel) => clamp(Math.round(channel * factor), 0, 255))
    .map((channel) => channel.toString(16).padStart(2, "0"))
    .join("");
  return `#${next}`;
}

function findNearestTileIndex(tiles: HexMapTile[], x: number, z: number): number {
  if (tiles.length === 0) {
    return 0;
  }
  let nearestIndex = 0;
  let nearestDistance = Number.POSITIVE_INFINITY;
  for (let index = 0; index < tiles.length; index += 1) {
    const tile = tiles[index];
    const dx = tile.x - x;
    const dz = tile.y - z;
    const distance = dx * dx + dz * dz;
    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearestIndex = index;
    }
  }
  return nearestIndex;
}

function sampleGroundHeight(tiles: HexMapTile[], x: number, z: number): number {
  const index = findNearestTileIndex(tiles, x, z);
  const tile = tiles[index];
  if (!tile) {
    return 0;
  }
  return tile.terrain.height * HEIGHT_SCALE;
}

function initialCamera(tiles: HexMapTile[]): CameraPose {
  if (tiles.length === 0) {
    return {
      x: 0,
      y: HUMAN_EYE_HEIGHT,
      z: 0,
      yaw: 0,
      pitch: -0.35,
    };
  }
  let sumX = 0;
  let sumZ = 0;
  for (const tile of tiles) {
    sumX += tile.x;
    sumZ += tile.y;
  }
  const x = sumX / tiles.length;
  const z = sumZ / tiles.length;
  const ground = sampleGroundHeight(tiles, x, z);
  return {
    x,
    y: ground + HUMAN_EYE_HEIGHT,
    z,
    yaw: -Math.PI * 0.12,
    pitch: -0.38,
  };
}

type ProjectedPoint = {
  x: number;
  y: number;
  depth: number;
};

function projectPoint(
  point: { x: number; y: number; z: number },
  camera: CameraPose,
  viewportWidth: number,
  viewportHeight: number,
  focalLength: number
): ProjectedPoint | null {
  const dx = point.x - camera.x;
  const dy = point.y - camera.y;
  const dz = point.z - camera.z;

  const sinYaw = Math.sin(camera.yaw);
  const cosYaw = Math.cos(camera.yaw);
  const xYaw = cosYaw * dx - sinYaw * dz;
  const zYaw = sinYaw * dx + cosYaw * dz;

  const sinPitch = Math.sin(camera.pitch);
  const cosPitch = Math.cos(camera.pitch);
  const yPitch = cosPitch * dy - sinPitch * zYaw;
  const zPitch = sinPitch * dy + cosPitch * zYaw;

  if (zPitch <= NEAR_PLANE || zPitch >= FAR_PLANE) {
    return null;
  }

  return {
    x: viewportWidth * 0.5 + (xYaw / zPitch) * focalLength,
    y: viewportHeight * 0.57 - (yPitch / zPitch) * focalLength,
    depth: zPitch,
  };
}

function renderScene(
  context: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  tiles: HexMapTile[],
  camera: CameraPose,
  selectedIndex: number
): void {
  const width = canvas.width;
  const height = canvas.height;

  const sky = context.createLinearGradient(0, 0, 0, height);
  sky.addColorStop(0, "#0e1f33");
  sky.addColorStop(0.55, "#15304b");
  sky.addColorStop(1, "#1f2f22");
  context.fillStyle = sky;
  context.fillRect(0, 0, width, height);

  const focalLength = (height * 0.86) / Math.tan(FOV_RAD * 0.5);

  const drawQueue: Array<{
    path: Path2D;
    color: string;
    depth: number;
    highlighted: boolean;
  }> = [];

  for (let index = 0; index < tiles.length; index += 1) {
    const tile = tiles[index];
    const elevation = tile.terrain.height * HEIGHT_SCALE;
    const corners = hexCorners(tile.x, tile.y, HEX_SIZE);

    const projectedCorners: ProjectedPoint[] = [];
    let depthTotal = 0;
    let valid = true;

    for (const corner of corners) {
      const projected = projectPoint(
        { x: corner.x, y: elevation, z: corner.z },
        camera,
        width,
        height,
        focalLength
      );
      if (!projected) {
        valid = false;
        break;
      }
      projectedCorners.push(projected);
      depthTotal += projected.depth;
    }

    if (!valid || projectedCorners.length === 0) {
      continue;
    }

    const path = new Path2D();
    path.moveTo(projectedCorners[0].x, projectedCorners[0].y);
    for (let i = 1; i < projectedCorners.length; i += 1) {
      path.lineTo(projectedCorners[i].x, projectedCorners[i].y);
    }
    path.closePath();

    const depth = depthTotal / projectedCorners.length;
    const distanceShade = clamp(1 - depth / 520, 0.2, 1);
    const elevationShade = clamp((elevation / HEIGHT_SCALE - 0.5) * 0.25, -0.16, 0.18);
    const color = tintHex(tile.color, distanceShade - 1 + elevationShade);

    drawQueue.push({
      path,
      color,
      depth,
      highlighted: index === selectedIndex,
    });
  }

  drawQueue.sort((a, b) => b.depth - a.depth);

  for (const item of drawQueue) {
    context.fillStyle = item.color;
    context.fill(item.path);
    context.lineWidth = item.highlighted ? 2.3 : 1.2;
    context.strokeStyle = item.highlighted
      ? "rgba(255, 255, 255, 0.92)"
      : "rgba(11, 18, 29, 0.42)";
    context.stroke(item.path);
  }

  context.strokeStyle = "rgba(230, 245, 255, 0.8)";
  context.lineWidth = 1;
  const crosshairX = width * 0.5;
  const crosshairY = height * 0.55;
  context.beginPath();
  context.moveTo(crosshairX - 8, crosshairY);
  context.lineTo(crosshairX + 8, crosshairY);
  context.moveTo(crosshairX, crosshairY - 8);
  context.lineTo(crosshairX, crosshairY + 8);
  context.stroke();
}

export function Game() {
  const [seed, setSeed] = useState(1337);
  const [mode, setMode] = useState<ExplorerMode>("walk");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [cameraHud, setCameraHud] = useState<CameraHud>({
    x: 0,
    y: HUMAN_EYE_HEIGHT,
    z: 0,
    yaw: 0,
    pitch: -0.35,
    ground: 0,
  });

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const cameraRef = useRef<CameraPose>({
    x: 0,
    y: HUMAN_EYE_HEIGHT,
    z: 0,
    yaw: 0,
    pitch: -0.35,
  });
  const keysRef = useRef<Set<string>>(new Set());
  const dragRef = useRef({
    active: false,
    pointerId: -1,
    lastX: 0,
    lastY: 0,
  });

  const world = useMemo(
    () => generateTemperateMixedForest({ seed, radius: 9 }),
    [seed]
  );

  const tiles = useMemo(
    () => buildHexMapTiles(world.cells, world.terrain, HEX_SIZE),
    [world]
  );

  const safeSelectedIndex =
    selectedIndex >= 0 && selectedIndex < tiles.length ? selectedIndex : 0;
  const selected = tiles[safeSelectedIndex];

  useEffect(() => {
    const camera = initialCamera(tiles);
    cameraRef.current = camera;
    const nearestIndex = findNearestTileIndex(tiles, camera.x, camera.z);
    setSelectedIndex(nearestIndex);
    setCameraHud({
      ...camera,
      ground: sampleGroundHeight(tiles, camera.x, camera.z),
    });
  }, [tiles]);

  useEffect(() => {
    const camera = cameraRef.current;
    const ground = sampleGroundHeight(tiles, camera.x, camera.z);
    if (mode === "walk") {
      camera.y = ground + HUMAN_EYE_HEIGHT;
    } else {
      camera.y = Math.max(camera.y, ground + HUMAN_EYE_HEIGHT + 5);
    }
  }, [mode, tiles]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || tiles.length === 0) {
      return;
    }
    const context = canvas.getContext("2d");
    if (!context) {
      return;
    }

    let frame = 0;
    let lastTime = performance.now();
    let hudAccumulator = 0;

    const applyCanvasSize = () => {
      const ratio = window.devicePixelRatio || 1;
      const width = Math.max(1, Math.floor(canvas.clientWidth * ratio));
      const height = Math.max(1, Math.floor(canvas.clientHeight * ratio));
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.repeat) {
        return;
      }
      if (event.code === "KeyF") {
        setMode((current) => (current === "walk" ? "fly" : "walk"));
        event.preventDefault();
        return;
      }
      keysRef.current.add(event.code);
      if (
        event.code === "Space" ||
        event.code.startsWith("Arrow") ||
        event.code === "KeyW" ||
        event.code === "KeyA" ||
        event.code === "KeyS" ||
        event.code === "KeyD"
      ) {
        event.preventDefault();
      }
    };

    const onKeyUp = (event: KeyboardEvent) => {
      keysRef.current.delete(event.code);
    };

    const onBlur = () => {
      keysRef.current.clear();
      dragRef.current.active = false;
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);

    const tick = (now: number) => {
      applyCanvasSize();

      const camera = cameraRef.current;
      const deltaSeconds = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;

      const keys = keysRef.current;
      const sprint = keys.has("ShiftLeft") || keys.has("ShiftRight");
      const baseSpeed = mode === "fly" ? FLY_SPEED : WALK_SPEED;
      const speed = sprint ? baseSpeed * 1.85 : baseSpeed;

      let inputX = 0;
      let inputZ = 0;
      if (keys.has("KeyW") || keys.has("ArrowUp")) inputZ += 1;
      if (keys.has("KeyS") || keys.has("ArrowDown")) inputZ -= 1;
      if (keys.has("KeyA") || keys.has("ArrowLeft")) inputX -= 1;
      if (keys.has("KeyD") || keys.has("ArrowRight")) inputX += 1;

      const inputLength = Math.hypot(inputX, inputZ);
      if (inputLength > 0) {
        const nx = inputX / inputLength;
        const nz = inputZ / inputLength;
        const sinYaw = Math.sin(camera.yaw);
        const cosYaw = Math.cos(camera.yaw);
        camera.x += (nx * cosYaw + nz * sinYaw) * speed * deltaSeconds;
        camera.z += (nz * cosYaw - nx * sinYaw) * speed * deltaSeconds;
      }

      const ground = sampleGroundHeight(tiles, camera.x, camera.z);
      if (mode === "walk") {
        camera.y = ground + HUMAN_EYE_HEIGHT;
      } else {
        let verticalInput = 0;
        if (keys.has("Space") || keys.has("KeyE")) verticalInput += 1;
        if (keys.has("KeyC") || keys.has("KeyQ")) verticalInput -= 1;
        camera.y += verticalInput * VERTICAL_FLY_SPEED * deltaSeconds;
        camera.y = Math.max(camera.y, ground + 0.6);
      }

      camera.pitch = clamp(camera.pitch, -1.2, 0.75);
      camera.yaw = wrapAngle(camera.yaw);

      const nearestIndex = findNearestTileIndex(tiles, camera.x, camera.z);
      renderScene(context, canvas, tiles, camera, nearestIndex);

      hudAccumulator += deltaSeconds * 1000;
      if (hudAccumulator >= CAMERA_UPDATE_MS) {
        hudAccumulator = 0;
        setSelectedIndex(nearestIndex);
        setCameraHud({
          ...camera,
          ground,
        });
      }

      frame = window.requestAnimationFrame(tick);
    };

    frame = window.requestAnimationFrame(tick);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
    };
  }, [mode, tiles]);

  const handlePointerDown = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    canvas.focus();
    canvas.setPointerCapture(event.pointerId);
    dragRef.current.active = true;
    dragRef.current.pointerId = event.pointerId;
    dragRef.current.lastX = event.clientX;
    dragRef.current.lastY = event.clientY;
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!dragRef.current.active || dragRef.current.pointerId !== event.pointerId) {
      return;
    }
    const dx = event.clientX - dragRef.current.lastX;
    const dy = event.clientY - dragRef.current.lastY;
    dragRef.current.lastX = event.clientX;
    dragRef.current.lastY = event.clientY;

    const camera = cameraRef.current;
    camera.yaw = wrapAngle(camera.yaw + dx * LOOK_SENSITIVITY);
    camera.pitch = clamp(camera.pitch - dy * LOOK_SENSITIVITY * 0.82, -1.2, 0.75);
  };

  const handlePointerUp = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (dragRef.current.pointerId !== event.pointerId) {
      return;
    }
    dragRef.current.active = false;
    dragRef.current.pointerId = -1;
    event.currentTarget.releasePointerCapture(event.pointerId);
  };

  const handleRegenerate = () => {
    setSeed((current) => ((current * 1664525 + 1013904223) >>> 0) % 2147483647);
    setSelectedIndex(0);
  };

  return (
    <ErrorBoundary name="Game">
      <div className={styles.game}>
        <header className={styles.header}>
          <div>
            <h1 className={styles.title}>Generator</h1>
            <p className={styles.subtitle}>
              Explore procedurally generated terrain in first-person. Walk at human
              eye height above the surface or switch to fly mode for aerial scouting.
            </p>
          </div>
          <div className={styles.controls}>
            <span className={styles.seed}>Seed {seed}</span>
            <button
              className={styles.modeButton}
              onClick={() => setMode((current) => (current === "walk" ? "fly" : "walk"))}
            >
              Mode: {mode === "walk" ? "Walk" : "Fly"}
            </button>
            <button className={styles.button} onClick={handleRegenerate}>
              Regenerate
            </button>
          </div>
        </header>

        <div className={styles.layout}>
          <section className={styles.mapCard}>
            <canvas
              ref={canvasRef}
              className={styles.viewport}
              role="img"
              aria-label="Generator first-person world view"
              tabIndex={0}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              onContextMenu={(event) => event.preventDefault()}
            />
            <div className={styles.overlay}>
              <span className={styles.overlayTitle}>
                {mode === "walk" ? "Walking View" : "Flight View"}
              </span>
              <span className={styles.overlayText}>
                Drag to look • W/A/S/D move • F toggles walk/fly
              </span>
            </div>
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
              <div className={styles.row}>
                <dt className={styles.label}>Camera X/Z</dt>
                <dd className={styles.value}>
                  {formatNumber(cameraHud.x)} / {formatNumber(cameraHud.z)}
                </dd>
              </div>
              <div className={styles.row}>
                <dt className={styles.label}>Camera Height</dt>
                <dd className={styles.value}>{formatNumber(cameraHud.y)} m</dd>
              </div>
              <div className={styles.row}>
                <dt className={styles.label}>Clearance</dt>
                <dd className={styles.value}>
                  {formatNumber(cameraHud.y - cameraHud.ground)} m
                </dd>
              </div>
              <div className={styles.row}>
                <dt className={styles.label}>Yaw / Pitch</dt>
                <dd className={styles.value}>
                  {Math.round((cameraHud.yaw * 180) / Math.PI)}° /{" "}
                  {Math.round((cameraHud.pitch * 180) / Math.PI)}°
                </dd>
              </div>
            </dl>

            <h2 className={styles.panelTitle}>GPU Stack</h2>
            <div className={styles.chipRow}>
              <span className={styles.chip}>worldgen: mixed-forest</span>
              <span className={styles.chip}>tiles: {tiles.length}</span>
              <span className={styles.chip}>mode: {mode}</span>
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

            <h2 className={styles.panelTitle}>Controls</h2>
            <ul className={styles.controlList}>
              <li><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> move</li>
              <li><kbd>Shift</kbd> sprint</li>
              <li><kbd>Drag</kbd> look around</li>
              <li><kbd>F</kbd> toggle walk/fly</li>
              <li><kbd>Space</kbd>/<kbd>E</kbd> up (fly)</li>
              <li><kbd>Q</kbd>/<kbd>C</kbd> down (fly)</li>
            </ul>
          </aside>
        </div>
      </div>
    </ErrorBoundary>
  );
}
