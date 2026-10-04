import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/require-user";
import { getStreamById, postStreamComment, listStreamComments, getMemberBadgesForUser } from "@/lib/db";

const MAX_COMMENT_LENGTH = 1000;

function shapeComment(c: {
  id: number;
  stream_id: number;
  author_id: number;
  author_username: string;
  author_first_name: string | null;
  author_last_name: string | null;
  author_profile_photo_path: string | null;
  body: string;
  created_at: string;
}) {
  return {
    id: c.id,
    streamId: c.stream_id,
    authorId: c.author_id,
    authorUsername: c.author_username,
    authorName: [c.author_first_name, c.author_last_name].filter(Boolean).join(" ") || c.author_username,
    authorProfilePhotoPath: c.author_profile_photo_path,
    // Surfaced in chat next to the author's name — see
    // getMemberBadgesForUser (VIP/admin, Street Team, Rewards level).
    authorBadges: getMemberBadgesForUser(c.author_id).map((b) => b.label),
    body: c.body,
    createdAt: c.created_at,
  };
}

// GET /api/streams/:id/comments — live chat (or VOD comments once the
// stream has ended), oldest first. Public, same as the newsfeed.
export async function GET(
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

  const comments = listStreamComments(streamId);
  return NextResponse.json({ comments: comments.map(shapeComment) });
}

// POST /api/streams/:id/comments — post a chat message. Requires login;
// rejected with 403 if this user has been banned from this stream's chat
// (see stream_bans / postStreamComment in db.ts).
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

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  const { body: text } = (body ?? {}) as Record<string, unknown>;
  if (typeof text !== "string" || text.trim().length === 0) {
    return NextResponse.json({ error: "Comment text is required." }, { status: 400 });
  }
  if (text.length > MAX_COMMENT_LENGTH) {
    return NextResponse.json(
      { error: `Comment must be ${MAX_COMMENT_LENGTH} characters or fewer.` },
      { status: 400 }
    );
  }

  try {
    const comment = postStreamComment(streamId, session.sub, text.trim());
    return NextResponse.json({ comment: shapeComment(comment) }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Couldn't post that comment." },
      { status: 403 }
    );
  }
}
