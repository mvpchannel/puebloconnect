import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/require-user";
import { safeHttpUrl } from "@/lib/safe-url";
import { getBoothQuestionById, getCurrentBoothQuestion, submitBoothAnswer, BoothAnswerType } from "@/lib/db";

const MAX_TEXT_LENGTH = 1000;
const MAX_URL_LENGTH = 1000;
const VALID_TYPES: BoothAnswerType[] = ["text", "video", "audio"];

// POST /api/booth/answer — submit (or update) the logged-in member's
// answer to a Booth question. Only valid while that question is open —
// submitBoothAnswer itself trusts the caller to have checked this, so
// the check lives here.
export async function POST(req: NextRequest) {
  const session = requireUser(req);
  if (!session) return NextResponse.json({ error: "You must be logged in." }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  const { questionId, answerType, answerText, mediaUrl } = (body ?? {}) as Record<string, unknown>;

  const resolvedQuestionId =
    typeof questionId === "number" ? questionId : getCurrentBoothQuestion()?.id;
  if (!resolvedQuestionId) {
    return NextResponse.json({ error: "There's no Booth question to answer right now." }, { status: 404 });
  }

  const question = getBoothQuestionById(resolvedQuestionId);
  if (!question) return NextResponse.json({ error: "Question not found." }, { status: 404 });
  if (!question.is_open) {
    return NextResponse.json({ error: "This question is closed." }, { status: 409 });
  }

  if (typeof answerType !== "string" || !VALID_TYPES.includes(answerType as BoothAnswerType)) {
    return NextResponse.json({ error: "answerType must be 'text', 'video', or 'audio'." }, { status: 400 });
  }

  if (answerType === "text") {
    if (typeof answerText !== "string" || answerText.trim().length === 0) {
      return NextResponse.json({ error: "Your answer can't be empty." }, { status: 400 });
    }
    if (answerText.length > MAX_TEXT_LENGTH) {
      return NextResponse.json(
        { error: `Answers must be ${MAX_TEXT_LENGTH} characters or fewer.` },
        { status: 400 }
      );
    }
  } else {
    if (typeof mediaUrl !== "string" || mediaUrl.trim().length === 0) {
      return NextResponse.json({ error: "A link to your recording is required." }, { status: 400 });
    }
    if (mediaUrl.length > MAX_URL_LENGTH) {
      return NextResponse.json({ error: "That link is too long." }, { status: 400 });
    }
    if (!safeHttpUrl(mediaUrl)) {
      return NextResponse.json({ error: "Enter a full web link starting with https://." }, { status: 400 });
    }
  }

  const answer = submitBoothAnswer(
    resolvedQuestionId,
    session.sub,
    answerType as BoothAnswerType,
    answerType === "text" ? (answerText as string).trim() : null,
    answerType !== "text" ? (mediaUrl as string).trim() : null
  );

  return NextResponse.json({
    answer: {
      answerType: answer.answer_type,
      answerText: answer.answer_text,
      mediaUrl: answer.media_url,
      updatedAt: answer.updated_at,
    },
  });
}
