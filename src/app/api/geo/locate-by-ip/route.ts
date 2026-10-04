import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/require-user";
import { updateUserLocation, getUserById } from "@/lib/db";
import { getClientIp, lookupIpLocation } from "@/lib/geo";

// POST /api/geo/locate-by-ip — detect the requesting user's approximate
// location from their IP address (coarse — city-level at best) and save
// it with source='ip'. Real call to IP2Location.io (see src/lib/geo.ts);
// returns a clear error rather than a fake location if the IP can't be
// resolved (private/local IP, API unreachable, etc.) — never silently
// fabricates a location for the response.
export async function POST(req: NextRequest) {
  const session = requireUser(req);
  if (!session) return NextResponse.json({ error: "Not logged in." }, { status: 401 });

  const ip = getClientIp(req);
  if (!ip) {
    return NextResponse.json(
      { error: "Couldn't determine your IP address. Try sharing your location manually instead." },
      { status: 400 }
    );
  }

  const location = await lookupIpLocation(ip);
  if (!location) {
    return NextResponse.json(
      {
        error:
          "Couldn't resolve a location from your IP address. Try sharing your location manually instead.",
      },
      { status: 422 }
    );
  }

  updateUserLocation(session.sub, {
    latitude: location.latitude,
    longitude: location.longitude,
    city: location.city,
    region: location.region,
    country: location.country,
    source: "ip",
  });

  const user = getUserById(session.sub)!;
  return NextResponse.json({
    location: {
      latitude: user.latitude,
      longitude: user.longitude,
      city: user.location_city,
      region: user.location_region,
      country: user.location_country,
      source: user.location_source,
      updatedAt: user.location_updated_at,
    },
  });
}
