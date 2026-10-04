import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/require-user";
import { getStreamPollById, listStreamPollOptions, castStreamPollVote } from "@/lib/db";

// POST /api/streams/:id/polls/:pollId/vote — vote (or change your vote)
// on the currently open poll. Body: { optionId }.
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string; pollId: string } }
) {
  const session = requireUser(req);
  if (!session) return NextResponse.json({ error: "Log in to vote." }, { status: 401 });

  const pollId = Number(params.pollId);
  if (!Number.isInteger(pollId) || pollId <= 0) {
    return NextResponse.json({ error: "Invalid poll id." }, { status: 400 });
  }

  const poll = getStreamPollById(pollId);
  if (!poll) return NextResponse.json({ error: "Poll not found." }, { status: 404 });
  if (poll.closed_at) return NextResponse.json({ error: "This poll is closed." }, { status: 409 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  const { optionId } = (body ?? {}) as Record<string, unknown>;
  if (typeof optionId !== "number" || !Number.isInteger(optionId)) {
    return NextResponse.json({ error: "Invalid optionId." }, { status: 400 });
  }

  const options = listStreamPollOptions(pollId);
  if (!options.some((o) => o.id === optionId)) {
    return NextResponse.json({ error: "That option isn't part of this poll." }, { status: 400 });
  }

  castStreamPollVote(pollId, optionId, session.sub);
  const updated = listStreamPollOptions(pollId);
  return NextResponse.json({
    options: updated.map((o) => ({ id: o.id, text: o.option_text, voteCount: o.vote_count })),
  });
}
