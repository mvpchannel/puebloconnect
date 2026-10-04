import { NextResponse } from "next/server";
import { getCurrentBoothQuestion, listBoothAnswersForQuestion, getUserBoothAnswer } from "@/lib/db";
import { getCurrentUser } from "@/lib/require-user";

// GET /api/booth — the current (or most recent) Pueblo Booth question,
// its answers, and the viewer's own answer if they have one. No login
// required to view, same as Events/Deals/Best of the Pueblo.
export async function GET() {
  const question = getCurrentBoothQuestion();
  if (!question) {
    return NextResponse.json({ question: null, answers: [], myAnswer: null });
  }

  const session = await getCurrentUser();
  const answers = listBoothAnswersForQuestion(question.id);
  const myAnswer = session ? getUserBoothAnswer(question.id, session.sub) : undefined;

  return NextResponse.json({
    question: {
      id: question.id,
      questionText: question.question_text,
      opensAt: question.opens_at,
      closesAt: question.closes_at,
      isOpen: Boolean(question.is_open),
      answerCount: question.answer_count,
    },
    answers: answers.map((a) => ({
      id: a.id,
      userId: a.user_id,
      answerType: a.answer_type,
      answerText: a.answer_text,
      mediaUrl: a.media_url,
      createdAt: a.created_at,
      name: [a.first_name, a.last_name].filter(Boolean).join(" ") || a.username,
      profilePhotoPath: a.profile_photo_path,
    })),
    myAnswer: myAnswer
      ? {
          answerType: myAnswer.answer_type,
          answerText: myAnswer.answer_text,
          mediaUrl: myAnswer.media_url,
          updatedAt: myAnswer.updated_at,
        }
      : null,
  });
}
