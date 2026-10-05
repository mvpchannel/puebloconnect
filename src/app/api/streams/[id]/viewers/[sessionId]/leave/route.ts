import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/require-user";
import { leaveStreamViewer, canUseViewerSession } from "@/lib/db";

// POST /api/streams/:id/viewers/:sessionId/leave — explicit "I closed the
// player" signal, sent on unmount/beforeunload when the browser manages
// to fire it. Not load-bearing for accuracy (see the heartbeat route's
// comment on staleness) — just makes the live count drop a little faster
// when it does fire.
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string; sessionId: string } }
) {
  const sessionId = Number(params.sessionId);
  if (!Number.isInteger(sessionId) || sessionId <= 0) {
    return NextResponse.json({ error: "Invalid session id." }, { status: 400 });
  }

  const streamId = Number(params.id);
  const caller = requireUser(req);
  if (!Number.isInteger(streamId) || !canUseViewerSession(sessionId, streamId, caller?.sub ?? null)) {
    return NextResponse.json({ error: "Not your viewing session." }, { status: 403 });
  }

  leaveStreamViewer(sessionId);
  return NextResponse.json({ left: true });
}
