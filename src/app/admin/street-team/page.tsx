import type { Metadata } from "next";
import { listStreetTeamSubmissionsByStatus } from "@/lib/db";
import StreetTeamAdminPanel from "@/components/admin/StreetTeamAdminPanel";

export const metadata: Metadata = {
  title: "Street Team Review",
};

// Real admin feature — see src/lib/db.ts (street_team_submissions) and
// src/app/api/admin/street-team/*. Gated to admins by src/middleware.ts
// (ADMIN_ROUTES covers /admin/:path*) plus each route's own requireAdmin
// check.
export default function StreetTeamAdminPage() {
  const pending = listStreetTeamSubmissionsByStatus("pending", 200);

  return (
    <div className="row">
      <div className="col-md-12">
        <h2 style={{ marginBottom: 20 }}>Pueblo Street Team — Review Queue</h2>
        <p style={{ color: "#888", marginBottom: 20 }}>
          Approve or reject member-submitted photos and videos. Approved
          submissions appear in the public gallery at /street-team.
        </p>
        <StreetTeamAdminPanel
          initialPending={pending.map((s) => ({
            id: s.id,
            mediaType: s.media_type,
            mediaUrl: s.media_url,
            caption: s.caption,
            locationText: s.location_text,
            status: s.status,
            reviewNote: s.review_note,
            reviewedAt: s.reviewed_at,
            createdAt: s.created_at,
            submitter: {
              id: s.submitter_id,
              username: s.submitter_username,
              name:
                [s.submitter_first_name, s.submitter_last_name].filter(Boolean).join(" ") ||
                s.submitter_username,
            },
          }))}
        />
      </div>
    </div>
  );
}
