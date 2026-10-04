import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/require-user";
import { getStreamById, pinStreamAnnouncement, unpinStreamAnnouncement } from "@/lib/db";

const MAX_LENGTH = 300;

function checkHostOrAdmin(session: { sub: number; role: string }, streamId: number) {
  const stream = getStreamById(streamId, session.sub);
  if (!stream) return { error: "Stream not found.", status: 404 as const };
  const isHost = stream.host_id === session.sub;
  const isAdmin = session.role === "admin";
  if (!isHost && !isAdmin) return { error: "Only the host or an admin can do that.", status: 403 as const };
  return null;
}

// POST /api/streams/:id/announcement — pin an announcement, replacing
// whatever was pinned before. Host or admin only. Body: { body }.
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = requireUser(req);
  if (!session) return NextResponse.json({ error: "Not logged in." }, { status: 401 });

  const streamId = Number(params.id);
  if (!Number.isInteger(streamId) || streamId <= 0) {
    return NextResponse.json({ error: "Invalid stream id." }, { status: 400 });
  }

  const denied = checkHostOrAdmin(session, streamId);
  if (denied) return NextResponse.json({ error: denied.error }, { status: denied.status });

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  const { body } = (payload ?? {}) as Record<string, unknown>;
  if (typeof body !== "string" || body.trim().length === 0) {
    return NextResponse.json({ error: "An announcement body is required." }, { status: 400 });
  }
  if (body.length > MAX_LENGTH) {
    return NextResponse.json({ error: `Announcements must be ${MAX_LENGTH} characters or fewer.` }, { status: 400 });
  }

  const announcement = pinStreamAnnouncement(streamId, session.sub, body.trim());
  return NextResponse.json({ announcement: { id: announcement.id, body: announcement.body } }, { status: 201 });
}

// DELETE /api/streams/:id/announcement — unpin whatever's currently
// pinned. Host or admin only.
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = requireUser(req);
  if (!session) return NextResponse.json({ error: "Not logged in." }, { status: 401 });

  const streamId = Number(params.id);
  if (!Number.isInteger(streamId) || streamId <= 0) {
    return NextResponse.json({ error: "Invalid stream id." }, { status: 400 });
  }

  const denied = checkHostOrAdmin(session, streamId);
  if (denied) return NextResponse.json({ error: denied.error }, { status: denied.status });

  unpinStreamAnnouncement(streamId);
  return NextResponse.json({ unpinned: true });
}
