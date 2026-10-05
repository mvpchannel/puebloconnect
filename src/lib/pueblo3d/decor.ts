// Northeast Los Angeles street decor and pedestrian routes.
// Pure data and geometry maths only (no Three.js), so it can be unit-tested
// and so the engine stays the single place that draws anything.
import { DROP_SPOTS, PLACES, type Place } from "./places";

/** Storefront lots sit on this row (see storefronts.ts). Footprint is 18 x 12. */
const LOT_X = [-75, -50, -25, 0, 25, 50, 75];
const LOT_Z = 62;

export type Footprint = { x: number; z: number; w: number; d: number };

export function footprintsFor(places: Place[] = PLACES): Footprint[] {
  const fps: Footprint[] = places.map((p) => ({ x: p.x, z: p.z, w: p.width, d: p.depth }));
  for (const x of LOT_X) fps.push({ x, z: LOT_Z, w: 18, d: 12 });
  return fps;
}

/** True when (x, z) is at least `margin` away from every footprint. */
export function clearOfFootprints(x: number, z: number, margin: number, fps: Footprint[]): boolean {
  return fps.every((f) => Math.abs(x - f.x) > f.w / 2 + margin || Math.abs(z - f.z) > f.d / 2 + margin);
}

export function clearOfDropSpots(x: number, z: number, margin: number): boolean {
  return DROP_SPOTS.every((d) => Math.hypot(x - d.x, z - d.z) > margin);
}

// Palms line the sidewalks beside the two main streets.
export const PALM_SPOTS: ReadonlyArray<readonly [number, number]> = [
  ...[22, 38, 54, 72].flatMap((z) => [[-15, z], [15, z], [-15, -z], [15, -z]] as const),
  ...[28, 44, 60, 76].flatMap((x) => [[x, 15], [-x, 15], [x, -15], [-x, -15]] as const),
].filter(([x, z]) => {
  const fps = footprintsFor();
  return clearOfFootprints(x, z, 1.5, fps) && clearOfDropSpots(x, z, 3);
});

/** Strings of papel picado bunting hung across the east-west street. */
export const BUNTING_X: readonly number[] = [-60, -36, 36, 60];

// --- Pedestrians ------------------------------------------------------

export type Route = { points: ReadonlyArray<readonly [number, number]>; loop: boolean; walkers: number; speed: number };

// All routes follow the sidewalks beside the two main streets.
export const ROUTES: readonly Route[] = [
  { points: [[-12, -12], [12, -12], [12, 12], [-12, 12]], loop: true, walkers: 3, speed: 2.2 },
  { points: [[-85, 12], [-16, 12]], loop: false, walkers: 2, speed: 2.0 },
  { points: [[16, -12], [85, -12]], loop: false, walkers: 2, speed: 2.4 },
  { points: [[-12, 16], [-12, 85]], loop: false, walkers: 2, speed: 1.9 },
  { points: [[12, -85], [12, -16]], loop: false, walkers: 2, speed: 2.1 },
];

export function routeLength(points: Route["points"], loop: boolean): number {
  let len = 0;
  const n = loop ? points.length : points.length - 1;
  for (let i = 0; i < n; i++) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    len += Math.hypot(b[0] - a[0], b[1] - a[1]);
  }
  return len;
}

/** Position and facing (radians, same convention as the player's yaw) after walking `dist` along a route. */
export function routePose(route: Pick<Route, "points" | "loop">, dist: number): { x: number; z: number; heading: number } {
  const pts = route.points;
  const L = routeLength(pts, route.loop);
  let s = ((dist % (route.loop ? L : 2 * L)) + (route.loop ? L : 2 * L)) % (route.loop ? L : 2 * L);
  let reversed = false;
  if (!route.loop && s > L) {
    s = 2 * L - s;
    reversed = true;
  }
  const n = route.loop ? pts.length : pts.length - 1;
  for (let i = 0; i < n; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % pts.length];
    const seg = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (s <= seg || i === n - 1) {
      const k = seg === 0 ? 0 : Math.min(1, s / seg);
      const dx = b[0] - a[0];
      const dz = b[1] - a[1];
      const heading = Math.atan2(reversed ? -dx : dx, reversed ? -dz : dz);
      return { x: a[0] + dx * k, z: a[1] + dz * k, heading };
    }
    s -= seg;
  }
  return { x: pts[0][0], z: pts[0][1], heading: 0 };
}

// --- Avatar looks -----------------------------------------------------

export type HairStyle = "short" | "long" | "bun" | "cap";
export type AvatarLook = { skin: number; hair: number; shirt: number; pants: number; hairStyle: HairStyle };

const SKIN = [0xf1c9a5, 0xe0ac81, 0xc68863, 0xa56a45, 0x7a4a2e, 0x5a3622];
const HAIR = [0x1c1410, 0x3a2418, 0x6b4426, 0x9a6b35, 0xb8b0a4, 0x2b2b3a];
const SHIRT = [0x2f7f9e, 0xd9822b, 0x5c9e46, 0x8a4fa3, 0xd04a6a, 0x3c5aa6, 0xe8c040, 0x2fa38a];
const PANTS = [0x2d3748, 0x4a4036, 0x1f2a44, 0x5a5f66, 0x6b3f2a];
const STYLES: HairStyle[] = ["short", "long", "bun", "cap"];

export function hashString(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

/** A stable, original look derived from a name, so a person looks the same on every screen. */
export function avatarLookFor(seed: string): AvatarLook {
  const h = hashString(seed);
  const pick = <T,>(arr: readonly T[], shift: number) => arr[((h >>> shift) ^ (h >>> (shift + 7))) % arr.length];
  return {
    skin: pick(SKIN, 0),
    hair: pick(HAIR, 3),
    shirt: pick(SHIRT, 6),
    pants: pick(PANTS, 9),
    hairStyle: pick(STYLES, 12),
  };
}
