import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/require-admin";
import { listStreetTeamSubmissionsByStatus, StreetTeamStatus } from "@/lib/db";

const VALID_STATUSES: StreetTeamStatus[] = ["pending", "approved", "rejected"];

// GET /api/admin/street-team/submissions?status=pending — the admin
// review queue. Defaults to 'pending' (the actual queue); 'approved' /
// 'rejected' let the admin page show history too.
export async function GET(req: NextRequest) {
  const admin = requireAdmin(req);
  if (!admin) return NextResponse.json({ error: "Admin access required." }, { status: 403 });

  const statusParam = req.nextUrl.searchParams.get("status") ?? "pending";
  if (!VALID_STATUSES.includes(statusParam as StreetTeamStatus)) {
    return NextResponse.json({ error: "Invalid status filter." }, { status: 400 });
  }

  const submissions = listStreetTeamSubmissionsByStatus(statusParam as StreetTeamStatus, 200);

  return NextResponse.json({
    submissions: submissions.map((s) => ({
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
    })),
  });
}
