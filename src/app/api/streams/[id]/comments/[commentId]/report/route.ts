import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/require-user";
import { getStreamCommentById, reportStreamComment } from "@/lib/db";

const MAX_REASON_LENGTH = 500;

// POST /api/streams/:id/comments/:commentId/report — flag a chat message
// for the host/an admin to review. Body: { reason }.
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string; commentId: string } }
) {
  const session = requireUser(req);
  if (!session) return NextResponse.json({ error: "Not logged in." }, { status: 401 });

  const streamId = Number(params.id);
  const commentId = Number(params.commentId);
  if (!Number.isInteger(streamId) || streamId <= 0 || !Number.isInteger(commentId) || commentId <= 0) {
    return NextResponse.json({ error: "Invalid id." }, { status: 400 });
  }

  const comment = getStreamCommentById(commentId);
  if (!comment || comment.stream_id !== streamId) {
    return NextResponse.json({ error: "Comment not found." }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  const { reason } = (body ?? {}) as Record<string, unknown>;
  if (typeof reason !== "string" || reason.trim().length === 0) {
    return NextResponse.json({ error: "A reason is required." }, { status: 400 });
  }
  if (reason.length > MAX_REASON_LENGTH) {
    return NextResponse.json(
      { error: `Reason must be ${MAX_REASON_LENGTH} characters or fewer.` },
      { status: 400 }
    );
  }

  const report = reportStreamComment(commentId, session.sub, reason.trim());
  return NextResponse.json({ reportId: report.id }, { status: 201 });
}
