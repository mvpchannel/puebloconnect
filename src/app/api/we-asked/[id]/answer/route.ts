import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/require-user";
import { getPuebloQuestionById, submitPuebloAnswer, getPuebloAnswerForUser, deletePuebloAnswer } from "@/lib/db";
import { checkAndRecordRateLimit } from "@/lib/rate-limit";
import { ANSWER_MAX } from "@/lib/we-asked";

// POST /api/we-asked/:id/answer — a member answers (or edits their answer to) an open question.
// The answer is held for staff review before it appears publicly.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = requireUser(req);
  if (!session) return NextResponse.json({ error: "Log in to answer." }, { status: 401 });
  const q = getPuebloQuestionById(Number(params.id));
  if (!q || q.status !== "open") return NextResponse.json({ error: "This question isn't open for answers." }, { status: 404 });

  let body: Record<string, unknown>;
  try {
    body = ((await req.json()) ?? {}) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  const text = typeof body.body === "string" ? body.body.trim() : "";
  if (!text || text.length > ANSWER_MAX) {
    return NextResponse.json({ error: `Write your answer (${ANSWER_MAX} characters max).` }, { status: 400 });
  }
  const limit = checkAndRecordRateLimit(`pueblo-answer:${session.sub}`, { max: 20, windowSeconds: 24 * 60 * 60 });
  if (!limit.allowed) return NextResponse.json({ error: "Too many answers today. Try again tomorrow." }, { status: 429 });

  const a = submitPuebloAnswer(q.id, session.sub, text);
  return NextResponse.json({ answer: { id: a.id, status: a.status } }, { status: 201 });
}

// DELETE — a member withdraws their own answer.
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = requireUser(req);
  if (!session) return NextResponse.json({ error: "Not logged in." }, { status: 401 });
  const a = getPuebloAnswerForUser(Number(params.id), session.sub);
  if (!a) return NextResponse.json({ error: "Not found." }, { status: 404 });
  deletePuebloAnswer(a.id);
  return NextResponse.json({ ok: true });
}
