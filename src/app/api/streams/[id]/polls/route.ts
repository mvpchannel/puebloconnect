import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/require-user";
import { getStreamById, createStreamPoll, listStreamPollOptions } from "@/lib/db";

const MAX_QUESTION_LENGTH = 200;
const MAX_OPTION_LENGTH = 80;
const MIN_OPTIONS = 2;
const MAX_OPTIONS = 6;

// POST /api/streams/:id/polls — open a new poll, closing whatever poll
// was open before. Host or admin only. Body: { question, options: string[] }.
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = requireUser(req);
  if (!session) return NextResponse.json({ error: "Not logged in." }, { status: 401 });

  const streamId = Number(params.id);
  if (!Number.isInteger(streamId) || streamId <= 0) {
    return NextResponse.json({ error: "Invalid stream id." }, { status: 400 });
  }

  const stream = getStreamById(streamId, session.sub);
  if (!stream) return NextResponse.json({ error: "Stream not found." }, { status: 404 });
  const isHost = stream.host_id === session.sub;
  const isAdmin = session.role === "admin";
  if (!isHost && !isAdmin) {
    return NextResponse.json({ error: "Only the host or an admin can open a poll." }, { status: 403 });
  }

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  const { question, options } = (payload ?? {}) as Record<string, unknown>;

  if (typeof question !== "string" || question.trim().length === 0) {
    return NextResponse.json({ error: "A question is required." }, { status: 400 });
  }
  if (question.length > MAX_QUESTION_LENGTH) {
    return NextResponse.json({ error: `Questions must be ${MAX_QUESTION_LENGTH} characters or fewer.` }, { status: 400 });
  }
  if (!Array.isArray(options) || options.length < MIN_OPTIONS || options.length > MAX_OPTIONS) {
    return NextResponse.json(
      { error: `Provide between ${MIN_OPTIONS} and ${MAX_OPTIONS} options.` },
      { status: 400 }
    );
  }
  const cleanOptions: string[] = [];
  for (const o of options) {
    if (typeof o !== "string" || o.trim().length === 0) {
      return NextResponse.json({ error: "Every option needs text." }, { status: 400 });
    }
    if (o.length > MAX_OPTION_LENGTH) {
      return NextResponse.json({ error: `Options must be ${MAX_OPTION_LENGTH} characters or fewer.` }, { status: 400 });
    }
    cleanOptions.push(o.trim());
  }

  const poll = createStreamPoll(streamId, session.sub, question.trim(), cleanOptions);
  const createdOptions = listStreamPollOptions(poll.id);
  return NextResponse.json(
    {
      poll: { id: poll.id, question: poll.question },
      options: createdOptions.map((o) => ({ id: o.id, text: o.option_text, voteCount: o.vote_count })),
    },
    { status: 201 }
  );
}
