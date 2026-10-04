import { NextRequest, NextResponse } from "next/server";
import { heartbeatStreamViewer, getLiveViewerCount } from "@/lib/db";

// POST /api/streams/:id/viewers/:sessionId/heartbeat — the viewer is
// still watching. The client calls this every ~30s while the stream page
// is open; getLiveViewerCount only counts sessions heartbeating within
// the last 60s, so a closed tab ages out on its own without needing an
// explicit "leave" call (browsers can't reliably fire one on close).
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string; sessionId: string } }
) {
  const streamId = Number(params.id);
  const sessionId = Number(params.sessionId);
  if (!Number.isInteger(streamId) || streamId <= 0 || !Number.isInteger(sessionId) || sessionId <= 0) {
    return NextResponse.json({ error: "Invalid id." }, { status: 400 });
  }

  heartbeatStreamViewer(sessionId);
  return NextResponse.json({ liveViewerCount: getLiveViewerCount(streamId) });
}
