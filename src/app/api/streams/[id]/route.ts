import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/require-user";
import { getStreamById, getLiveViewerCount, getTotalViewerSessionCount, StreamWithHost } from "@/lib/db";

function shapeStream(s: StreamWithHost) {
  return {
    id: s.id,
    hostId: s.host_id,
    hostUsername: s.host_username,
    hostName: [s.host_first_name, s.host_last_name].filter(Boolean).join(" ") || s.host_username,
    hostProfilePhotoPath: s.host_profile_photo_path,
    title: s.title,
    description: s.description,
    platform: s.platform,
    embedUrl: s.embed_url,
    status: s.status,
    scheduledFor: s.scheduled_for,
    startedAt: s.started_at,
    endedAt: s.ended_at,
    peakViewerCount: s.peak_viewer_count,
    createdAt: s.created_at,
    likeCount: s.like_count,
    commentCount: s.comment_count,
    likedByViewer: Boolean(s.liked_by_viewer),
  };
}

// GET /api/streams/:id — one stream's detail, plus its live viewer count
// (0/stale-filtered once nobody's heartbeat is recent) or its all-time
// view count once it's a VOD.
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const streamId = Number(params.id);
  if (!Number.isInteger(streamId) || streamId <= 0) {
    return NextResponse.json({ error: "Invalid stream id." }, { status: 400 });
  }

  const session = requireUser(req);
  const stream = getStreamById(streamId, session?.sub ?? null);
  if (!stream) return NextResponse.json({ error: "Stream not found." }, { status: 404 });

  return NextResponse.json({
    stream: shapeStream(stream),
    liveViewerCount: stream.status === "live" ? getLiveViewerCount(streamId) : null,
    totalViewCount: stream.status === "ended" ? getTotalViewerSessionCount(streamId) : null,
  });
}
