import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/require-admin";
import { getBoothQuestionById, closeBoothQuestion } from "@/lib/db";

// POST /api/admin/booth/questions/:id/close — manually close a question
// that was opened without a closes_at. A no-op if already closed — see
// closeBoothQuestion's own comment.
export async function POST(
  req: NextRequest,
  { params }: { params: { questionId: string } }
) {
  const admin = requireAdmin(req);
  if (!admin) return NextResponse.json({ error: "Admin access required." }, { status: 403 });

  const questionId = Number(params.questionId);
  if (!Number.isInteger(questionId)) {
    return NextResponse.json({ error: "Invalid question id." }, { status: 400 });
  }

  const question = getBoothQuestionById(questionId);
  if (!question) return NextResponse.json({ error: "Question not found." }, { status: 404 });

  closeBoothQuestion(questionId);
  const updated = getBoothQuestionById(questionId)!;

  return NextResponse.json({
    question: {
      id: updated.id,
      isOpen: Boolean(updated.is_open),
      closesAt: updated.closes_at,
    },
  });
}
