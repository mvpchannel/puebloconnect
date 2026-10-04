import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/require-user";
import { getStreamById, getStreamPollById, closeStreamPoll } from "@/lib/db";

// POST /api/streams/:id/polls/:pollId/close — close the poll early.
// Host or admin only.
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string; pollId: string } }
) {
  const session = requireUser(req);
  if (!session) return NextResponse.json({ error: "Not logged in." }, { status: 401 });

  const streamId = Number(params.id);
  const pollId = Number(params.pollId);
  if (!Number.isInteger(streamId) || !Number.isInteger(pollId)) {
    return NextResponse.json({ error: "Invalid id." }, { status: 400 });
  }

  const stream = getStreamById(streamId, session.sub);
  if (!stream) return NextResponse.json({ error: "Stream not found." }, { status: 404 });
  const isHost = stream.host_id === session.sub;
  const isAdmin = session.role === "admin";
  if (!isHost && !isAdmin) {
    return NextResponse.json({ error: "Only the host or an admin can close a poll." }, { status: 403 });
  }

  const poll = getStreamPollById(pollId);
  if (!poll || poll.stream_id !== streamId) {
    return NextResponse.json({ error: "Poll not found." }, { status: 404 });
  }

  closeStreamPoll(pollId);
  return NextResponse.json({ closed: true });
}
