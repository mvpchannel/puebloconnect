import { NextRequest, NextResponse } from "next/server";
import { getEventBySlug, EventWithMeta } from "@/lib/db";

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

// GET /api/events/:slug — a single event's details.
export async function GET(
  _req: NextRequest,
  { params }: { params: { slug: string } }
) {
  const event = getEventBySlug(params.slug);
  if (!event) return NextResponse.json({ error: "Event not found." }, { status: 404 });
  return NextResponse.json({ event: shapeEvent(event) });
}
