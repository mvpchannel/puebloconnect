import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/require-user";
import { getEventBySlug, rsvpToEvent, cancelRsvp, getRsvpStatus } from "@/lib/db";

// POST /api/events/:slug/rsvp — body: { status: "going" | "interested" | "none" }
// "none" cancels an existing RSVP. Changing your mind (going <-> interested)
// replaces the existing RSVP rather than adding a second (see rsvpToEvent).
export async function POST(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  const session = requireUser(req);
  if (!session) return NextResponse.json({ error: "Not logged in." }, { status: 401 });

  const event = getEventBySlug(params.slug);
  if (!event) return NextResponse.json({ error: "Event not found." }, { status: 404 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  const { status } = (body ?? {}) as Record<string, unknown>;

  if (status !== "going" && status !== "interested" && status !== "none") {
    return NextResponse.json({ error: "Status must be 'going', 'interested', or 'none'." }, { status: 400 });
  }

  if (status === "none") {
    cancelRsvp(event.id, session.sub);
  } else {
    rsvpToEvent(event.id, session.sub, status);
  }

  return NextResponse.json({ status: getRsvpStatus(event.id, session.sub) });
}
