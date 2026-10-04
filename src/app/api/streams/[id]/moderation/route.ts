import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/require-user";
import { getStreamById, listOpenReportsForStream } from "@/lib/db";

// GET /api/streams/:id/moderation — this stream's open (unresolved)
// comment reports. Host or admin only.
export async function GET(
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
    return NextResponse.json({ error: "Only the host or an admin can view this." }, { status: 403 });
  }

  const reports = listOpenReportsForStream(streamId);
  return NextResponse.json({
    reports: reports.map((r) => ({
      id: r.id,
      commentId: r.comment_id,
      commentBody: r.comment_body,
      commentAuthorId: r.comment_author_id,
      commentAuthorUsername: r.comment_author_username,
      reporterId: r.reporter_id,
      reporterUsername: r.reporter_username,
      reason: r.reason,
      createdAt: r.created_at,
    })),
  });
}
