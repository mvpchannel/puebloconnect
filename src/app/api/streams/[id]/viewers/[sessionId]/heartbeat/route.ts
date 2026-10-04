import { NextRequest, NextResponse } from "next/server";
import { heartbeatStreamViewer, getLiveViewerCount } from "@/lib/db";

// POST /api/streams/:id/viewers/:sessionId/heartbeat — the viewer is
// still watching. The client calls this every ~30s while the stream page
// is open; getLiveViewerCount only counts sessions heartbeating within
// the last 60s, so a closed tab ages out on its own without needing an
// explicit "leave" call (browsers can't reliably fire one on close).
//
// Also where watch-to-earn progress and stream milestones get
// re-checked (see heartbeatStreamViewer) — there's no background job in
// this app, so "something that runs periodically while the page is
// open" is it.
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string; sessionId: string } }
) {
  const streamId = Number(params.id);
  const sessionId = Number(params.sessionId);
  if (!Number.isInteger(streamId) || streamId <= 0 || !Number.isInteger(sessionId) || sessionId <= 0) {
    return NextResponse.json({ error: "Invalid id." }, { status: 400 });
  }

  const watchProgress = heartbeatStreamViewer(sessionId);
  return NextResponse.json({
    liveViewerCount: getLiveViewerCount(streamId),
    watchProgress: watchProgress
      ? {
          elapsedSeconds: watchProgress.elapsedSeconds,
          thresholdSeconds: watchProgress.thresholdSeconds,
          pointsUnlocked: watchProgress.pointsUnlocked,
          pointsValue: watchProgress.pointsValue,
        }
      : null,
  });
}
