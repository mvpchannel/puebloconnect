import { NextRequest, NextResponse } from "next/server";
import { getStreamPinnedItem, getStreamPollUserVote } from "@/lib/db";
import { requireUser } from "@/lib/require-user";

// GET /api/streams/:id/pinned — whatever's currently pinned at the top
// of chat: an open poll (with live results) if one exists, otherwise
// the pinned announcement, otherwise nothing. No login required to
// view; a logged-in viewer also gets their own vote on the poll, if any.
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const streamId = Number(params.id);
  if (!Number.isInteger(streamId) || streamId <= 0) {
    return NextResponse.json({ error: "Invalid stream id." }, { status: 400 });
  }

  const pinned = getStreamPinnedItem(streamId);
  if (!pinned) return NextResponse.json({ pinned: null });

  if (pinned.type === "poll") {
    const session = requireUser(req);
    const myVote = session ? getStreamPollUserVote(pinned.poll.id, session.sub) : null;
    return NextResponse.json({
      pinned: {
        type: "poll",
        poll: { id: pinned.poll.id, question: pinned.poll.question, closedAt: pinned.poll.closed_at },
        options: pinned.options.map((o) => ({ id: o.id, text: o.option_text, voteCount: o.vote_count })),
        myVote,
      },
    });
  }

  return NextResponse.json({
    pinned: {
      type: "announcement",
      announcement: { id: pinned.announcement.id, body: pinned.announcement.body, createdAt: pinned.announcement.created_at },
    },
  });
}
