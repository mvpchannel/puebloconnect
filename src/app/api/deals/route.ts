import { NextResponse } from "next/server";
import { listActiveDeals, DealWithMeta } from "@/lib/db";

function shapeDeal(d: DealWithMeta) {
  return {
    id: d.id,
    businessId: d.business_id,
    businessName: d.business_name,
    businessSlug: d.business_slug,
    title: d.title,
    description: d.description,
    discountText: d.discount_text,
    type: d.type,
    startsAt: d.starts_at,
    expiresAt: d.expires_at,
    featured: Boolean(d.featured),
    claimCount: d.claim_count,
    createdAt: d.created_at,
  };
}

// GET /api/deals — every active deal site-wide, flash deals first
// (soonest-expiring first), then standard deals newest first.
export async function GET() {
  const deals = listActiveDeals();
  return NextResponse.json({ deals: deals.map(shapeDeal) });
}
