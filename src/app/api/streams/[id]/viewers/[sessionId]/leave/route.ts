import { NextRequest, NextResponse } from "next/server";
import { leaveStreamViewer } from "@/lib/db";

// POST /api/streams/:id/viewers/:sessionId/leave — explicit "I closed the
// player" signal, sent on unmount/beforeunload when the browser manages
// to fire it. Not load-bearing for accuracy (see the heartbeat route's
// comment on staleness) — just makes the live count drop a little faster
// when it does fire.
export async function POST(
  req: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  const sessionId = Number(params.sessionId);
  if (!Number.isInteger(sessionId) || sessionId <= 0) {
    return NextResponse.json({ error: "Invalid session id." }, { status: 400 });
  }

  leaveStreamViewer(sessionId);
  return NextResponse.json({ left: true });
}
