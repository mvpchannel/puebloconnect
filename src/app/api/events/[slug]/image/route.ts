import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/require-user";
import { requireAdmin } from "@/lib/require-admin";
import { limitMember } from "@/lib/rate-limit";
import { readImageChange } from "@/lib/entity-image";
import { getEventBySlug, setEventCover } from "@/lib/db";

// POST /api/events/:slug/image — { imageDataUrl } or { remove: true }.
// The event's creator (or an admin) only.
export async function POST(req: NextRequest, { params }: { params: { slug: string } }) {
  const session = requireUser(req);
  if (!session) return NextResponse.json({ error: "Not logged in." }, { status: 401 });
  const limited = limitMember(session.sub, "upload");
  if (limited) return limited as NextResponse;

  const event = getEventBySlug(params.slug);
  if (!event) return NextResponse.json({ error: "Event not found." }, { status: 404 });
  if (event.creator_id !== session.sub && !requireAdmin(req)) {
    return NextResponse.json({ error: "Only the event's creator can change its picture." }, { status: 403 });
  }

  const change = await readImageChange(req, "events");
  if ("error" in change) return change.error;
  setEventCover(event.id, change.path);
  return NextResponse.json({ path: change.path });
}
