import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/require-user";
import { getStreamById, requestSpotlight, listSpotlightRequests } from "@/lib/db";

const MAX_MESSAGE_LENGTH = 200;

function shapeRequest(r: {
  id: number;
  user_id: number;
  username: string;
  first_name: string | null;
  last_name: string | null;
  profile_photo_path: string | null;
  message: string | null;
  status: string;
  created_at: string;
}) {
  return {
    id: r.id,
    userId: r.user_id,
    userName: [r.first_name, r.last_name].filter(Boolean).join(" ") || r.username,
    userProfilePhotoPath: r.profile_photo_path,
    message: r.message,
    status: r.status,
    createdAt: r.created_at,
  };
}

// GET /api/streams/:id/spotlight — the Booth Spotlight request queue.
// Host or admin only (it's a backstage list, not a public one).
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
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
    return NextResponse.json({ error: "Only the host or an admin can view spotlight requests." }, { status: 403 });
  }

  const requests = listSpotlightRequests(streamId);
  return NextResponse.json({ requests: requests.map(shapeRequest) });
}

// POST /api/streams/:id/spotlight — ask to be brought on/featured.
// Requires login. Re-requesting while already pending just returns
// the existing request rather than piling up duplicates.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = requireUser(req);
  if (!session) return NextResponse.json({ error: "Not logged in." }, { status: 401 });

  const streamId = Number(params.id);
  if (!Number.isInteger(streamId) || streamId <= 0) {
    return NextResponse.json({ error: "Invalid stream id." }, { status: 400 });
  }
  if (!getStreamById(streamId, session.sub)) {
    return NextResponse.json({ error: "Stream not found." }, { status: 404 });
  }

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    payload = {};
  }
  const { message } = (payload ?? {}) as Record<string, unknown>;
  let resolvedMessage: string | null = null;
  if (message !== undefined && message !== null) {
    if (typeof message !== "string") {
      return NextResponse.json({ error: "Invalid message." }, { status: 400 });
    }
    if (message.length > MAX_MESSAGE_LENGTH) {
      return NextResponse.json({ error: `Message must be ${MAX_MESSAGE_LENGTH} characters or fewer.` }, { status: 400 });
    }
    resolvedMessage = message.trim() || null;
  }

  const request = requestSpotlight(streamId, session.sub, resolvedMessage);
  return NextResponse.json({ request: shapeRequest(request) }, { status: 201 });
}
