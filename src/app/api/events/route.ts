import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/require-user";
import {
  createEvent,
  listEvents,
  getBusinessById,
  isBusinessOwner,
  EventWithMeta,
} from "@/lib/db";

const MAX_TITLE_LENGTH = 150;
const MAX_DESCRIPTION_LENGTH = 2000;
const MAX_LOCATION_LENGTH = 200;

function shapeEvent(e: EventWithMeta) {
  return {
    id: e.id,
    title: e.title,
    slug: e.slug,
    description: e.description,
    locationText: e.location_text,
    startsAt: e.starts_at,
    endsAt: e.ends_at,
    coverPhotoPath: e.cover_photo_path,
    creatorId: e.creator_id,
    creatorUsername: e.creator_username,
    businessId: e.business_id,
    businessName: e.business_name,
    businessSlug: e.business_slug,
    goingCount: e.going_count,
    interestedCount: e.interested_count,
    checkinCount: e.checkin_count,
    postCount: e.post_count,
    createdAt: e.created_at,
  };
}

// GET /api/events?when=upcoming|past — browse events.
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const when = searchParams.get("when") === "past" ? "past" : "upcoming";
  const events = listEvents(when);
  return NextResponse.json({ events: events.map(shapeEvent) });
}

// POST /api/events — create an event. Requires login. Optionally links
// it to a business channel the creator owns (events hosted/sponsored by
// a business) — linking to a business you don't own is rejected.
export async function POST(req: NextRequest) {
  const session = requireUser(req);
  if (!session) return NextResponse.json({ error: "Not logged in." }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { title, description, locationText, startsAt, endsAt, businessId } =
    (body ?? {}) as Record<string, unknown>;

  if (typeof title !== "string" || title.trim().length === 0) {
    return NextResponse.json({ error: "Event title is required." }, { status: 400 });
  }
  if (title.length > MAX_TITLE_LENGTH) {
    return NextResponse.json(
      { error: `Title must be ${MAX_TITLE_LENGTH} characters or fewer.` },
      { status: 400 }
    );
  }

  if (typeof startsAt !== "string" || Number.isNaN(Date.parse(startsAt))) {
    return NextResponse.json({ error: "A valid start date/time is required." }, { status: 400 });
  }

  let resolvedEndsAt: string | null = null;
  if (endsAt !== undefined && endsAt !== null) {
    if (typeof endsAt !== "string" || Number.isNaN(Date.parse(endsAt))) {
      return NextResponse.json({ error: "Invalid end date/time." }, { status: 400 });
    }
    resolvedEndsAt = endsAt;
  }

  function optionalString(value: unknown, maxLength: number, label: string):
    | { ok: true; value: string | null }
    | { ok: false; error: string } {
    if (value === undefined || value === null) return { ok: true, value: null };
    if (typeof value !== "string") return { ok: false, error: `Invalid ${label}.` };
    if (value.length > maxLength) {
      return { ok: false, error: `${label} must be ${maxLength} characters or fewer.` };
    }
    return { ok: true, value: value.trim() || null };
  }

  const descriptionResult = optionalString(description, MAX_DESCRIPTION_LENGTH, "Description");
  if (!descriptionResult.ok) return NextResponse.json({ error: descriptionResult.error }, { status: 400 });

  const locationResult = optionalString(locationText, MAX_LOCATION_LENGTH, "Location");
  if (!locationResult.ok) return NextResponse.json({ error: locationResult.error }, { status: 400 });

  let resolvedBusinessId: number | null = null;
  if (businessId !== undefined && businessId !== null) {
    if (typeof businessId !== "number" || !Number.isInteger(businessId)) {
      return NextResponse.json({ error: "Invalid businessId." }, { status: 400 });
    }
    const business = getBusinessById(businessId);
    if (!business) return NextResponse.json({ error: "Business not found." }, { status: 404 });
    if (!isBusinessOwner(businessId, session.sub)) {
      return NextResponse.json(
        { error: "You can only host an event under a business channel you own." },
        { status: 403 }
      );
    }
    resolvedBusinessId = businessId;
  }

  const event = createEvent(
    session.sub,
    title.trim(),
    descriptionResult.value,
    locationResult.value,
    startsAt,
    resolvedEndsAt,
    resolvedBusinessId
  );
  return NextResponse.json({ event: shapeEvent(event) }, { status: 201 });
}
