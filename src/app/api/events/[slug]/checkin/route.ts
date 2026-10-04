import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/require-user";
import { getEventBySlug, checkInToEvent, isCheckedIn } from "@/lib/db";

// POST /api/events/:slug/checkin — a real "I was there", independent of
// RSVP (you can check in without having RSVP'd first, or RSVP without
// ever checking in). Idempotent — see checkInToEvent in db.ts.
export async function POST(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  const session = requireUser(req);
  if (!session) return NextResponse.json({ error: "Not logged in." }, { status: 401 });

  const event = getEventBySlug(params.slug);
  if (!event) return NextResponse.json({ error: "Event not found." }, { status: 404 });

  checkInToEvent(event.id, session.sub);
  return NextResponse.json({ checkedIn: true });
}
