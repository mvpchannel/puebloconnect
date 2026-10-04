import type { Metadata } from "next";
import { listAllOpenStreamCommentReports } from "@/lib/db";
import StreamReportsTable, { AdminStreamReport } from "./StreamReportsTable";

export const metadata: Metadata = {
  title: "Stream Moderation",
};

// Real admin feature, not a mockup — see src/lib/db.ts
// listAllOpenStreamCommentReports and src/app/api/admin/stream-reports.
// Gated to admins by src/middleware.ts (ADMIN_ROUTES covers /admin/:path*)
// plus the GET route's own requireAdmin check, same belt-and-suspenders
// pattern as the rest of /admin.
export default function StreamModerationPage() {
  const reports = listAllOpenStreamCommentReports();

  const shaped: AdminStreamReport[] = reports.map((r) => ({
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
  }));

  return (
    <div className="row">
      <div className="col-md-12">
        <h2 style={{ marginBottom: 20 }}>Stream Moderation</h2>
        <p style={{ color: "#888", marginBottom: 20 }}>
          Open comment reports across every live stream and VOD — resolve one here the same way
          its host could from the stream&apos;s own page.
        </p>
        <StreamReportsTable initialReports={shaped} />
      </div>
    </div>
  );
}
