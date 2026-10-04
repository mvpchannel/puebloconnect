import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/require-admin";
import { getBopVotingPeriodById, closeBopVotingPeriod } from "@/lib/db";

// POST /api/best-of/periods/:periodId/close — close voting and snapshot
// each category's leading business as its winner (see
// closeBopVotingPeriod in db.ts). Admin only; a period can only be
// closed once.
export async function POST(
  req: NextRequest,
  { params }: { params: { periodId: string } }
) {
  const admin = requireAdmin(req);
  if (!admin) return NextResponse.json({ error: "Admin access required." }, { status: 403 });

  const periodId = Number(params.periodId);
  if (!Number.isInteger(periodId)) {
    return NextResponse.json({ error: "Invalid period id." }, { status: 400 });
  }
  const period = getBopVotingPeriodById(periodId);
  if (!period) return NextResponse.json({ error: "Voting period not found." }, { status: 404 });
  if (period.closed_at) {
    return NextResponse.json({ error: "This voting period is already closed." }, { status: 400 });
  }

  const winners = closeBopVotingPeriod(periodId);
  return NextResponse.json({
    winners: winners.map((w) => ({
      categoryId: w.category_id,
      categoryName: w.category_name,
      businessId: w.business_id,
      businessName: w.business_name,
      businessSlug: w.business_slug,
      voteCount: w.vote_count,
    })),
  });
}
