import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/require-user";
import { getStreamById, getStreamCommentById, softDeleteStreamComment } from "@/lib/db";

// DELETE /api/streams/:id/comments/:commentId — moderation delete. Only
// the stream's host or a site admin may remove a chat message (not the
// comment's own author via this route — that's a different, unwritten
// "delete my own comment" feature; this one is moderation specifically).
export async function DELETE(
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

  const stream = getStreamById(streamId, session.sub);
  if (!stream) return NextResponse.json({ error: "Stream not found." }, { status: 404 });

  const comment = getStreamCommentById(commentId);
  if (!comment || comment.stream_id !== streamId) {
    return NextResponse.json({ error: "Comment not found." }, { status: 404 });
  }

  const isHost = stream.host_id === session.sub;
  const isAdmin = session.role === "admin";
  if (!isHost && !isAdmin) {
    return NextResponse.json({ error: "Only the host or an admin can remove a comment." }, { status: 403 });
  }

  softDeleteStreamComment(commentId, session.sub);
  return NextResponse.json({ deleted: true });
}
