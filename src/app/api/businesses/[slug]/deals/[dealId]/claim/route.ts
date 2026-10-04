import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/require-user";
import { getBusinessBySlug, getDealById, claimDeal } from "@/lib/db";

// POST /api/businesses/:slug/deals/:dealId/claim — claim a deal. Requires
// login. A real, trackable claim (see claimDeal in db.ts) rather than a
// reusable code anyone could screenshot — refused once the deal is no
// longer active.
export async function POST(
  req: NextRequest,
  { params }: { params: { slug: string; dealId: string } }
) {
  const session = requireUser(req);
  if (!session) return NextResponse.json({ error: "Not logged in." }, { status: 401 });

  const business = getBusinessBySlug(params.slug);
  if (!business) return NextResponse.json({ error: "Business not found." }, { status: 404 });

  const dealId = Number(params.dealId);
  if (!Number.isInteger(dealId)) {
    return NextResponse.json({ error: "Invalid deal id." }, { status: 400 });
  }
  const deal = getDealById(dealId);
  if (!deal || deal.business_id !== business.id) {
    return NextResponse.json({ error: "Deal not found." }, { status: 404 });
  }
  if (!deal.is_active) {
    return NextResponse.json({ error: "This deal is no longer active." }, { status: 400 });
  }

  claimDeal(dealId, session.sub);
  return NextResponse.json({ claimed: true });
}
