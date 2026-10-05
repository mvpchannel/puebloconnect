// Pueblo Connect 3D City — rendering engine.
//
// Deliberately framework-agnostic plain TypeScript (no React/JSX) so it can
// be unit-tested and reused independent of how it's mounted. The React
// layer (Explore3DClient.tsx) owns all HUD/overlay UI (place cards, map,
// help, mobile pad) as normal React state; this module owns only the
// WebGL canvas and the simulation loop, and talks to React purely through
// the callbacks passed into `createCityEngine`.
//
// ENGINE CHOICE — Three.js vs Babylon.js (per the project brief's request
// to evaluate both): Three.js was chosen because (1) it is lower-level and
// smaller — this scene only needs a handful of primitives, a camera
// rig and simple raycasting, none of Babylon's bundled physics/GUI/XR
// systems, so Three.js ships meaningfully less JS to a phone on first
// load; (2) it tree-shakes cleanly through Next.js's bundler since it's a
// plain ES module package, where Babylon's default `@babylonjs/core`
// import pulls in a much larger baseline even with tree-shaking; (3) the
// existing Pueblo Connect site has no 3D code at all yet, and Three.js's
// ecosystem of minimal, dependency-free examples made it the faster, more
// maintainable fit for a template-based site that explicitly should not
// be rebuilt around a heavier framework. Babylon.js remains a reasonable
// choice if a later phase needs its built-in physics or WebXR support;
// nothing here is Three.js-specific at the data layer (see places.ts), so
// swapping engines later would touch this file only.
//
// MULTIPLAYER-READY ARCHITECTURE: `remotePlayers` below is a Map the
// engine already renders every frame, even though nothing populates it
// yet (Phase 1 is single-player — see FUNCTIONALITY_STATUS.md). A future
// WebSocket client can call `upsertRemotePlayer`/`removeRemotePlayer` with
// no changes needed here: the render loop and nameplate system already
// treat the local avatar as just one entry in the same data structure.

import * as THREE from "three";
import { PLACES, type Place } from "./places";
import { avatarLookFor, BUNTING_X, PALM_SPOTS, ROUTES, routeLength, routePose } from "./decor";
import { createFigureKit, type Figure } from "./figures";

export type RemotePlayerState = {
  id: string;
  name: string;
  x: number;
  z: number;
  /** Facing angle in radians, same convention as the local player's yaw. */
  heading: number;
};

export type CityEngineOptions = {
  container: HTMLDivElement;
  /** Real, authenticated member name — never invented client-side. */
  playerName: string;
  onPlaceClick: (place: Place) => void;
  onReady?: () => void;
  /** Buildings to place. Defaults to the built-in sample set. */
  places?: Place[];
  /** Text for the plaza screen: a headline and a status line (e.g. the current live broadcast). */
  screen?: { headline: string; status: string };
  /** Treasure drops to show as glowing objects the member can find and click. */
  drops?: DropMarker[];
  /** Called when a drop is clicked; `near` is whether the avatar is close enough to grab it. */
  onDropClick?: (id: number, near: boolean) => void;
};

export type DropMarker = { id: number; x: number; z: number; golden: boolean };

/** How close (scene units) the avatar must be to pick up a drop. This is a play
 *  mechanic checked in the browser, not a security check; each drop is also
 *  limited to one claim per member and an optional total by the server. */
export const DROP_PICKUP_RADIUS = 14;

export type CityEngine = {
  /** Walk the local avatar to a named destination (used by the map/HUD). */
  teleportTo: (placeId: string) => void;
  /** Remove a drop's marker from the scene (after it has been claimed). */
  removeDrop: (id: number) => void;
  /** Multiplayer extension point — see module header. Unused in Phase 1. */
  upsertRemotePlayer: (state: RemotePlayerState) => void;
  removeRemotePlayer: (id: string) => void;
  setMobileMove: (dir: "forward" | "backward" | "left" | "right", active: boolean) => void;
  /** Tears down the renderer, listeners and animation loop. Call on unmount. */
  dispose: () => void;
};

const WORLD_BOUND = 92;

export function createCityEngine(opts: CityEngineOptions): CityEngine {
  const { container, onPlaceClick } = opts;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x9fd3f2);
  scene.fog = new THREE.Fog(0x9fd3f2, 70, 180);

  const camera = new THREE.PerspectiveCamera(62, 1, 0.1, 400);
  camera.position.set(0, 7, 13);

  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
  // Capped pixel ratio — the brief asks this to run well on ordinary
  // phones; rendering at the full device pixel ratio on a high-DPI phone
  // is one of the most common causes of a 3D page overheating/throttling.
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.6));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);

  scene.add(new THREE.HemisphereLight(0xffffff, 0x526342, 2.2));
  const sun = new THREE.DirectionalLight(0xffffff, 2.4);
  sun.position.set(35, 55, 20);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  scene.add(sun);

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(220, 220),
    new THREE.MeshStandardMaterial({ color: 0x9aa764 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  const disposables: Array<THREE.BufferGeometry | THREE.Material | THREE.Texture> = [];
  function track<T extends THREE.BufferGeometry | THREE.Material | THREE.Texture>(x: T): T {
    disposables.push(x);
    return x;
  }

  function box(w: number, h: number, d: number, color: number, x: number, y: number, z: number) {
    const geo = track(new THREE.BoxGeometry(w, h, d));
    const mat = track(new THREE.MeshStandardMaterial({ color }));
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.castShadow = true;
    m.receiveShadow = true;
    scene.add(m);
    return m;
  }
  const road = (x: number, z: number, w: number, d: number) => box(w, 0.05, d, 0x343a40, x, 0.03, z);
  const sidewalk = (x: number, z: number, w: number, d: number) => box(w, 0.12, d, 0xd7d3c8, x, 0.08, z);

  road(0, 0, 18, 190);
  road(0, 0, 190, 18);
  sidewalk(-12, 0, 5, 190);
  sidewalk(12, 0, 5, 190);
  sidewalk(0, -12, 190, 5);
  sidewalk(0, 12, 190, 5);
  box(22, 0.18, 22, 0xd8cbb3, 0, 0.1, 0); // plaza

  // Jacaranda trees (purple blooms) at the plaza corners, green trees on Main Street.
  const crownGeo = track(new THREE.SphereGeometry(3, 12, 8));
  const jacarandaMat = track(new THREE.MeshStandardMaterial({ color: 0x9a7fd1 }));
  const leafMat = track(new THREE.MeshStandardMaterial({ color: 0x397c43 }));
  for (const [x, z] of [
    [-18, -18],
    [18, -18],
    [-18, 18],
    [18, 18],
    [-50, 0],
    [50, 0],
  ] as const) {
    box(0.8, 5, 0.8, 0x6d4c32, x, 2.5, z);
    const crown = new THREE.Mesh(crownGeo, Math.abs(x) === 18 ? jacarandaMat : leafMat);
    crown.position.set(x, 6, z);
    crown.castShadow = true;
    scene.add(crown);
  }

  // Plaza screen. It is a drawn sign, not a video player: the page passes in
  // what is on Pueblo Live right now (or says nothing is), and viewers go to
  // /live to actually watch.
  {
    const screenCanvas = document.createElement("canvas");
    screenCanvas.width = 512;
    screenCanvas.height = 288;
    const ctx = screenCanvas.getContext("2d")!;
    const screenInfo = opts.screen ?? { headline: "PUEBLO LIVE", status: "Watch at pueblo.connect/live" };
    ctx.fillStyle = "#101820";
    ctx.fillRect(0, 0, screenCanvas.width, screenCanvas.height);
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 32px Arial";
    ctx.textAlign = "center";
    ctx.fillText(screenInfo.headline, screenCanvas.width / 2, screenCanvas.height / 2 - 10);
    ctx.font = "20px Arial";
    ctx.fillStyle = "#9fb0c0";
    const status = screenInfo.status.length > 38 ? `${screenInfo.status.slice(0, 37)}…` : screenInfo.status;
    ctx.fillText(status, screenCanvas.width / 2, screenCanvas.height / 2 + 24);
    const screenTex = track(new THREE.CanvasTexture(screenCanvas));
    const frameGeo = track(new THREE.BoxGeometry(10, 5.6, 0.4));
    const frameMat = track(new THREE.MeshStandardMaterial({ color: 0x1a1a1a }));
    const frame = new THREE.Mesh(frameGeo, frameMat);
    frame.position.set(0, 6.5, -10.5);
    frame.castShadow = true;
    scene.add(frame);
    const panelGeo = track(new THREE.PlaneGeometry(9.3, 4.9));
    const panelMat = track(new THREE.MeshBasicMaterial({ map: screenTex }));
    const panel = new THREE.Mesh(panelGeo, panelMat);
    panel.position.set(0, 6.5, -10.27);
    scene.add(panel);
  }

  // --- Northeast Los Angeles street decor --------------------------------
  // Palms along the sidewalks (shared geometry, so cheap to repeat).
  {
    const trunkGeo = track(new THREE.CylinderGeometry(0.28, 0.45, 8.5, 7));
    const trunkMat = track(new THREE.MeshStandardMaterial({ color: 0x8a6a49 }));
    const frondGeo = track(new THREE.BoxGeometry(0.7, 0.12, 4.6));
    const frondMat = track(new THREE.MeshStandardMaterial({ color: 0x4f8a3a }));
    PALM_SPOTS.forEach(([x, z], i) => {
      const palm = new THREE.Group();
      const trunk = new THREE.Mesh(trunkGeo, trunkMat);
      trunk.position.y = 4.25;
      trunk.castShadow = true;
      palm.add(trunk);
      for (let k = 0; k < 7; k++) {
        const pivot = new THREE.Group();
        pivot.position.y = 8.5;
        pivot.rotation.y = (k / 7) * Math.PI * 2 + i;
        const frond = new THREE.Mesh(frondGeo, frondMat);
        frond.position.set(0, 0, 2.2);
        frond.rotation.x = 0.35; // droop outward
        pivot.add(frond);
        palm.add(pivot);
      }
      palm.position.set(x, 0, z);
      scene.add(palm);
    });
  }

  // Papel picado bunting across Main Street: one instanced mesh for every pennant.
  {
    const colors = [0xe63b35, 0xf4c542, 0x2fa38a, 0xd04a6a, 0x3c7bd6, 0xf08a24];
    const perString = 14;
    const pennantGeo = track(new THREE.PlaneGeometry(1.1, 1.3));
    const pennantMat = track(new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }));
    const inst = new THREE.InstancedMesh(pennantGeo, pennantMat, BUNTING_X.length * perString);
    const m4 = new THREE.Matrix4();
    const col = new THREE.Color();
    let n = 0;
    for (const bx of BUNTING_X) {
      for (let k = 0; k < perString; k++) {
        const z = -8 + (k / (perString - 1)) * 16;
        const y = 9 - Math.sin((k / (perString - 1)) * Math.PI) * 0.9; // gentle sag
        m4.makeRotationFromEuler(new THREE.Euler(0, Math.PI / 2, Math.PI)); // point down, face along the street
        m4.setPosition(bx, y, z);
        inst.setMatrixAt(n, m4);
        inst.setColorAt(n, col.setHex(colors[(k + n) % colors.length]));
        n++;
      }
      const lineGeo = track(new THREE.BoxGeometry(0.06, 0.06, 16));
      const lineMat = track(new THREE.MeshBasicMaterial({ color: 0x555555 }));
      const line = new THREE.Mesh(lineGeo, lineMat);
      line.position.set(bx, 9.15, 0);
      scene.add(line);
    }
    inst.instanceMatrix.needsUpdate = true;
    if (inst.instanceColor) inst.instanceColor.needsUpdate = true;
    scene.add(inst);
  }

  // Low hills ringing the valley (Mount Washington / Elysian Hills feel).
  {
    const hillMat = track(new THREE.MeshStandardMaterial({ color: 0x8f8559, flatShading: true }));
    const hillGeo = track(new THREE.ConeGeometry(1, 1, 7));
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2;
      const r = 135 + (i % 3) * 8;
      const hill = new THREE.Mesh(hillGeo, hillMat);
      const h = 18 + (i % 4) * 6;
      hill.scale.set(34 + (i % 3) * 8, h, 34 + (i % 2) * 10);
      hill.position.set(Math.cos(a) * r, h / 2 - 0.5, Math.sin(a) * r);
      scene.add(hill);
    }
  }

  // Murals: three painted canvases shared by every building that gets one.
  const muralMats: THREE.MeshBasicMaterial[] = [];
  function makeMural(kind: number): THREE.MeshBasicMaterial {
    const c = document.createElement("canvas");
    c.width = 384;
    c.height = 256;
    const g = c.getContext("2d")!;
    if (kind === 0) {
      // sunburst over hills
      g.fillStyle = "#f6d58a";
      g.fillRect(0, 0, 384, 256);
      g.translate(192, 190);
      for (let i = 0; i < 18; i++) {
        g.rotate(Math.PI / 9);
        g.fillStyle = i % 2 ? "#f08a24" : "#e63b35";
        g.beginPath();
        g.moveTo(0, 0);
        g.lineTo(-18, -300);
        g.lineTo(18, -300);
        g.fill();
      }
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.fillStyle = "#2f7f9e";
      g.beginPath();
      g.arc(192, 190, 52, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = "#3a6b3a";
      g.beginPath();
      g.moveTo(0, 256);
      g.quadraticCurveTo(110, 150, 220, 256);
      g.fill();
      g.fillStyle = "#274e2a";
      g.beginPath();
      g.moveTo(130, 256);
      g.quadraticCurveTo(280, 140, 384, 256);
      g.fill();
    } else if (kind === 1) {
      // flowers and a hummingbird-ish shape on teal
      g.fillStyle = "#1f7a78";
      g.fillRect(0, 0, 384, 256);
      const petals = ["#e63b35", "#f4c542", "#d04a6a", "#f08a24"];
      for (let i = 0; i < 6; i++) {
        const fx = 40 + i * 62;
        const fy = 70 + (i % 2) * 90;
        g.fillStyle = "#2f9e5a";
        g.fillRect(fx - 3, fy, 6, 256 - fy);
        for (let p = 0; p < 6; p++) {
          g.fillStyle = petals[(i + p) % petals.length];
          g.beginPath();
          g.arc(fx + Math.cos((p / 6) * Math.PI * 2) * 17, fy + Math.sin((p / 6) * Math.PI * 2) * 17, 12, 0, Math.PI * 2);
          g.fill();
        }
        g.fillStyle = "#f6e27a";
        g.beginPath();
        g.arc(fx, fy, 9, 0, Math.PI * 2);
        g.fill();
      }
    } else {
      // geometric tile pattern
      const cols = ["#e63b35", "#f4c542", "#2f7f9e", "#f6efe0"];
      for (let y = 0; y < 8; y++) {
        for (let x = 0; x < 12; x++) {
          g.fillStyle = cols[(x + y * 2) % cols.length];
          g.fillRect(x * 32, y * 32, 32, 32);
          g.fillStyle = cols[(x + y * 2 + 2) % cols.length];
          g.beginPath();
          g.moveTo(x * 32 + 16, y * 32 + 4);
          g.lineTo(x * 32 + 28, y * 32 + 16);
          g.lineTo(x * 32 + 16, y * 32 + 28);
          g.lineTo(x * 32 + 4, y * 32 + 16);
          g.fill();
        }
      }
    }
    const tex = track(new THREE.CanvasTexture(c));
    tex.colorSpace = THREE.SRGBColorSpace;
    return track(new THREE.MeshBasicMaterial({ map: tex }));
  }
  const muralGeo = track(new THREE.PlaneGeometry(9, 6));
  const tileMat = track(new THREE.MeshStandardMaterial({ color: 0xb5532f }));
  const creamMat = track(new THREE.MeshStandardMaterial({ color: 0xf1e6cf }));
  let buildingCount = 0;

  // Terracotta-tile roof, a Mission-style curved parapet over the door, and a
  // painted mural on the side wall.
  function addNelaDetails(p: Place) {
    const idx = buildingCount++;
    const roof = new THREE.Mesh(track(new THREE.BoxGeometry(p.width + 1.2, 0.7, p.depth + 1.2)), tileMat);
    roof.position.set(p.x, p.height + 0.35, p.z);
    roof.castShadow = true;
    scene.add(roof);
    const frontZ = p.z + p.depth / 2 + 0.6;
    const parapet = new THREE.Mesh(track(new THREE.BoxGeometry(7, 2.2, 0.6)), creamMat);
    parapet.position.set(p.x, p.height + 1.8, frontZ);
    scene.add(parapet);
    const crown = new THREE.Mesh(track(new THREE.CylinderGeometry(1.5, 1.5, 0.6, 14, 1, false, 0, Math.PI)), creamMat);
    crown.rotation.set(Math.PI / 2, 0, Math.PI / 2);
    crown.position.set(p.x, p.height + 2.9, frontZ);
    scene.add(crown);
    const kind = p.id === "daily" ? 0 : idx % 3;
    muralMats[kind] ??= makeMural(kind);
    const mural = new THREE.Mesh(muralGeo, muralMats[kind]);
    mural.position.set(p.x + p.width / 2 + 0.07, Math.min(p.height * 0.5, 4.5), p.z);
    mural.rotation.y = Math.PI / 2;
    scene.add(mural);
  }

  // Clock tower on The Daily Pueblo, like the building in its banner.
  function addClockTower(p: Place) {
    const tx = p.x + p.width / 2 - 3.5;
    const tz = p.z + p.depth / 2 - 3.5;
    const shaft = box(4.2, 8, 4.2, 0xefe3c8, tx, p.height + 4.7, tz);
    shaft.castShadow = true;
    const cap = new THREE.Mesh(track(new THREE.ConeGeometry(3.4, 3.2, 4)), tileMat);
    cap.rotation.y = Math.PI / 4;
    cap.position.set(tx, p.height + 10.3, tz);
    scene.add(cap);
    const cc = document.createElement("canvas");
    cc.width = 128;
    cc.height = 128;
    const g = cc.getContext("2d")!;
    g.fillStyle = "#fffaf0";
    g.beginPath();
    g.arc(64, 64, 60, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = "#1a1a1a";
    g.lineWidth = 5;
    g.stroke();
    g.lineWidth = 3;
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      g.beginPath();
      g.moveTo(64 + Math.sin(a) * 48, 64 - Math.cos(a) * 48);
      g.lineTo(64 + Math.sin(a) * 56, 64 - Math.cos(a) * 56);
      g.stroke();
    }
    g.lineWidth = 6;
    g.beginPath();
    g.moveTo(64, 64);
    g.lineTo(64, 28);
    g.stroke();
    g.lineWidth = 4;
    g.beginPath();
    g.moveTo(64, 64);
    g.lineTo(88, 74);
    g.stroke();
    const tex = track(new THREE.CanvasTexture(cc));
    tex.colorSpace = THREE.SRGBColorSpace;
    const faceMat = track(new THREE.MeshBasicMaterial({ map: tex }));
    const faceGeo = track(new THREE.PlaneGeometry(3, 3));
    for (const [dx, dz, ry] of [
      [0, 2.15, 0],
      [2.15, 0, Math.PI / 2],
      [-2.15, 0, -Math.PI / 2],
      [0, -2.15, Math.PI],
    ] as const) {
      const f = new THREE.Mesh(faceGeo, faceMat);
      f.position.set(tx + dx, p.height + 6.3, tz + dz);
      f.rotation.y = ry;
      scene.add(f);
    }
  }

  const clickable: THREE.Object3D[] = [];
  const destinations: Record<string, THREE.Vector3> = {};
  const nameSprites: THREE.Sprite[] = [];

  function makeLabel(text: string, width = 512): THREE.Sprite {
    const c = document.createElement("canvas");
    c.width = width;
    c.height = 128;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.fillStyle = "#111827";
    ctx.font = "bold 34px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const shown = text.length > 25 ? text.slice(0, 24) + "…" : text;
    ctx.fillText(shown, c.width / 2, c.height / 2);
    const tex = track(new THREE.CanvasTexture(c));
    tex.colorSpace = THREE.SRGBColorSpace;
    const mat = track(new THREE.SpriteMaterial({ map: tex }));
    const s = new THREE.Sprite(mat);
    s.scale.set(12, 3, 1);
    return s;
  }

  function addBuilding(p: Place) {
    const b = box(p.width, p.height, p.depth, p.color, p.x, p.height / 2, p.z);
    b.userData.place = p;
    clickable.push(b);
    const frontZ = p.z + (p.depth / 2 + 0.03);
    for (let i = -1; i <= 1; i++) box(2.4, 2.4, 0.08, 0xbde7ff, p.x + i * 4, p.height * 0.58, frontZ);
    const door = box(2.5, 4, 0.12, 0x3a2b25, p.x, 2, frontZ + 0.08);
    door.userData.place = p;
    clickable.push(door);
    if (p.billboard) {
      // Rooftop billboard facing the street (+z), mounted on two posts.
      const bw = 14;
      const bh = 6;
      const by = p.height + 3.4;
      const bz = p.z + p.depth / 2 - 1.2;
      box(0.4, 3.4, 0.4, 0x333333, p.x - bw / 2 + 1.5, p.height + 1.7, bz);
      box(0.4, 3.4, 0.4, 0x333333, p.x + bw / 2 - 1.5, p.height + 1.7, bz);
      box(bw + 0.6, bh + 0.6, 0.3, 0x1a1a1a, p.x, by, bz);
      const c = document.createElement("canvas");
      c.width = 560;
      c.height = 240;
      const g = c.getContext("2d")!;
      g.fillStyle = "#101820";
      g.fillRect(0, 0, c.width, c.height);
      g.fillStyle = "#ffffff";
      g.textAlign = "center";
      g.textBaseline = "middle";
      g.font = "bold 44px Arial";
      // wrap the headline onto at most two lines
      const words = p.billboard.headline.split(/\s+/);
      const lines: string[] = [];
      let cur = "";
      for (const w of words) {
        const next = cur ? `${cur} ${w}` : w;
        if (cur && g.measureText(next).width > c.width - 50) {
          lines.push(cur);
          cur = w;
        } else cur = next;
      }
      if (cur) lines.push(cur);
      const shown = lines.slice(0, 2);
      const top = p.billboard.detail ? 70 : c.height / 2 - (shown.length - 1) * 28;
      shown.forEach((ln, i) => g.fillText(ln, c.width / 2, top + i * 56));
      if (p.billboard.detail) {
        g.fillStyle = "#f4c542";
        g.font = "bold 40px Arial";
        g.fillText(p.billboard.detail, c.width / 2, c.height - 50);
      }
      const bTex = track(new THREE.CanvasTexture(c));
      bTex.colorSpace = THREE.SRGBColorSpace;
      const face = new THREE.Mesh(track(new THREE.PlaneGeometry(bw, bh)), track(new THREE.MeshBasicMaterial({ map: bTex })));
      face.position.set(p.x, by, bz + 0.2);
      face.userData.place = p;
      scene.add(face);
      clickable.push(face);
    }
    addNelaDetails(p);
    if (p.id === "daily") addClockTower(p);
    const sign = makeLabel(p.name);
    sign.position.set(p.x, p.height + 4.2, p.z);
    scene.add(sign);
    destinations[p.id] = new THREE.Vector3(p.x, 1.1, p.z + Math.sign(p.z || 1) * (p.depth / 2 + 7));
  }
  (opts.places ?? PLACES).forEach(addBuilding);

  // --- Treasure drops ------------------------------------------------
  // A spinning, glowing gem on a small pedestal at each hiding spot. Clicking
  // it (see onClick) asks the page to claim it.
  const dropMeshes = new Map<number, THREE.Group>();
  for (const d of opts.drops ?? []) {
    const g = new THREE.Group();
    const color = d.golden ? 0xffc928 : 0x38d6c4;
    const gem = new THREE.Mesh(
      track(new THREE.OctahedronGeometry(1.1)),
      track(new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.9 }))
    );
    gem.position.y = 2.6;
    gem.userData.dropId = d.id;
    const base = new THREE.Mesh(
      track(new THREE.CylinderGeometry(0.7, 0.9, 0.9, 10)),
      track(new THREE.MeshStandardMaterial({ color: 0x555555 }))
    );
    base.position.y = 0.45;
    base.userData.dropId = d.id;
    g.add(gem, base);
    g.position.set(d.x, 0, d.z);
    g.userData.gem = gem;
    scene.add(g);
    dropMeshes.set(d.id, g);
    clickable.push(gem, base);
  }
  function removeDrop(id: number) {
    const g = dropMeshes.get(id);
    if (!g) return;
    scene.remove(g);
    for (let i = clickable.length - 1; i >= 0; i--) if (clickable[i].userData.dropId === id) clickable.splice(i, 1);
    dropMeshes.delete(id);
  }

  // --- People: the visitor's avatar, other members and walking pedestrians
  const figures = createFigureKit(track);

  const player = new THREE.Group();
  const playerFigure = figures.build({ ...avatarLookFor(opts.playerName || "Pueblo Member"), shirt: 0xe63b35 });
  player.add(playerFigure.group);
  const nameplate = makeLabel(opts.playerName || "Pueblo Member", 384);
  nameplate.position.set(0, 4.3, 0);
  nameplate.scale.set(6, 1.5, 1);
  player.add(nameplate);
  nameSprites.push(nameplate);
  scene.add(player);
  player.position.set(0, 0, 8);

  // Remote players (multiplayer extension point — see module header).
  const remotePlayers = new Map<string, { group: THREE.Group; name: string }>();

  function upsertRemotePlayer(state: RemotePlayerState) {
    let entry = remotePlayers.get(state.id);
    if (!entry) {
      const group = new THREE.Group();
      group.add(figures.build(avatarLookFor(state.name)).group);
      const tag = makeLabel(state.name, 384);
      tag.position.set(0, 4.3, 0);
      tag.scale.set(6, 1.5, 1);
      group.add(tag);
      scene.add(group);
      entry = { group, name: state.name };
      remotePlayers.set(state.id, entry);
    }
    entry.group.position.set(state.x, 0, state.z);
    entry.group.rotation.y = state.heading;
  }

  function removeRemotePlayer(id: string) {
    const entry = remotePlayers.get(id);
    if (!entry) return;
    scene.remove(entry.group);
    remotePlayers.delete(id);
  }

  // Pedestrians stroll the sidewalks. They are scenery only: not clickable,
  // not real members, and they have no names.
  const pedestrians: { figure: Figure; route: (typeof ROUTES)[number]; start: number; len: number }[] = [];
  ROUTES.forEach((route, ri) => {
    const len = routeLength(route.points, route.loop);
    for (let w = 0; w < route.walkers; w++) {
      const figure = figures.build(avatarLookFor(`pedestrian-${ri}-${w}`));
      figure.group.scale.setScalar(0.92);
      scene.add(figure.group);
      pedestrians.push({ figure, route, start: (len * 2 * w) / route.walkers + w * 3, len });
    }
  });

  // --- Input: keyboard, drag-to-look, mobile pad, click-to-select -----
  let yaw = Math.PI;
  let pitch = -0.18;
  let dragging = false;
  let lastX = 0;
  let lastY = 0;
  const keys: Record<string, boolean> = {};
  const mobile = { forward: false, backward: false, left: false, right: false };

  function onKeyDown(e: KeyboardEvent) {
    keys[e.key.toLowerCase()] = true;
  }
  function onKeyUp(e: KeyboardEvent) {
    keys[e.key.toLowerCase()] = false;
  }
  function onPointerDown(e: PointerEvent) {
    dragging = true;
    lastX = e.clientX;
    lastY = e.clientY;
    renderer.domElement.setPointerCapture(e.pointerId);
  }
  function onPointerMove(e: PointerEvent) {
    if (!dragging) return;
    yaw -= (e.clientX - lastX) * 0.006;
    pitch = Math.max(-0.65, Math.min(0.25, pitch - (e.clientY - lastY) * 0.004));
    lastX = e.clientX;
    lastY = e.clientY;
  }
  function onPointerUp() {
    dragging = false;
  }

  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();
  function onClick(e: MouseEvent) {
    if (Math.abs(e.clientX - lastX) > 8 || Math.abs(e.clientY - lastY) > 8) return;
    const r = renderer.domElement.getBoundingClientRect();
    mouse.x = ((e.clientX - r.left) / r.width) * 2 - 1;
    mouse.y = -((e.clientY - r.top) / r.height) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);
    const hit = raycaster.intersectObjects(clickable, false)[0];
    const dropId = hit?.object.userData.dropId as number | undefined;
    if (dropId !== undefined) {
      const m = dropMeshes.get(dropId);
      const near = m ? Math.hypot(player.position.x - m.position.x, player.position.z - m.position.z) <= DROP_PICKUP_RADIUS : false;
      opts.onDropClick?.(dropId, near);
      return;
    }
    const place = hit?.object.userData.place as Place | undefined;
    if (place) onPlaceClick(place);
  }

  addEventListener("keydown", onKeyDown);
  addEventListener("keyup", onKeyUp);
  renderer.domElement.addEventListener("pointerdown", onPointerDown);
  renderer.domElement.addEventListener("pointermove", onPointerMove);
  renderer.domElement.addEventListener("pointerup", onPointerUp);
  renderer.domElement.addEventListener("click", onClick);

  function setMobileMove(dir: "forward" | "backward" | "left" | "right", active: boolean) {
    mobile[dir] = active;
  }

  function teleportTo(placeId: string) {
    const d = destinations[placeId];
    if (!d) return;
    player.position.copy(d);
  }

  function resize() {
    const w = container.clientWidth;
    const h = container.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h || 1;
    camera.updateProjectionMatrix();
  }
  addEventListener("resize", resize);
  resize();

  let rafId = 0;
  const clock = new THREE.Clock();
  // Nameplates should always face the camera, billboard-style — true for
  // Sprites automatically, so nothing extra is needed there, but keep this
  // loop as the single per-frame update point for future additions
  // (e.g. interpolating remote-player positions between network updates).
  function animate() {
    rafId = requestAnimationFrame(animate);
    const dt = Math.min(clock.getDelta(), 0.04);
    const speed = 9;
    const forward =
      (keys["w"] || keys["arrowup"] || mobile.forward ? 1 : 0) -
      (keys["s"] || keys["arrowdown"] || mobile.backward ? 1 : 0);
    const strafe =
      (keys["d"] || keys["arrowright"] || mobile.right ? 1 : 0) -
      (keys["a"] || keys["arrowleft"] || mobile.left ? 1 : 0);
    const f = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw));
    const r = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));
    player.position.addScaledVector(f, forward * speed * dt).addScaledVector(r, strafe * speed * dt);
    player.position.x = THREE.MathUtils.clamp(player.position.x, -WORLD_BOUND, WORLD_BOUND);
    player.position.z = THREE.MathUtils.clamp(player.position.z, -WORLD_BOUND, WORLD_BOUND);
    playerFigure.setWalk(clock.elapsedTime * 9, forward || strafe ? 1 : 0);
    if (forward || strafe) {
      player.rotation.y = Math.atan2(f.x * forward + r.x * strafe, f.z * forward + r.z * strafe);
    }
    const dist = 10;
    const height = 6;
    const camTarget = player.position
      .clone()
      .add(new THREE.Vector3(-Math.sin(yaw) * dist, height, -Math.cos(yaw) * dist));
    camera.position.lerp(camTarget, 1 - Math.pow(0.001, dt));
    camera.lookAt(player.position.x, player.position.y + 2 + pitch * 4, player.position.z);
    const t = clock.elapsedTime;
    for (const ped of pedestrians) {
      const pose = routePose(ped.route, ped.start + t * ped.route.speed);
      ped.figure.group.position.set(pose.x, 0, pose.z);
      ped.figure.group.rotation.y = pose.heading;
      ped.figure.setWalk(t * 6 + ped.start, 1);
    }
    dropMeshes.forEach((g) => {
      const gem = g.userData.gem as THREE.Object3D;
      gem.rotation.y += dt * 1.6;
      gem.position.y = 2.6 + Math.sin(t * 2) * 0.25;
    });
    renderer.render(scene, camera);
  }
  rafId = requestAnimationFrame(animate);
  opts.onReady?.();

  function dispose() {
    cancelAnimationFrame(rafId);
    removeEventListener("keydown", onKeyDown);
    removeEventListener("keyup", onKeyUp);
    removeEventListener("resize", resize);
    renderer.domElement.removeEventListener("pointerdown", onPointerDown);
    renderer.domElement.removeEventListener("pointermove", onPointerMove);
    renderer.domElement.removeEventListener("pointerup", onPointerUp);
    renderer.domElement.removeEventListener("click", onClick);
    disposables.forEach((d) => d.dispose());
    renderer.dispose();
    if (renderer.domElement.parentNode === container) {
      container.removeChild(renderer.domElement);
    }
  }

  return { teleportTo, removeDrop, upsertRemotePlayer, removeRemotePlayer, setMobileMove, dispose };
}
