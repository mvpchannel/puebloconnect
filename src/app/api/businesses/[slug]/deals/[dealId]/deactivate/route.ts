import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/require-user";
import { getBusinessBySlug, isBusinessOwner, getDealById, deactivateDeal } from "@/lib/db";

// POST /api/businesses/:slug/deals/:dealId/deactivate — end a deal early
// (e.g. a flash deal's stock ran out before its timer did). Owner only.
export async function POST(
  req: NextRequest,
  { params }: { params: { slug: string; dealId: string } }
) {
  const session = requireUser(req);
  if (!session) return NextResponse.json({ error: "Not logged in." }, { status: 401 });

  const business = getBusinessBySlug(params.slug);
  if (!business) return NextResponse.json({ error: "Business not found." }, { status: 404 });

  if (!isBusinessOwner(business.id, session.sub)) {
    return NextResponse.json({ error: "Only this channel's owner can end its deals." }, { status: 403 });
  }

  const dealId = Number(params.dealId);
  if (!Number.isInteger(dealId)) {
    return NextResponse.json({ error: "Invalid deal id." }, { status: 400 });
  }
  const deal = getDealById(dealId);
  if (!deal || deal.business_id !== business.id) {
    return NextResponse.json({ error: "Deal not found." }, { status: 404 });
  }

  deactivateDeal(dealId);
  return NextResponse.json({ ok: true });
}
