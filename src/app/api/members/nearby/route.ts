import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/require-user";
import { getUserById, findNearbyUsers } from "@/lib/db";
import { boundingBox, haversineMiles } from "@/lib/geo";

const DEFAULT_RADIUS_MILES = 25;
const MAX_RADIUS_MILES = 500;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

// GET /api/members/nearby?radiusMiles=25&limit=20 — other members within
// radiusMiles of the requesting user's own stored location, nearest
// first. Requires the requester to have a location set (via
// /api/geo/location or /api/geo/locate-by-ip) — there's nothing to center
// the search on otherwise.
export async function GET(req: NextRequest) {
  const session = requireUser(req);
  if (!session) return NextResponse.json({ error: "Not logged in." }, { status: 401 });

  const user = getUserById(session.sub);
  if (!user || user.latitude === null || user.longitude === null) {
    return NextResponse.json(
      { error: "Set your location first (see /api/geo/location or /api/geo/locate-by-ip)." },
      { status: 400 }
    );
  }

  const { searchParams } = new URL(req.url);
  let radiusMiles = Number(searchParams.get("radiusMiles") ?? DEFAULT_RADIUS_MILES);
  if (!Number.isFinite(radiusMiles) || radiusMiles <= 0) radiusMiles = DEFAULT_RADIUS_MILES;
  radiusMiles = Math.min(radiusMiles, MAX_RADIUS_MILES);

  let limit = Number(searchParams.get("limit") ?? DEFAULT_LIMIT);
  if (!Number.isFinite(limit) || limit <= 0) limit = DEFAULT_LIMIT;
  limit = Math.min(limit, MAX_LIMIT);

  const box = boundingBox(user.latitude, user.longitude, radiusMiles);
  const nearby = findNearbyUsers(
    user.latitude,
    user.longitude,
    radiusMiles,
    session.sub,
    limit,
    box,
    haversineMiles
  );

  return NextResponse.json({
    radiusMiles,
    members: nearby.map((m) => ({
      userId: m.user_id,
      username: m.username,
      name: [m.first_name, m.last_name].filter(Boolean).join(" ") || m.username,
      profilePhotoPath: m.profile_photo_path,
      city: m.location_city,
      region: m.location_region,
      distanceMiles: Math.round(m.distance_miles * 10) / 10,
    })),
  });
}
