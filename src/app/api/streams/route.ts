import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/require-user";
import { isAllowedStreamUrl } from "@/lib/safe-url";
import { createStream, listStreams, getLiveViewerCount, StreamPlatform, StreamStatus, StreamWithHost } from "@/lib/db";

const VALID_PLATFORMS: StreamPlatform[] = ["youtube", "facebook", "vimeo"];
const VALID_STATUSES: StreamStatus[] = ["scheduled", "live", "ended"];
const MAX_TITLE_LENGTH = 150;
const MAX_DESCRIPTION_LENGTH = 2000;

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
    // Only meaningful while live — getLiveViewerCount counts recent
    // heartbeats, so it's 0/irrelevant for a scheduled or ended stream.
    liveViewerCount: s.status === "live" ? getLiveViewerCount(s.id) : null,
    createdAt: s.created_at,
    likeCount: s.like_count,
    commentCount: s.comment_count,
    likedByViewer: Boolean(s.liked_by_viewer),
  };
}

// GET /api/streams?status=live|scheduled|ended — browse streams/VODs.
// Viewing doesn't require login (same as the newsfeed) — "likedByViewer"
// is just false for an anonymous visitor.
export async function GET(req: NextRequest) {
  const session = requireUser(req);
  const { searchParams } = new URL(req.url);
  const statusParam = searchParams.get("status") ?? "live";
  if (!VALID_STATUSES.includes(statusParam as StreamStatus)) {
    return NextResponse.json({ error: "Invalid status." }, { status: 400 });
  }
  const streams = listStreams(statusParam as StreamStatus, session?.sub ?? null);
  return NextResponse.json({ streams: streams.map(shapeStream) });
}

// POST /api/streams — schedule or go live with a bring-your-own-stream
// broadcast (embedUrl points at the host's own YouTube/Facebook/Vimeo
// Live broadcast — this app never hosts the video itself). Requires
// login; any member can host, same as anyone can post to the newsfeed.
export async function POST(req: NextRequest) {
  const session = requireUser(req);
  if (!session) return NextResponse.json({ error: "Not logged in." }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  const { title, description, platform, embedUrl, scheduledFor, goLive } = (body ?? {}) as Record<
    string,
    unknown
  >;

  if (typeof title !== "string" || title.trim().length === 0) {
    return NextResponse.json({ error: "Title is required." }, { status: 400 });
  }
  if (title.length > MAX_TITLE_LENGTH) {
    return NextResponse.json({ error: `Title must be ${MAX_TITLE_LENGTH} characters or fewer.` }, { status: 400 });
  }
  if (typeof platform !== "string" || !VALID_PLATFORMS.includes(platform as StreamPlatform)) {
    return NextResponse.json({ error: "platform must be youtube, facebook, or vimeo." }, { status: 400 });
  }
  if (typeof embedUrl !== "string" || embedUrl.trim().length === 0) {
    return NextResponse.json({ error: "embedUrl is required." }, { status: 400 });
  }
  let parsedEmbedUrl: URL;
  try {
    parsedEmbedUrl = new URL(embedUrl);
  } catch {
    return NextResponse.json({ error: "embedUrl must be a valid URL." }, { status: 400 });
  }
  if (parsedEmbedUrl.protocol !== "https:") {
    return NextResponse.json({ error: "embedUrl must be an https URL." }, { status: 400 });
  }
  if (!isAllowedStreamUrl(platform, embedUrl.trim())) {
    return NextResponse.json(
      { error: "That link isn't from the platform you picked. Use a YouTube, Facebook or Vimeo broadcast link." },
      { status: 400 }
    );
  }

  let resolvedDescription: string | null = null;
  if (description !== undefined && description !== null) {
    if (typeof description !== "string") {
      return NextResponse.json({ error: "Invalid description." }, { status: 400 });
    }
    if (description.length > MAX_DESCRIPTION_LENGTH) {
      return NextResponse.json(
        { error: `Description must be ${MAX_DESCRIPTION_LENGTH} characters or fewer.` },
        { status: 400 }
      );
    }
    resolvedDescription = description.trim() || null;
  }

  if (scheduledFor !== undefined && scheduledFor !== null && typeof scheduledFor !== "string") {
    return NextResponse.json({ error: "Invalid scheduledFor." }, { status: 400 });
  }

  const stream = createStream(session.sub, {
    title: title.trim(),
    description: resolvedDescription,
    platform: platform as StreamPlatform,
    embedUrl,
    scheduledFor: (scheduledFor as string | null) ?? null,
    goLive: goLive === true,
  });

  return NextResponse.json({ stream: shapeStream(stream) }, { status: 201 });
}
