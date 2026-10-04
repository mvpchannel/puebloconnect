import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/require-user";
import { getStreamById, toggleStreamLike } from "@/lib/db";

// POST /api/streams/:id/like — toggle the requesting user's like on a
// stream. Same idempotent-per-click pattern as /api/posts/:id/like.
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
  if (!getStreamById(streamId, session.sub)) {
    return NextResponse.json({ error: "Stream not found." }, { status: 404 });
  }

  const result = toggleStreamLike(streamId, session.sub);
  return NextResponse.json(result);
}
