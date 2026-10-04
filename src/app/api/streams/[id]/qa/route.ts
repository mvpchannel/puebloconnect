import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/require-user";
import { getStreamById, submitQaQuestion, listQaQuestions } from "@/lib/db";

const MAX_QUESTION_LENGTH = 300;

function shapeQuestion(q: {
  id: number;
  author_id: number;
  author_username: string;
  author_first_name: string | null;
  author_last_name: string | null;
  author_profile_photo_path: string | null;
  body: string;
  status: string;
  created_at: string;
  vote_count: number;
  voted_by_viewer: 0 | 1;
}) {
  return {
    id: q.id,
    authorId: q.author_id,
    authorName: [q.author_first_name, q.author_last_name].filter(Boolean).join(" ") || q.author_username,
    authorProfilePhotoPath: q.author_profile_photo_path,
    body: q.body,
    status: q.status,
    createdAt: q.created_at,
    voteCount: q.vote_count,
    votedByViewer: Boolean(q.voted_by_viewer),
  };
}

// GET /api/streams/:id/qa — the question queue, open questions sorted
// by votes first, then answered/dismissed ones. Public to view, same
// as chat.
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const streamId = Number(params.id);
  if (!Number.isInteger(streamId) || streamId <= 0) {
    return NextResponse.json({ error: "Invalid stream id." }, { status: 400 });
  }
  if (!getStreamById(streamId, null)) {
    return NextResponse.json({ error: "Stream not found." }, { status: 404 });
  }
  const session = requireUser(req);
  const questions = listQaQuestions(streamId, session?.sub ?? null);
  return NextResponse.json({ questions: questions.map(shapeQuestion) });
}

// POST /api/streams/:id/qa — submit a question. Requires login.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = requireUser(req);
  if (!session) return NextResponse.json({ error: "Not logged in." }, { status: 401 });

  const streamId = Number(params.id);
  if (!Number.isInteger(streamId) || streamId <= 0) {
    return NextResponse.json({ error: "Invalid stream id." }, { status: 400 });
  }
  if (!getStreamById(streamId, session.sub)) {
    return NextResponse.json({ error: "Stream not found." }, { status: 404 });
  }

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  const { body } = (payload ?? {}) as Record<string, unknown>;
  if (typeof body !== "string" || body.trim().length === 0) {
    return NextResponse.json({ error: "A question is required." }, { status: 400 });
  }
  if (body.length > MAX_QUESTION_LENGTH) {
    return NextResponse.json({ error: `Questions must be ${MAX_QUESTION_LENGTH} characters or fewer.` }, { status: 400 });
  }

  try {
    const question = submitQaQuestion(streamId, session.sub, body.trim());
    return NextResponse.json({ question: shapeQuestion(question) }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Couldn't submit that." }, { status: 400 });
  }
}
