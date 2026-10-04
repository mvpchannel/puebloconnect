import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/require-user";
import { getStreamById, createStreamClip, listStreamClips } from "@/lib/db";

const MAX_LABEL_LENGTH = 150;

function shapeClip(c: { id: number; label: string; timestamp_seconds: number }) {
  return { id: c.id, label: c.label, timestampSeconds: c.timestamp_seconds };
}

// GET /api/streams/:id/clips — highlight-clip timestamps for the
// replay carousel. Public.
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const streamId = Number(params.id);
  if (!Number.isInteger(streamId) || streamId <= 0) {
    return NextResponse.json({ error: "Invalid stream id." }, { status: 400 });
  }
  if (!getStreamById(streamId, null)) {
    return NextResponse.json({ error: "Stream not found." }, { status: 404 });
  }
  return NextResponse.json({ clips: listStreamClips(streamId).map(shapeClip) });
}

// POST /api/streams/:id/clips — mark a highlight timestamp. Host or
// admin only. Body: { label, timestampSeconds }.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = requireUser(req);
  if (!session) return NextResponse.json({ error: "Not logged in." }, { status: 401 });

  const streamId = Number(params.id);
  if (!Number.isInteger(streamId) || streamId <= 0) {
    return NextResponse.json({ error: "Invalid stream id." }, { status: 400 });
  }
  const stream = getStreamById(streamId, session.sub);
  if (!stream) return NextResponse.json({ error: "Stream not found." }, { status: 404 });
  const isHost = stream.host_id === session.sub;
  const isAdmin = session.role === "admin";
  if (!isHost && !isAdmin) {
    return NextResponse.json({ error: "Only the host or an admin can mark a clip." }, { status: 403 });
  }

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  const { label, timestampSeconds } = (payload ?? {}) as Record<string, unknown>;
  if (typeof label !== "string" || label.trim().length === 0) {
    return NextResponse.json({ error: "A label is required." }, { status: 400 });
  }
  if (label.length > MAX_LABEL_LENGTH) {
    return NextResponse.json({ error: `Labels must be ${MAX_LABEL_LENGTH} characters or fewer.` }, { status: 400 });
  }
  const seconds = Number(timestampSeconds);
  if (!Number.isInteger(seconds) || seconds < 0) {
    return NextResponse.json({ error: "timestampSeconds must be a non-negative whole number." }, { status: 400 });
  }

  const clip = createStreamClip(streamId, session.sub, label.trim(), seconds);
  return NextResponse.json({ clip: shapeClip(clip) }, { status: 201 });
}
