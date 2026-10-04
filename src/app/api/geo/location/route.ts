import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/require-user";
import { updateUserLocation, clearUserLocation, getUserById } from "@/lib/db";

function shapeLocation(u: {
  latitude: number | null;
  longitude: number | null;
  location_city: string | null;
  location_region: string | null;
  location_country: string | null;
  location_source: "manual" | "ip" | null;
  location_updated_at: string | null;
}) {
  return {
    latitude: u.latitude,
    longitude: u.longitude,
    city: u.location_city,
    region: u.location_region,
    country: u.location_country,
    source: u.location_source,
    updatedAt: u.location_updated_at,
  };
}

// GET /api/geo/location — the requesting user's currently stored location
// (or all nulls if they've never set one).
export async function GET(req: NextRequest) {
  const session = requireUser(req);
  if (!session) return NextResponse.json({ error: "Not logged in." }, { status: 401 });

  const user = getUserById(session.sub);
  if (!user) return NextResponse.json({ error: "User not found." }, { status: 404 });
  return NextResponse.json({ location: shapeLocation(user) });
}

// POST /api/geo/location — set the requesting user's location manually
// (e.g. from the browser's Geolocation API, which returns raw
// coordinates with no city/region/country attached — this is real
// spherical-geometry input, not a lookup, so those three stay null here).
// Body: { latitude, longitude }.
export async function POST(req: NextRequest) {
  const session = requireUser(req);
  if (!session) return NextResponse.json({ error: "Not logged in." }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  const { latitude, longitude } = (body ?? {}) as Record<string, unknown>;
  if (
    typeof latitude !== "number" ||
    typeof longitude !== "number" ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    return NextResponse.json({ error: "Invalid latitude/longitude." }, { status: 400 });
  }

  updateUserLocation(session.sub, { latitude, longitude, source: "manual" });
  const user = getUserById(session.sub)!;
  return NextResponse.json({ location: shapeLocation(user) });
}

// DELETE /api/geo/location — stop sharing location. Privacy-respecting
// default is no stored location at all.
export async function DELETE(req: NextRequest) {
  const session = requireUser(req);
  if (!session) return NextResponse.json({ error: "Not logged in." }, { status: 401 });

  clearUserLocation(session.sub);
  return NextResponse.json({ cleared: true });
}
