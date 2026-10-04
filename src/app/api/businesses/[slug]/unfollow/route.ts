import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/require-user";
import { getBusinessBySlug, unfollowBusiness } from "@/lib/db";

// POST /api/businesses/:slug/unfollow — stop following a business channel.
export async function POST(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  const session = requireUser(req);
  if (!session) return NextResponse.json({ error: "Not logged in." }, { status: 401 });

  const business = getBusinessBySlug(params.slug);
  if (!business) return NextResponse.json({ error: "Business not found." }, { status: 404 });

  unfollowBusiness(business.id, session.sub);
  return NextResponse.json({ following: false });
}
