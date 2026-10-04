import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/require-user";
import { getStreamById, getQaQuestionById, toggleQaVote } from "@/lib/db";

// POST /api/streams/:id/qa/:questionId/vote — toggle an upvote.
// Requires login.
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string; questionId: string } }
) {
  const session = requireUser(req);
  if (!session) return NextResponse.json({ error: "Not logged in." }, { status: 401 });

  const streamId = Number(params.id);
  const questionId = Number(params.questionId);
  if (!Number.isInteger(streamId) || streamId <= 0 || !Number.isInteger(questionId) || questionId <= 0) {
    return NextResponse.json({ error: "Invalid id." }, { status: 400 });
  }
  if (!getStreamById(streamId, session.sub)) {
    return NextResponse.json({ error: "Stream not found." }, { status: 404 });
  }
  const question = getQaQuestionById(questionId);
  if (!question || question.stream_id !== streamId) {
    return NextResponse.json({ error: "Question not found." }, { status: 404 });
  }

  const voteCount = toggleQaVote(questionId, session.sub);
  return NextResponse.json({ voteCount });
}
