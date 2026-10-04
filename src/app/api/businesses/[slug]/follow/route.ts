import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/require-user";
import { getBusinessBySlug, followBusiness } from "@/lib/db";

// POST /api/businesses/:slug/follow — follow a business channel. Requires
// login. Idempotent: following one you already follow just confirms it
// (see followBusiness in db.ts).
export async function POST(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  const session = requireUser(req);
  if (!session) return NextResponse.json({ error: "Not logged in." }, { status: 401 });

  const business = getBusinessBySlug(params.slug);
  if (!business) return NextResponse.json({ error: "Business not found." }, { status: 404 });

  followBusiness(business.id, session.sub);
  return NextResponse.json({ following: true });
}
