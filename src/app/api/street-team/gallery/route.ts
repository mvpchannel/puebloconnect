import { NextResponse } from "next/server";
import { listApprovedStreetTeamSubmissions, getStreetTeamBadgesForUser, streetTeamBadgeLabel } from "@/lib/db";

// GET /api/street-team/gallery — the public, approved-only Street Team
// gallery. No login required, same as the Events/Deals browse pages.
export async function GET() {
  const submissions = listApprovedStreetTeamSubmissions();

  return NextResponse.json({
    submissions: submissions.map((s) => ({
      id: s.id,
      mediaType: s.media_type,
      mediaUrl: s.media_url,
      caption: s.caption,
      locationText: s.location_text,
      createdAt: s.created_at,
      reviewedAt: s.reviewed_at,
      submitter: {
        id: s.submitter_id,
        username: s.submitter_username,
        name:
          [s.submitter_first_name, s.submitter_last_name].filter(Boolean).join(" ") ||
          s.submitter_username,
        badges: getStreetTeamBadgesForUser(s.submitter_id).map((b) => streetTeamBadgeLabel(b)),
      },
    })),
  });
}
