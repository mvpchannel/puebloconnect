import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/require-user";
import { getEventBySlug, checkInToEvent, isCheckedIn, grantPassportStamp } from "@/lib/db";

// POST /api/events/:slug/checkin — a real "I was there", independent of
// RSVP (you can check in without having RSVP'd first, or RSVP without
// ever checking in). Idempotent — see checkInToEvent in db.ts.
//
// Also grants a Pueblo Passport stamp for this event — a check-in is a
// deliberate action (unlike just loading a page), so it's handled here
// rather than through the generic PassportVisitBeacon used by
// business/live/explore-3d pages.
export async function POST(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  const session = requireUser(req);
  if (!session) return NextResponse.json({ error: "Not logged in." }, { status: 401 });

  const event = getEventBySlug(params.slug);
  if (!event) return NextResponse.json({ error: "Event not found." }, { status: 404 });

  checkInToEvent(event.id, session.sub);
  grantPassportStamp(session.sub, "event", event.id, `Checked into ${event.title}`);
  return NextResponse.json({ checkedIn: true });
}
