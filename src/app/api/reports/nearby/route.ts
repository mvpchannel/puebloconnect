import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/require-user";
import { getUserById, findNearbyNeighborhoodReports } from "@/lib/db";
import { boundingBox, haversineMiles } from "@/lib/geo";
import { shapeReport } from "@/lib/report-shape";

const DEFAULT_RADIUS_MILES = 5;
const MAX_RADIUS_MILES = 100;
const DEFAULT_LIMIT = 30;
const MAX_LIMIT = 100;

// GET /api/reports/nearby?radiusMiles=5&limit=30 — open reports within
// radiusMiles of the requesting user's own stored location, nearest
// first (same two-phase bounding-box-then-haversine approach as
// /api/members/nearby). Requires the requester to have a location set.
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
  const nearby = findNearbyNeighborhoodReports(user.latitude, user.longitude, radiusMiles, limit, box, haversineMiles);

  return NextResponse.json({
    radiusMiles,
    reports: nearby.map((r) => ({ ...shapeReport(r), distanceMiles: Math.round(r.distance_miles * 10) / 10 })),
  });
}
