import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/require-user";
import { getStreamById, getQaQuestionById, resolveQaQuestion } from "@/lib/db";

// POST /api/streams/:id/qa/:questionId/resolve — mark a question
// answered or dismissed. Host or admin only. Body: { status: "answered" | "dismissed" }.
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
  const stream = getStreamById(streamId, session.sub);
  if (!stream) return NextResponse.json({ error: "Stream not found." }, { status: 404 });
  const isHost = stream.host_id === session.sub;
  const isAdmin = session.role === "admin";
  if (!isHost && !isAdmin) {
    return NextResponse.json({ error: "Only the host or an admin can resolve questions." }, { status: 403 });
  }

  const question = getQaQuestionById(questionId);
  if (!question || question.stream_id !== streamId) {
    return NextResponse.json({ error: "Question not found." }, { status: 404 });
  }

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  const { status } = (payload ?? {}) as Record<string, unknown>;
  if (status !== "answered" && status !== "dismissed") {
    return NextResponse.json({ error: "status must be answered or dismissed." }, { status: 400 });
  }

  const ok = resolveQaQuestion(questionId, status);
  if (!ok) return NextResponse.json({ error: "That question was already resolved." }, { status: 409 });
  return NextResponse.json({ ok: true });
}
