import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/require-admin";
import { listAllOpenStreamCommentReports } from "@/lib/db";

// GET /api/admin/stream-reports — every open (unresolved) stream comment
// report, across every stream, for the site-wide moderation dashboard.
// Resolving a report still goes through the existing per-stream route
// (POST /api/streams/:id/moderation/:reportId), which already accepts an
// admin as well as that stream's host — this route only needs to list.
export async function GET(req: NextRequest) {
  const admin = requireAdmin(req);
  if (!admin) {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }

  const reports = listAllOpenStreamCommentReports();
  return NextResponse.json({
    reports: reports.map((r) => ({
      id: r.id,
      streamId: r.stream_id,
      streamTitle: r.stream_title,
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
