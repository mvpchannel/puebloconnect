import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/require-user";
import {
  getBopVotingPeriodById,
  getBopCategoryById,
  getBusinessById,
  castBopVote,
  getBopUserVote,
} from "@/lib/db";

// POST /api/best-of/periods/:periodId/vote — body: { categoryId, businessId }
// Cast or change your vote for a category in this period. Requires
// login; refused once the period is closed (changing your mind while
// voting is open is fine — see castBopVote's upsert in db.ts).
export async function POST(
  req: NextRequest,
  { params }: { params: { periodId: string } }
) {
  const session = requireUser(req);
  if (!session) return NextResponse.json({ error: "Not logged in." }, { status: 401 });

  const periodId = Number(params.periodId);
  if (!Number.isInteger(periodId)) {
    return NextResponse.json({ error: "Invalid period id." }, { status: 400 });
  }
  const period = getBopVotingPeriodById(periodId);
  if (!period) return NextResponse.json({ error: "Voting period not found." }, { status: 404 });
  if (!period.is_open) {
    return NextResponse.json({ error: "Voting is not open for this period." }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  const { categoryId, businessId } = (body ?? {}) as Record<string, unknown>;

  if (typeof categoryId !== "number" || !Number.isInteger(categoryId)) {
    return NextResponse.json({ error: "Invalid categoryId." }, { status: 400 });
  }
  if (!getBopCategoryById(categoryId)) {
    return NextResponse.json({ error: "Category not found." }, { status: 404 });
  }

  if (typeof businessId !== "number" || !Number.isInteger(businessId)) {
    return NextResponse.json({ error: "Invalid businessId." }, { status: 400 });
  }
  if (!getBusinessById(businessId)) {
    return NextResponse.json({ error: "Business not found." }, { status: 404 });
  }

  castBopVote(periodId, categoryId, session.sub, businessId);
  return NextResponse.json({ votedFor: getBopUserVote(periodId, categoryId, session.sub) });
}
