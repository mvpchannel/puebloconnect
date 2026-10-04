import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/require-user";
import { listPassportStampsForUser, getPassportRewardsForUser } from "@/lib/db";

// GET /api/passport — the logged-in member's stamps and reward
// progress.
export async function GET(req: NextRequest) {
  const session = requireUser(req);
  if (!session) return NextResponse.json({ error: "You must be logged in." }, { status: 401 });

  const stamps = listPassportStampsForUser(session.sub);
  const rewards = getPassportRewardsForUser(session.sub);

  return NextResponse.json({
    stamps: stamps.map((s) => ({
      id: s.id,
      category: s.category,
      refId: s.ref_id,
      label: s.label,
      createdAt: s.created_at,
    })),
    rewards,
  });
}
