import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/require-admin";
import { createBoothQuestion, listBoothQuestions } from "@/lib/db";

const MAX_QUESTION_LENGTH = 300;

// GET /api/admin/booth/questions — every Booth question, newest first.
export async function GET(req: NextRequest) {
  const admin = requireAdmin(req);
  if (!admin) return NextResponse.json({ error: "Admin access required." }, { status: 403 });

  const questions = listBoothQuestions();
  return NextResponse.json({
    questions: questions.map((q) => ({
      id: q.id,
      questionText: q.question_text,
      opensAt: q.opens_at,
      closesAt: q.closes_at,
      isOpen: Boolean(q.is_open),
      answerCount: q.answer_count,
    })),
  });
}

// POST /api/admin/booth/questions — open a new weekly question. Admin
// only — the question itself is curated, not member-submitted.
export async function POST(req: NextRequest) {
  const admin = requireAdmin(req);
  if (!admin) return NextResponse.json({ error: "Admin access required." }, { status: 403 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  const { questionText, opensAt, closesAt } = (body ?? {}) as Record<string, unknown>;

  if (typeof questionText !== "string" || questionText.trim().length === 0) {
    return NextResponse.json({ error: "A question is required." }, { status: 400 });
  }
  if (questionText.length > MAX_QUESTION_LENGTH) {
    return NextResponse.json(
      { error: `Questions must be ${MAX_QUESTION_LENGTH} characters or fewer.` },
      { status: 400 }
    );
  }

  let opensAtIso: string | null = null;
  if (opensAt !== undefined && opensAt !== null && opensAt !== "") {
    const parsed = new Date(opensAt as string);
    if (Number.isNaN(parsed.getTime())) {
      return NextResponse.json({ error: "Invalid opens-at date." }, { status: 400 });
    }
    opensAtIso = parsed.toISOString();
  }

  let closesAtIso: string | null = null;
  if (closesAt !== undefined && closesAt !== null && closesAt !== "") {
    const parsed = new Date(closesAt as string);
    if (Number.isNaN(parsed.getTime())) {
      return NextResponse.json({ error: "Invalid closes-at date." }, { status: 400 });
    }
    closesAtIso = parsed.toISOString();
  }

  const question = createBoothQuestion(admin.sub, questionText.trim(), opensAtIso, closesAtIso);
  return NextResponse.json(
    {
      question: {
        id: question.id,
        questionText: question.question_text,
        opensAt: question.opens_at,
        closesAt: question.closes_at,
        isOpen: Boolean(question.is_open),
      },
    },
    { status: 201 }
  );
}
