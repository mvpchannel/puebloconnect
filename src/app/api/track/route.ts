import { NextRequest, NextResponse } from "next/server";
import { recordPageView } from "@/lib/db";
import { checkAndRecordRateLimit, RATE_LIMITS, clientIp } from "@/lib/rate-limit";
import { isBot, classifySource, geoFromHeaders, visitorHash } from "@/lib/traffic";

// POST /api/track  { path, referrer } — count one page opened by a person. Sent by the
// small PageViewTracker in the page. Always answers 204 and never errors to the visitor: a
// problem here must not affect browsing. Not recorded: bots, the admin area, API paths.
// Stored: the page path, a one-way visitor fingerprint (never the IP), where the visit came
// from, and a rough location only if the host's proxy supplies one.
export async function POST(req: NextRequest) {
  const done = () => new NextResponse(null, { status: 204 });
  try {
    const ua = req.headers.get("user-agent");
    if (isBot(ua)) return done();
    const ip = clientIp(req);
    if (!checkAndRecordRateLimit(`track:ip:${ip}`, RATE_LIMITS.track).allowed) return done();

    let body: { path?: unknown; referrer?: unknown } = {};
    try {
      body = (await req.json()) ?? {};
    } catch {
      return done();
    }
    const path = typeof body.path === "string" ? body.path.split("?")[0].split("#")[0].slice(0, 200) : "";
    if (!path.startsWith("/") || path.startsWith("/admin") || path.startsWith("/api")) return done();
    const referrer = typeof body.referrer === "string" ? body.referrer.slice(0, 500) : "";

    const secret = process.env.SESSION_SECRET || "pueblo-connect";
    const geo = geoFromHeaders((n) => req.headers.get(n));
    recordPageView({
      path,
      visitorHash: visitorHash(ip, ua ?? "", secret),
      source: classifySource(referrer, req.headers.get("host") ?? ""),
      country: geo.country,
      region: geo.region,
      city: geo.city,
    });
  } catch {
    /* never surface a tracking problem to the visitor */
  }
  return done();
}
