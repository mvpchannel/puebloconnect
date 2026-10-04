import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/require-user";
import { listStreetTeamSubmissionsByUser, getStreetTeamBadgesForUser, streetTeamBadgeLabel } from "@/lib/db";

// GET /api/street-team/submissions/mine — the logged-in member's own
// submissions (any status) plus their current contributor badges.
export async function GET(req: NextRequest) {
  const session = requireUser(req);
  if (!session) return NextResponse.json({ error: "You must be logged in." }, { status: 401 });

  const submissions = listStreetTeamSubmissionsByUser(session.sub);
  const badges = getStreetTeamBadgesForUser(session.sub);

  return NextResponse.json({
    submissions: submissions.map((s) => ({
      id: s.id,
      mediaType: s.media_type,
      mediaUrl: s.media_url,
      caption: s.caption,
      locationText: s.location_text,
      status: s.status,
      reviewNote: s.review_note,
      createdAt: s.created_at,
    })),
    badges: badges.map((b) => ({ key: b, label: streetTeamBadgeLabel(b) })),
  });
}
