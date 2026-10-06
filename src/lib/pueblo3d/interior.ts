// Inside a business: room layout, collision and interaction spots.
// Pure data and maths (no Three.js) so it can be unit-tested. All
// coordinates are local to the room: the door is on the +z wall and the
// counter is against the back (-z) wall.

/** Interiors are built far from the city so the two scenes never overlap. */
export const INTERIOR_OFFSET_X = 500;

export const ROOM = { halfW: 15, halfD: 18, height: 10 } as const;

export type Rect = { minX: number; maxX: number; minZ: number; maxZ: number };
export type HotspotId = "deal" | "menu" | "tv" | "host" | "door";
export type Hotspot = { id: HotspotId; label: string; x: number; z: number; radius: number };

const rect = (cx: number, cz: number, hw: number, hd: number): Rect => ({
  minX: cx - hw,
  maxX: cx + hw,
  minZ: cz - hd,
  maxZ: cz + hd,
});

export const TABLES: ReadonlyArray<readonly [number, number]> = [
  [-8, 2],
  [-8, 10],
  [8, 10],
  [0, 4],
];

/** Everything the avatar cannot walk through (the counter, the area behind it and the tables). */
export const BLOCKERS: readonly Rect[] = [
  rect(0, -14.2, 7.4, 3.9), // counter and the staff area behind it
  ...TABLES.map(([x, z]) => rect(x, z, 2.3, 2.3)),
];

export const SPAWN = { x: 0, z: 12.5 } as const;

export const HOTSPOTS: readonly Hotspot[] = [
  { id: "deal", label: "See today's deal", x: -4.5, z: -9, radius: 3.2 },
  { id: "menu", label: "View menu & details", x: 4.5, z: -9, radius: 3.2 },
  { id: "host", label: "Talk to the host", x: 0, z: -9, radius: 1.8 },
  { id: "tv", label: "Watch the Pueblo screen", x: 11.5, z: -1, radius: 4.2 },
  { id: "door", label: "Leave", x: 0, z: 16.2, radius: 2.4 },
];

const MARGIN = 0.6; // the avatar's radius

export function isBlocked(x: number, z: number): boolean {
  if (x < -ROOM.halfW + MARGIN || x > ROOM.halfW - MARGIN) return true;
  if (z < -ROOM.halfD + MARGIN || z > ROOM.halfD - 0.4) return true;
  return BLOCKERS.some((b) => x > b.minX - MARGIN && x < b.maxX + MARGIN && z > b.minZ - MARGIN && z < b.maxZ + MARGIN);
}

/** Move from one point toward another, sliding along walls and furniture instead of stopping dead. */
export function resolveMove(fx: number, fz: number, tx: number, tz: number): { x: number; z: number } {
  if (!isBlocked(tx, tz)) return { x: tx, z: tz };
  if (!isBlocked(tx, fz)) return { x: tx, z: fz };
  if (!isBlocked(fx, tz)) return { x: fx, z: tz };
  return { x: fx, z: fz };
}

/** The closest hotspot the avatar is standing in range of, if any. */
export function nearestHotspot(x: number, z: number): Hotspot | null {
  let best: Hotspot | null = null;
  let bestD = Infinity;
  for (const h of HOTSPOTS) {
    const d = Math.hypot(x - h.x, z - h.z);
    if (d <= h.radius && d < bestD) {
      best = h;
      bestD = d;
    }
  }
  return best;
}
