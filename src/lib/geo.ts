// Geolocation — spherical-geometry distance math plus an IP-to-location
// lookup. Two independent pieces, both real, no fake/simulated data:
//
// SPHERICAL GEOMETRY
// -------------------
// haversineMiles() computes great-circle distance between two lat/lng
// points — the same formula used for "X miles away" labels and "members
// near me" search. boundingBox() is the companion piece: a cheap
// SQL-filterable lat/lng rectangle around a point, used to narrow a query
// down to "roughly nearby" rows BEFORE paying for an exact haversine
// calculation on every row in the table — the standard two-phase pattern
// for proximity search in a database with no native geo index (node:sqlite
// has none). See findNearbyUsers in db.ts for the combined query.
//
// IP2LOCATION
// -----------
// lookupIpLocation() resolves a visitor's IP address to an approximate
// city/region/country + lat/lng, via IP2Location.io's HTTP API
// (https://api.ip2location.io) — a real third-party service, not a mock.
// It works keyless for light use (rate-limited); setting IP2LOCATION_API_KEY
// raises the limit and improves accuracy. This is the same "no SDK, one
// documented HTTP call" shape used for Stripe/Resend elsewhere in this
// codebase (see src/lib/stripe.ts, src/lib/email.ts).
//
// This sandbox's network egress allowlist blocks api.ip2location.io
// (verified by hand: a real fetch() to it returns "403 Host not in
// allowlist", same restriction documented in email.ts for api.resend.com),
// so real lookups can't be exercised from inside this development
// environment. Once deployed somewhere that host is reachable, this code
// resolves real IPs with no further changes. A private/loopback/
// unspecified IP (localhost, 10.x, 192.168.x, etc.) is never sent to the
// API — it can't be geolocated and doing so would just waste a request —
// lookupIpLocation returns null for those immediately.

export function haversineMiles(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const EARTH_RADIUS_MILES = 3958.8;
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_MILES * c;
}

export type BoundingBox = {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
};

// A rectangle of latitude/longitude that fully contains every point within
// radiusMiles of (lat, lng) — a superset of the true circle, cheap to
// express as a SQL WHERE clause (BETWEEN on two indexable columns) so a
// proximity query doesn't have to compute haversine distance for every row
// in the table. The caller still re-checks with haversineMiles() for the
// exact circle (see findNearbyUsers in db.ts) since the box's corners are
// up to ~41% farther away than the radius.
export function boundingBox(lat: number, lng: number, radiusMiles: number): BoundingBox {
  const MILES_PER_DEGREE_LAT = 69.0;
  const latDelta = radiusMiles / MILES_PER_DEGREE_LAT;

  // A degree of longitude covers less ground the farther you are from the
  // equator (it shrinks by cos(latitude)); clamp away from the poles so
  // this never divides by (near-)zero for an edge-case location.
  const clampedLat = Math.max(-89, Math.min(89, lat));
  const milesPerDegreeLng = MILES_PER_DEGREE_LAT * Math.cos((clampedLat * Math.PI) / 180);
  const lngDelta = radiusMiles / Math.max(milesPerDegreeLng, 1);

  return {
    minLat: lat - latDelta,
    maxLat: lat + latDelta,
    minLng: lng - lngDelta,
    maxLng: lng + lngDelta,
  };
}

const PRIVATE_IP_PATTERNS = [
  /^127\./, // loopback
  /^10\./, // RFC1918
  /^192\.168\./, // RFC1918
  /^172\.(1[6-9]|2\d|3[0-1])\./, // RFC1918 172.16.0.0/12
  /^169\.254\./, // link-local
  /^::1$/, // IPv6 loopback
  /^fc00:/i, // IPv6 unique local
  /^fe80:/i, // IPv6 link-local
];

export function isPrivateOrLocalIp(ip: string): boolean {
  return PRIVATE_IP_PATTERNS.some((p) => p.test(ip));
}

// Pulls the visitor's IP out of the headers a Next.js deployment actually
// receives it on. Behind a proxy/CDN (Vercel, nginx, Cloudflare, etc.) the
// real client address is in X-Forwarded-For (first entry) or X-Real-IP,
// never in a raw socket address Next.js exposes to a Route Handler — there
// is no req.ip here. Returns null if nothing usable is present (e.g. local
// dev with no proxy in front), rather than guessing.
export function getClientIp(req: { headers: { get(name: string): string | null } }): string | null {
  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) {
    const first = forwardedFor.split(",")[0]?.trim();
    if (first) return first;
  }
  const realIp = req.headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  return null;
}

export type IpLocation = {
  ip: string;
  city: string | null;
  region: string | null;
  country: string | null;
  latitude: number;
  longitude: number;
};

// Real HTTP call to IP2Location.io — see the module comment above for why
// this can't be exercised live in this sandbox. Returns null for a
// private/local IP, a malformed response, or any network/API failure —
// callers treat "couldn't determine location" as a normal, silent
// fallback (e.g. "set your location manually instead"), never a thrown
// error, since this is a nice-to-have enhancement, not a critical path.
export async function lookupIpLocation(ip: string): Promise<IpLocation | null> {
  if (!ip || isPrivateOrLocalIp(ip)) return null;

  const apiKey = process.env.IP2LOCATION_API_KEY;
  const url = new URL("https://api.ip2location.io/");
  url.searchParams.set("ip", ip);
  if (apiKey) url.searchParams.set("key", apiKey);

  try {
    const res = await fetch(url.toString());
    if (!res.ok) return null;
    const data = (await res.json()) as {
      ip?: string;
      city_name?: string;
      region_name?: string;
      country_name?: string;
      latitude?: number;
      longitude?: number;
      error?: unknown;
    };
    if (data.error || typeof data.latitude !== "number" || typeof data.longitude !== "number") {
      return null;
    }
    return {
      ip: data.ip ?? ip,
      city: data.city_name ?? null,
      region: data.region_name ?? null,
      country: data.country_name ?? null,
      latitude: data.latitude,
      longitude: data.longitude,
    };
  } catch {
    return null;
  }
}
