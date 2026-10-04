import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/require-user";
import { getBusinessBySlug, isBusinessOwner, deleteBusinessMenuItem } from "@/lib/db";

// DELETE /api/businesses/:slug/menu/:itemId — remove a menu/service item.
// Owner only.
export async function DELETE(
  req: NextRequest,
  { params }: { params: { slug: string; itemId: string } }
) {
  const session = requireUser(req);
  if (!session) return NextResponse.json({ error: "Not logged in." }, { status: 401 });

  const business = getBusinessBySlug(params.slug);
  if (!business) return NextResponse.json({ error: "Business not found." }, { status: 404 });

  if (!isBusinessOwner(business.id, session.sub)) {
    return NextResponse.json({ error: "Only this channel's owner can edit its menu." }, { status: 403 });
  }

  const itemId = Number(params.itemId);
  if (!Number.isInteger(itemId)) {
    return NextResponse.json({ error: "Invalid item id." }, { status: 400 });
  }

  deleteBusinessMenuItem(business.id, itemId);
  return NextResponse.json({ ok: true });
}
