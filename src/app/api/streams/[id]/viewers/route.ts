import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/require-user";
import { getStreamById, joinStreamViewer } from "@/lib/db";

// POST /api/streams/:id/viewers — register a viewer session (called when
// a visitor opens the stream page). Works logged-out too — watching a
// public stream doesn't require an account, only commenting/liking do;
// an anonymous session just has userId=null. Returns the sessionId the
// client must send back on every heartbeat/leave call.
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const streamId = Number(params.id);
  if (!Number.isInteger(streamId) || streamId <= 0) {
    return NextResponse.json({ error: "Invalid stream id." }, { status: 400 });
  }
  if (!getStreamById(streamId, null)) {
    return NextResponse.json({ error: "Stream not found." }, { status: 404 });
  }

  const session = requireUser(req);
  const sessionId = joinStreamViewer(streamId, session?.sub ?? null);
  return NextResponse.json({ viewerSessionId: sessionId }, { status: 201 });
}
