import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/require-user";
import { addStreamReaction, listStreamReactionsSince, StreamReactionEmoji } from "@/lib/db";

const VALID_EMOJI: StreamReactionEmoji[] = ["heart", "fire", "clap", "laugh", "wow"];

// GET /api/streams/:id/reactions?since=<id> — polled by the client to
// pick up new floating reactions without re-showing ones already
// rendered. No login required to view.
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const streamId = Number(params.id);
  if (!Number.isInteger(streamId) || streamId <= 0) {
    return NextResponse.json({ error: "Invalid stream id." }, { status: 400 });
  }
  const since = Number(req.nextUrl.searchParams.get("since") ?? "0");
  const reactions = listStreamReactionsSince(streamId, Number.isInteger(since) ? since : 0, 200);
  return NextResponse.json({
    reactions: reactions.map((r) => ({ id: r.id, userId: r.user_id, emoji: r.emoji, createdAt: r.created_at })),
  });
}

// POST /api/streams/:id/reactions — tap a reaction. Repeatable, not
// idempotent (see addStreamReaction) — tapping 🔥 five times sends five.
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = requireUser(req);
  if (!session) return NextResponse.json({ error: "Log in to react." }, { status: 401 });

  const streamId = Number(params.id);
  if (!Number.isInteger(streamId) || streamId <= 0) {
    return NextResponse.json({ error: "Invalid stream id." }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  const { emoji } = (body ?? {}) as Record<string, unknown>;
  if (typeof emoji !== "string" || !VALID_EMOJI.includes(emoji as StreamReactionEmoji)) {
    return NextResponse.json({ error: "Invalid emoji." }, { status: 400 });
  }

  const reaction = addStreamReaction(streamId, session.sub, emoji as StreamReactionEmoji);
  return NextResponse.json({ reaction: { id: reaction.id, emoji: reaction.emoji } }, { status: 201 });
}
